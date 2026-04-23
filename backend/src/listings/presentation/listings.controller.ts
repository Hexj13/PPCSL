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
  Res,
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
import type { Request as ExpressRequest, Response } from 'express';

import { JwtAuthGuard } from '../../auth/infrastructure/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../auth/infrastructure/guards/optional-jwt-auth.guard';
import type { AuthenticatedRequest } from '../../common/express-augmentation';
import { CronSecretGuard } from '../../common/guards/cron-secret.guard';
import { buildVisitorHash } from '../../common/utils/visitor-identity.util';
import { ListingsService } from '../listings.service';

import { CreateListingDto } from './dto/create-listing.dto';
import { SearchListingsDto } from './dto/search-listings.dto';
import { SimilarListingsQueryDto } from './dto/similar-listings.dto';
import { TogglePromotionDto } from './dto/toggle-promotion.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

function normalizeReportLocale(locale?: string): 'ro' | 'ru' {
  return locale?.trim().toLowerCase() === 'ru' ? 'ru' : 'ro';
}

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
    @Query('search') search?: string,
  ) {
    const pageNum = page && Number.isFinite(parseInt(page, 10)) ? parseInt(page, 10) : 1;
    const limitNum = limit && Number.isFinite(parseInt(limit, 10)) ? parseInt(limit, 10) : 20;
    const validStatuses = ['Active', 'Paused', 'Closed'];
    const statusFilter = status && validStatuses.includes(status) ? status : undefined;
    const promotedFilter = promoted === 'true' ? true : promoted === 'false' ? false : undefined;
    const searchQuery = search?.trim();
    return this.listingsService.getUserListings(
      req.user.id,
      pageNum,
      limitNum,
      statusFilter,
      promotedFilter,
      searchQuery && searchQuery.length > 0 ? searchQuery : undefined,
    );
  }

  @ApiOperation({ summary: 'Get active listings by user' })
  @ApiParam({
    name: 'userId',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User UUID',
  })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiResponse({ status: 200, description: 'List of active listings (paginated)' })
  @Get('user/:userId/active')
  getUserActiveListings(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page && Number.isFinite(parseInt(page, 10)) ? parseInt(page, 10) : 1;
    const limitNum = limit && Number.isFinite(parseInt(limit, 10)) ? parseInt(limit, 10) : 20;
    return this.listingsService.getActiveUserListings(userId, pageNum, limitNum);
  }

  @ApiOperation({ summary: 'Get active listings count by user' })
  @ApiParam({
    name: 'userId',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Count of active listings',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: { count: { type: 'number' } },
        },
      },
    },
  })
  @Get('user/:userId/active/count')
  async getUserActiveListingsCount(@Param('userId') userId: string): Promise<{ count: number }> {
    const count = await this.listingsService.getActiveUserListingsCount(userId);
    return { count };
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
    return this.listingsService.getPromotionAccessStatus(req.user?.id, req.user?.type);
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

  @ApiOperation({ summary: 'Get full VIN for listing (authenticated)' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'Listing UUID' })
  @ApiQuery({ name: 'action', required: false, description: 'reveal or copy' })
  @ApiResponse({ status: 200, description: 'Full VIN' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Listing not found or no VIN' })
  @ApiResponse({
    status: 429,
    description: 'Too many VIN reveal requests (max 20 unique listings per hour).',
  })
  @UseGuards(JwtAuthGuard)
  @Get(':id/vin')
  async getListingVin(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
    @Query('action') action?: string,
  ) {
    return this.listingsService.getListingVin(id, req.user.id, action || 'unknown');
  }

  @ApiOperation({ summary: 'Get full seller phone numbers for listing' })
  @ApiParam({ name: 'id', description: 'Listing UUID' })
  @ApiResponse({ status: 200, description: 'Phone numbers' })
  @ApiResponse({ status: 404, description: 'Listing not found or no phones' })
  @ApiResponse({
    status: 429,
    description:
      'Too many phone reveal requests: max 5 unique listings/hour (anonymous), max 20/hour (authenticated). Listing owner and Admin bypass.',
  })
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/phones')
  async getListingPhones(@Param('id', ParseUUIDPipe) id: string, @Request() req: ExpressRequest) {
    const userId = req.user?.id ?? null;
    const visitorHash = userId ? null : buildVisitorHash(req);
    return this.listingsService.getListingPhones(id, {
      userId,
      visitorHash,
      isAdmin: req.user?.type === 'Admin',
    });
  }

  @ApiOperation({ summary: 'Get listing history by VIN' })
  @ApiParam({ name: 'id', description: 'Listing UUID' })
  @ApiResponse({ status: 200, description: 'Previous listings with same VIN' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  @Get(':id/history')
  async getListingHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.listingsService.getListingHistory(id);
  }

  @ApiOperation({ summary: 'Get report URL with signed VIN' })
  @ApiParam({ name: 'id', description: 'Listing UUID' })
  @ApiQuery({
    name: 'locale',
    required: false,
    description: 'Locale for report provider (ro | ru)',
  })
  @ApiResponse({ status: 200, description: 'Report URL' })
  @ApiResponse({ status: 404, description: 'Listing not found or no VIN' })
  @Get(':id/report-url')
  async getReportUrl(@Param('id', ParseUUIDPipe) id: string, @Query('locale') locale?: string) {
    return this.listingsService.getReportUrl(id, normalizeReportLocale(locale));
  }

  @ApiOperation({ summary: 'Redirect to report provider (for direct link, iOS Safari)' })
  @ApiParam({ name: 'id', description: 'Listing UUID' })
  @ApiQuery({
    name: 'locale',
    required: false,
    description: 'Locale for report provider (ro | ru)',
  })
  @ApiResponse({ status: 302, description: 'Redirect to report provider' })
  @Get(':id/report-redirect')
  async getReportRedirect(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
    @Query('locale') locale?: string,
  ) {
    const normalizedLocale = normalizeReportLocale(locale);
    const fallbackUrl = this.listingsService.getReportFallbackUrl(normalizedLocale);
    try {
      const { url } = await this.listingsService.getReportUrl(id, normalizedLocale);
      res.redirect(302, url);
    } catch {
      res.redirect(302, fallbackUrl);
    }
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
  @ApiQuery({
    name: 'includeFullVin',
    required: false,
    description: 'Return full VIN for listing owner only',
  })
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: ExpressRequest,
    @Query('includeFullVin') includeFullVin?: string,
  ) {
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
        includeFullVin: includeFullVin === '1' || includeFullVin === 'true',
        isAdmin: req.user?.type === 'Admin',
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
    return this.listingsService.update(id, updateListingDto, req.user.id, req.user.type);
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
  @Throttle({ default: { limit: 5, ttl: 60000 } })
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

  @ApiOperation({ summary: 'Expire promotions (cron job endpoint)' })
  @ApiResponse({ status: 200, description: 'Expired promotions processed' })
  @ApiResponse({ status: 403, description: 'Forbidden - Invalid secret key' })
  @Post('cron/expire-promotions')
  @UseGuards(CronSecretGuard)
  async expirePromotions() {
    const result = await this.listingsService.expirePromotions();
    return { message: 'Expired promotions processed', result };
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
