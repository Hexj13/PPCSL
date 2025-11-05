import {
  Body,
  Controller,
  Get,
  Param,
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

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CreateListingDto } from './dto/create-listing.dto';
import { SearchListingsDto } from './dto/search-listings.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingsService } from './listings.service';

@ApiTags('listings')
@Controller('api/listings')
export class ListingsController {
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
          type: 'array',
          items: { type: 'object' },
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
  getMyListings(@Request() req) {
    return this.listingsService.getUserListings(req.user.id);
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

  @ApiOperation({ summary: 'Get listing details' })
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Listing UUID',
  })
  @ApiResponse({ status: 200, description: 'Listing details' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const listing = await this.listingsService.findOne(id);

    const userId = req.user?.id || null;
    let visitorId: string | null = null;

    if (!userId) {
      const ip =
        req.ip ||
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        'unknown';
      const userAgent = (req.headers['user-agent'] as string) || 'unknown';
      visitorId = this.listingsService.generateVisitorId(ip, userAgent);
    }

    this.listingsService.recordView(id, userId, visitorId).catch(() => {});

    return listing;
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
  create(@Body() createListingDto: CreateListingDto, @Request() req) {
    return this.listingsService.create(createListingDto, req.user.id);
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
  update(@Param('id') id: string, @Body() updateListingDto: UpdateListingDto, @Request() req) {
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
  publish(@Param('id') id: string, @Request() req) {
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
  pause(@Param('id') id: string, @Request() req) {
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
  close(@Param('id') id: string, @Request() req) {
    return this.listingsService.close(id, req.user.id);
  }

  @ApiOperation({ summary: 'Refresh listing dates' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 200, description: 'Dates refreshed successfully' })
  @ApiResponse({ status: 400, description: 'Must wait 48 hours' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('refresh-dates')
  @UseGuards(JwtAuthGuard)
  refreshDates(@Request() req) {
    return this.listingsService.refreshAllDates(req.user.id);
  }
}
