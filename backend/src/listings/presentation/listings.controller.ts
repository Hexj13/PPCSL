import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request as ExpressRequest } from 'express';

import { JwtAuthGuard } from '../../auth/infrastructure/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../auth/infrastructure/guards/optional-jwt-auth.guard';
import type { AuthenticatedRequest } from '../../common/express-augmentation';
import { CronSecretGuard } from '../../common/guards/cron-secret.guard';
import { ListingsService } from '../listings.service';

import { CreateListingDto } from './dto/create-listing.dto';
import { SearchListingsDto } from './dto/search-listings.dto';
import { SimilarListingsQueryDto } from './dto/similar-listings.dto';
import { TogglePromotionDto } from './dto/toggle-promotion.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

@ApiTags('listings')
@Controller('api/listings')
export class ListingsController {
  private readonly logger = new Logger(ListingsController.name);

  constructor(private readonly listingsService: ListingsService) {}

  @ApiOperation({ summary: 'Search listings' })
  @ApiResponse({
    status: 200,
    description: 'List of listings',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { type: 'object' },
            },
            meta: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                page: { type: 'number' },
                limit: { type: 'number' },
                totalPages: { type: 'number' },
              },
            },
          },
        },
      },
    },
  })
  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'production' ? 200 : 10000,
      ttl: 60000,
    },
  })
  @Get()
  findAll(@Query() searchDto: SearchListingsDto) {
    return this.listingsService.findAll(searchDto);
  }

  @ApiOperation({ summary: 'Get current user listings' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'List of user listings',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { type: 'object' },
            },
            meta: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                page: { type: 'number' },
                limit: { type: 'number' },
                totalPages: { type: 'number' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 401 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyListings(
    @Request() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('promoted') promoted?: string,
  ) {
    const pageNum = page && Number.isFinite(parseInt(page, 10)) ? parseInt(page, 10) : 1;
    const limitNum = limit && Number.isFinite(parseInt(limit, 10)) ? parseInt(limit, 10) : 20;
    const validStatuses = ['Active', 'Paused', 'Closed'];
    const statusFilter = status && validStatuses.includes(status) ? status : undefined;
    const promotedFilter = promoted === 'true' ? true : promoted === 'false' ? false : undefined;
    return this.listingsService.getUserListings(
      req.user.id,
      pageNum,
      limitNum,
      statusFilter,
      promotedFilter,
    );
  }

  @ApiOperation({ summary: 'Get active listings by user' })
  @ApiParam({
    name: 'userId',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User UUID',
  })
  @ApiResponse({ status: 200, description: 'List of active listings' })
  @Get('user/:userId/active')
  getUserActiveListings(@Param('userId') userId: string) {
    return this.listingsService.getActiveUserListings(userId);
  }

  @ApiOperation({ summary: 'Search listings by VIN' })
  @ApiParam({
    name: 'vin',
    example: 'WBA3A5G59CNP12345',
    description: 'Vehicle Identification Number',
  })
  @ApiQuery({
    name: 'excludeId',
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Listing ID to exclude from results',
  })
  @ApiResponse({ status: 200, description: 'List of listings with given VIN' })
  @Get('vin/:vin')
  findByVin(@Param('vin') vin: string, @Query('excludeId') excludeId?: string) {
    return this.listingsService.findByVin(vin, excludeId);
  }

  @Get('promotion-history')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get promotion history for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Promotion history retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - authentication required' })
  getPromotionHistory(
    @Request() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const pageNum = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
    const limitNum = Number.isFinite(parsedLimit) ? Math.min(100, Math.max(1, parsedLimit)) : 50;
    return this.listingsService.getPromotionHistory(req.user.id, pageNum, limitNum);
  }

  @Get('promotion-history/check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Check if user has promotion history' })
  @ApiResponse({ status: 200, description: 'Check result' })
  @ApiResponse({ status: 401, description: 'Unauthorized - authentication required' })
  async checkPromotionHistory(@Request() req: AuthenticatedRequest) {
    const hasHistory = await this.listingsService.hasPromotionHistory(req.user.id);
    return { hasHistory };
  }

  @Get('promotion-access')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get promotion access status' })
  @ApiResponse({
    status: 200,
    description: 'Promotion access status',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            access: { type: 'string', enum: ['disabled', 'admin', 'all'] },
            enabled: { type: 'boolean' },
            isAdmin: { type: 'boolean' },
            canPromote: { type: 'boolean' },
          },
        },
      },
    },
  })
  getPromotionAccess(@Request() req: ExpressRequest) {
    return this.listingsService.getPromotionAccessStatus(req.user?.type);
  }

  @ApiOperation({ summary: 'Get similar listings' })
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Listing UUID',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of listings to return (1-8)',
    example: 4,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Offset for pagination',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'List of similar listings',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: { type: 'object' },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  @Get(':id/similar')
  async findSimilar(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: SimilarListingsQueryDto,
  ) {
    return this.listingsService.findSimilar(id, query.limit, query.offset);
  }

  @ApiOperation({ summary: 'Get listing details' })
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Listing UUID',
  })
  @ApiResponse({ status: 200, description: 'Listing details' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: ExpressRequest) {
    try {
      const ip =
        req.ip ||
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        'unknown';
      return this.listingsService.findOne(id, {
        userId: req.user?.id ?? null,
        ip,
        userAgent: (req.headers['user-agent'] as string) || 'unknown',
      });
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        if (error instanceof Error) {
          this.logger.error('Error in findOne controller:', error.message, error.stack);
        } else {
          this.logger.error('Error in findOne controller:', error);
        }
      }
      throw error;
    }
  }

  @ApiOperation({ summary: 'Create a new listing' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 201,
    description: 'Listing created successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            price: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid data',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 400 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 401 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createListingDto: CreateListingDto, @Request() req: AuthenticatedRequest) {
    return this.listingsService.create(createListingDto, req.user.id, req.user.type);
  }

  @ApiOperation({ summary: 'Update listing' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Listing UUID',
  })
  @ApiResponse({ status: 200, description: 'Listing updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateListingDto: UpdateListingDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.listingsService.update(id, updateListingDto, req.user.id);
  }

  @ApiOperation({ summary: 'Publish listing' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Listing UUID',
  })
  @ApiResponse({ status: 200, description: 'Listing published successfully' })
  @ApiResponse({ status: 400, description: 'Active listings limit reached' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  publish(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.listingsService.publish(id, req.user.id);
  }

  @ApiOperation({ summary: 'Pause listing' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Listing UUID',
  })
  @ApiResponse({ status: 200, description: 'Listing paused successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post(':id/pause')
  @UseGuards(JwtAuthGuard)
  pause(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.listingsService.pause(id, req.user.id);
  }

  @ApiOperation({ summary: 'Close listing' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Listing UUID',
  })
  @ApiResponse({ status: 200, description: 'Listing closed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post(':id/close')
  @UseGuards(JwtAuthGuard)
  close(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.listingsService.close(id, req.user.id);
  }

  @ApiOperation({ summary: 'Refresh listing dates' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 200, description: 'Dates refreshed successfully' })
  @ApiResponse({ status: 400, description: 'Must wait 48 hours' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('refresh-dates')
  @UseGuards(JwtAuthGuard)
  refreshDates(@Request() req: AuthenticatedRequest) {
    return this.listingsService.refreshAllDates(req.user.id);
  }

  @ApiOperation({ summary: 'Close old listings (cron job endpoint)' })
  @ApiResponse({ status: 200, description: 'Old listings closed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Invalid secret key' })
  @Post('cron/close-old')
  @UseGuards(CronSecretGuard)
  async closeOldListings() {
    const result = await this.listingsService.autoCloseOldListings();
    return { message: 'Old listings closed successfully', result };
  }

  @Patch(':id/promote')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle listing promotion (user)' })
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Listing UUID',
  })
  @ApiResponse({ status: 200, description: 'Promotion toggled successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - authentication required' })
  @ApiResponse({ status: 403, description: 'Forbidden - promotion feature is disabled' })
  async togglePromotion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TogglePromotionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.listingsService.togglePromotion(id, req.user.id, dto, req.user?.type);
  }
}
