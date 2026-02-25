import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AdminGuard } from '../auth/infrastructure/guards/admin.guard';
import { JwtAuthGuard } from '../auth/infrastructure/guards/jwt-auth.guard';
import { ListingStatus } from '../common/types';
import { TogglePromotionDto } from '../listings/presentation/dto/toggle-promotion.dto';

import { AdminService } from './admin.service';
import { DeleteAllBrandsService } from './delete-all-brands.service';

@ApiTags('admin')
@ApiBearerAuth('JWT-auth')
@Controller('api/admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly deleteAllBrandsService: DeleteAllBrandsService,
  ) {}

  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'List of users',
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
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 403 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @Get('users')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by ID, email, phone, name, or company',
  })
  @ApiQuery({
    name: 'userType',
    required: false,
    type: String,
    description: 'Filter by user type',
  })
  getAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('userType') userType?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 20;
    return this.adminService.getAllUsers(pageNum, limitNum, search, userType);
  }

  @ApiOperation({ summary: 'Delete all brands (cascade: models, vehicles, listings, favorites)' })
  @ApiResponse({ status: 200, description: 'All brands deleted successfully' })
  @Delete('brands/all')
  deleteAllBrands() {
    return this.deleteAllBrandsService.execute();
  }

  @ApiOperation({ summary: 'Get all listings' })
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
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 403 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @Get('listings')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'listingId',
    required: false,
    type: String,
    description: 'Search by listing ID',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'Search by user ID',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by listing ID or user ID (single field, OR match)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ListingStatus,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'isPromoted',
    required: false,
    type: Boolean,
    description: 'Filter by promotion status',
  })
  getAllListings(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('listingId') listingId?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: ListingStatus,
    @Query('isPromoted') isPromoted?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 20;
    const isPromotedBool =
      isPromoted === 'true' ? true : isPromoted === 'false' ? false : undefined;
    return this.adminService.getAllListings(
      pageNum,
      limitNum,
      listingId,
      userId,
      status,
      isPromotedBool,
      search,
    );
  }

  @Get('listings/status-counts')
  @ApiOperation({ summary: 'Get listings status counts' })
  @ApiResponse({
    status: 200,
    description: 'Status counts',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            Active: { type: 'number' },
            Paused: { type: 'number' },
            Closed: { type: 'number' },
            Promoted: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiQuery({
    name: 'listingId',
    required: false,
    type: String,
    description: 'Filter by listing ID',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'Filter by user ID',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by listing ID or user ID (single field, OR match)',
  })
  getListingsStatusCounts(
    @Query('listingId') listingId?: string,
    @Query('userId') userId?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getListingsStatusCounts(listingId, userId, search);
  }

  @ApiOperation({ summary: 'Get statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics for users and listings',
    content: {
      'application/json': {
        schema: {
          type: 'object',
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
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 403 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @Get('stats')
  getStats() {
    return Promise.all([
      this.adminService.getUserStats(),
      this.adminService.getListingStats(),
    ]).then(([users, listings]) => ({ users, listings }));
  }

  @ApiOperation({ summary: 'Update listing status' })
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Listing UUID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['Active', 'Paused', 'Closed'],
          example: 'Active',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Listing status updated successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status',
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
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 403 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @Patch('listings/:id/status')
  updateListingStatus(@Param('id') id: string, @Body('status') status: ListingStatus) {
    return this.adminService.updateListingStatus(id, status);
  }

  @ApiOperation({ summary: 'Get user listings' })
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User UUID',
  })
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
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 403 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @Get('users/:id/listings')
  getUserListings(@Param('id') id: string) {
    return this.adminService.getUserListings(id);
  }

  @ApiOperation({ summary: 'Toggle user status' })
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'User status toggled successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
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
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 403 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @Patch('users/:id/toggle-status')
  toggleUserStatus(@Param('id') id: string) {
    return this.adminService.toggleUserStatus(id);
  }

  @Patch('listings/:id/promote')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Toggle listing promotion' })
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Listing UUID',
  })
  @ApiResponse({ status: 200, description: 'Promotion toggled successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - authentication required' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 429, description: 'Too Many Requests - rate limit exceeded' })
  togglePromotion(@Param('id', ParseUUIDPipe) id: string, @Body() dto: TogglePromotionDto) {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const promotionAccess = process.env.PROMOTION_ACCESS || 'disabled';

    const shouldSkipChecks = isDevelopment;
    if (!shouldSkipChecks) {
      if (promotionAccess === 'disabled') {
        throw new ForbiddenException('errors.promotionDisabled');
      }
    }

    return this.adminService.toggleListingPromotion(id, dto.is_promoted, dto.days);
  }

  @Get('promotions')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Get all promotions (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'listingId',
    required: false,
    type: String,
    description: 'Search by listing ID',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'Search by user ID',
  })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    type: String,
    description: 'Filter from date (ISO string)',
  })
  @ApiResponse({ status: 200, description: 'Promotions retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - authentication required' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 429, description: 'Too Many Requests - rate limit exceeded' })
  getAllPromotions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('listingId') listingId?: string,
    @Query('userId') userId?: string,
    @Query('fromDate') fromDate?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 50;
    const fromDateObj = fromDate ? new Date(fromDate) : undefined;
    return this.adminService.getAllPromotions(pageNum, limitNum, listingId, userId, fromDateObj);
  }
}
