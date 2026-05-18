import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { JwtAuthGuard } from '../../auth/infrastructure/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../common/express-augmentation';
import { ParseListingIdPipe } from '../presentation/pipes/parse-listing-id.pipe';

import {
  StagedVideoStatusDto,
  StagedVideoUploadCompleteDto,
  VideoUploadCompleteDto,
} from './dto/video-upload-complete.dto';
import { VideoUploadInitDto } from './dto/video-upload-init.dto';
import { ListingVideoService } from './listing-video.service';

const isProduction = process.env.NODE_ENV === 'production';
const videoInitThrottle = {
  default: { limit: isProduction ? 5 : 500, ttl: 60000 },
};

@ApiTags('listings')
@Controller('api/listings')
export class ListingVideoController {
  constructor(private readonly listingVideoService: ListingVideoService) {}

  @ApiOperation({ summary: 'Listing video upload limits and allowed types' })
  @ApiBearerAuth('JWT-auth')
  @Get('video/constraints')
  @UseGuards(JwtAuthGuard)
  getVideoConstraints() {
    return this.listingVideoService.getListingVideoConstraints();
  }

  @ApiOperation({ summary: 'Initialize multipart video upload for listing' })
  @ApiBearerAuth('JWT-auth')
  @Throttle(videoInitThrottle)
  @Post('video/staged-upload-init')
  @UseGuards(JwtAuthGuard)
  async initStagedUpload(@Body() dto: VideoUploadInitDto, @Request() req: AuthenticatedRequest) {
    return this.listingVideoService.initStagedUpload(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Complete staged multipart video upload and start transcoding' })
  @ApiBearerAuth('JWT-auth')
  @Post('video/staged-upload-complete')
  @UseGuards(JwtAuthGuard)
  async completeStagedUpload(
    @Body() dto: StagedVideoUploadCompleteDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.listingVideoService.completeStagedUpload(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Get staged listing video processing status' })
  @ApiBearerAuth('JWT-auth')
  @Post('video/staged-status')
  @UseGuards(JwtAuthGuard)
  async getStagedVideoStatus(
    @Body() dto: StagedVideoStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.listingVideoService.getStagedVideoStatus(req.user.id, dto.stagedVideoToken);
  }

  @ApiOperation({ summary: 'Initialize multipart video upload for listing' })
  @ApiBearerAuth('JWT-auth')
  @Throttle(videoInitThrottle)
  @Post(':id/video/upload-init')
  @UseGuards(JwtAuthGuard)
  async initUpload(
    @Param('id', ParseListingIdPipe) listingId: string,
    @Body() dto: VideoUploadInitDto,
    @Request() req: AuthenticatedRequest,
    @Headers('x-import-secret') importSecret: string | string[] | undefined,
  ) {
    return this.listingVideoService.initUpload(
      listingId,
      req.user.id,
      req.user.type,
      dto,
      importSecret,
    );
  }

  @ApiOperation({ summary: 'Complete multipart video upload and start transcoding' })
  @ApiBearerAuth('JWT-auth')
  @Post(':id/video/upload-complete')
  @UseGuards(JwtAuthGuard)
  async completeUpload(
    @Param('id', ParseListingIdPipe) listingId: string,
    @Body() dto: VideoUploadCompleteDto,
    @Request() req: AuthenticatedRequest,
    @Headers('x-import-secret') importSecret: string | string[] | undefined,
  ) {
    return this.listingVideoService.completeUpload(
      listingId,
      req.user.id,
      req.user.type,
      dto,
      importSecret,
    );
  }

  @ApiOperation({ summary: 'Remove listing video' })
  @ApiBearerAuth('JWT-auth')
  @Delete(':id/video')
  @UseGuards(JwtAuthGuard)
  async deleteVideo(
    @Param('id', ParseListingIdPipe) listingId: string,
    @Request() req: AuthenticatedRequest,
    @Headers('x-import-secret') importSecret: string | string[] | undefined,
  ) {
    await this.listingVideoService.deleteVideo(listingId, req.user.id, req.user.type, importSecret);
    return { success: true };
  }
}
