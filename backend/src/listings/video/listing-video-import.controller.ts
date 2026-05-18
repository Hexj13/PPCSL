import { Body, Controller, Headers, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/infrastructure/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../common/express-augmentation';

import { VideoImportFromUrlDto } from './dto/video-import-from-url.dto';
import { ListingVideoService } from './listing-video.service';

@ApiTags('upload')
@Controller('api/upload')
export class ListingVideoImportController {
  constructor(private readonly listingVideoService: ListingVideoService) {}

  @ApiOperation({ summary: 'Import listing video from URL (partner tools)' })
  @ApiBearerAuth('JWT-auth')
  @Post('video/from-url')
  @UseGuards(JwtAuthGuard)
  async importFromUrl(
    @Body() dto: VideoImportFromUrlDto,
    @Request() req: AuthenticatedRequest,
    @Headers('x-import-secret') importSecret: string | string[] | undefined,
  ) {
    return this.listingVideoService.importVideoFromUrl({
      listingId: dto.listingId,
      userId: req.user.id,
      userType: req.user.type,
      videoUrl: dto.videoUrl,
      importSecretHeader: importSecret,
    });
  }
}
