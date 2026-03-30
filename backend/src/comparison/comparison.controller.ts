import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/infrastructure/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/express-augmentation';

import { ComparisonService } from './comparison.service';
import { ComparisonSyncDto } from './dto/comparison-sync.dto';

@ApiTags('comparison')
@Controller('api/comparison')
export class ComparisonController {
  constructor(private readonly comparisonService: ComparisonService) {}

  @Get('ids')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get comparison listing IDs grouped by category' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle and tire comparison listing IDs',
    schema: {
      type: 'object',
      properties: {
        vehicleListingIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
        tireListingIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getIds(@Request() req: AuthenticatedRequest) {
    return this.comparisonService.getListingIdsGrouped(req.user.id);
  }

  @Post('sync')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Merge guest comparison IDs with saved comparison' })
  @ApiBody({ type: ComparisonSyncDto })
  @ApiResponse({
    status: 200,
    description: 'Merged comparison IDs',
    schema: {
      type: 'object',
      properties: {
        vehicleListingIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
        tireListingIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
      },
    },
  })
  async sync(@Request() req: AuthenticatedRequest, @Body() dto: ComparisonSyncDto) {
    return this.comparisonService.sync(
      req.user.id,
      dto.vehicleListingIds ?? [],
      dto.tireListingIds ?? [],
    );
  }

  @Post(':listingId')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add listing to comparison' })
  @ApiParam({ name: 'listingId', format: 'uuid' })
  @ApiResponse({
    status: 201,
    description: 'Listing added to comparison',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        user_id: { type: 'string', format: 'uuid' },
        listing_id: { type: 'string', format: 'uuid' },
        created_at: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  add(
    @Param('listingId', new ParseUUIDPipe({ version: '4' })) listingId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.comparisonService.add(req.user.id, listingId);
  }

  @Delete(':listingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Remove listing from comparison' })
  @ApiParam({ name: 'listingId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Listing removed from comparison' })
  async remove(
    @Param('listingId', new ParseUUIDPipe({ version: '4' })) listingId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.comparisonService.remove(req.user.id, listingId);
  }
}
