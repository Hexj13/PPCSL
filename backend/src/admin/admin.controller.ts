import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
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
import { Request } from 'express';

import { AdminGuard } from '../auth/infrastructure/guards/admin.guard';
import { JwtAuthGuard } from '../auth/infrastructure/guards/jwt-auth.guard';
import * as constants from '../common/constants';
import { ListingStatus, TireVehicleType } from '../common/types';
import { TogglePromotionDto } from '../listings/presentation/dto/toggle-promotion.dto';

import { AdminBrandsModelsService } from './admin-brands-models.service';
import { AdminTireBrandsModelsService } from './admin-tire-brands-models.service';
import { AdminService } from './admin.service';
import { DeleteAllBrandsService } from './delete-all-brands.service';
import { AdminUpdateUserProfileDto } from './dto/admin-update-user-profile.dto';
import { CreateBrandDto } from './dto/create-brand.dto';
import { CreateModelDto } from './dto/create-model.dto';
import { CreateTireBrandDto } from './dto/create-tire-brand.dto';
import { CreateTireModelDto } from './dto/create-tire-model.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { UpdateModelDto } from './dto/update-model.dto';
import { UpdateTireBrandDto } from './dto/update-tire-brand.dto';
import { UpdateTireModelDto } from './dto/update-tire-model.dto';
import { UpdateUserPartnerSettingsDto } from './dto/update-user-partner-settings.dto';

const parsePositiveIntQuery = (
  value: string | undefined,
  defaultValue: number,
  maxValue: number,
): number => {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }
  return Math.min(maxValue, Math.max(1, parsed));
};

@ApiTags('admin')
@ApiBearerAuth('JWT-auth')
@Controller('api/admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly deleteAllBrandsService: DeleteAllBrandsService,
    private readonly adminBrandsModelsService: AdminBrandsModelsService,
    private readonly adminTireBrandsModelsService: AdminTireBrandsModelsService,
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

  @Get('validate-assign-user/:userId')
  @ApiOperation({ summary: 'Validate user for listing assignment' })
  @ApiParam({ name: 'userId', description: 'Target user UUID' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  validateAssignUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.adminService.validateAssignUser(userId);
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

  @Patch('users/:id/partner-settings')
  @ApiOperation({ summary: 'Update user partner settings' })
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'User partner settings updated successfully',
  })
  updateUserPartnerSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserPartnerSettingsDto,
    @Req() req: Request,
  ) {
    const user = req.user as { id: string };
    return this.adminService.updateUserPartnerSettings(id, dto, user.id);
  }

  @Patch('users/:id/profile')
  @ApiOperation({ summary: 'Update user profile fields (admin)' })
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
  })
  updateUserProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateUserProfileDto,
    @Req() req: Request,
  ) {
    const user = req.user as { id: string };
    return this.adminService.updateUserProfile(id, dto, user.id);
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

  @Get('brands-models')
  @ApiOperation({ summary: 'Get brands and models (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'query', required: false, type: String })
  @ApiQuery({ name: 'vehicleType', required: false, enum: ['car', 'truck', 'moto', 'tire'] })
  getBrandsModels(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('query') query?: string,
    @Query('vehicleType') vehicleType?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.min(2000, Math.max(1, parseInt(limit, 10))) : 100;
    const type =
      vehicleType === 'car' ||
      vehicleType === 'truck' ||
      vehicleType === 'moto' ||
      vehicleType === 'tire'
        ? vehicleType
        : undefined;
    return this.adminBrandsModelsService.getBrandsModels(pageNum, limitNum, query, type);
  }

  @Post('brands')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Create brand' })
  createBrand(@Body() dto: CreateBrandDto, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.adminBrandsModelsService.createBrand(dto, {
      actorUserId: user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Patch('brands/:id')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Update brand' })
  updateBrand(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBrandDto,
    @Req() req: Request,
  ) {
    const user = req.user as { id: string };
    return this.adminBrandsModelsService.updateBrand(id, dto, {
      actorUserId: user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('models')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Create model' })
  createModel(@Body() dto: CreateModelDto, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.adminBrandsModelsService.createModel(dto, {
      actorUserId: user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Patch('models/:id')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Update model' })
  updateModel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateModelDto,
    @Req() req: Request,
  ) {
    const user = req.user as { id: string };
    return this.adminBrandsModelsService.updateModel(id, dto, {
      actorUserId: user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Patch('brands/:id/archive')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Archive brand' })
  archiveBrand(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.adminBrandsModelsService.archiveBrand(id, {
      actorUserId: user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Patch('models/:id/archive')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Archive model' })
  archiveModel(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.adminBrandsModelsService.archiveModel(id, {
      actorUserId: user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Patch('brands/:id/unarchive')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Unarchive brand' })
  unarchiveBrand(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.adminBrandsModelsService.unarchiveBrand(id, {
      actorUserId: user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Patch('models/:id/unarchive')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Unarchive model' })
  unarchiveModel(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.adminBrandsModelsService.unarchiveModel(id, {
      actorUserId: user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('tire-brands-models')
  @ApiOperation({ summary: 'Get tire brands and models (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'query', required: false, type: String })
  @ApiQuery({
    name: 'tireVehicleType',
    required: false,
    enum: constants.tireVehicleTypes,
    description: 'Filter brands with at least one active tire listing of this vehicle type',
  })
  getTireBrandsModels(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('query') query?: string,
    @Query('tireVehicleType') tireVehicleType?: string,
  ) {
    const pageNum = parsePositiveIntQuery(page, 1, 2000);
    const limitNum = parsePositiveIntQuery(limit, 100, 2000);
    const tvt =
      tireVehicleType === 'car' || tireVehicleType === 'truck' || tireVehicleType === 'moto'
        ? (tireVehicleType as TireVehicleType)
        : undefined;
    return this.adminTireBrandsModelsService.getTireBrandsModels(pageNum, limitNum, query, tvt);
  }

  @Post('tire-brands')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Create tire brand' })
  createTireBrand(@Body() dto: CreateTireBrandDto, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.adminTireBrandsModelsService.createTireBrand(dto, {
      actorUserId: user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Patch('tire-brands/:id')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Update tire brand' })
  updateTireBrand(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTireBrandDto,
    @Req() req: Request,
  ) {
    const user = req.user as { id: string };
    return this.adminTireBrandsModelsService.updateTireBrand(id, dto, {
      actorUserId: user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('tire-models')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Create tire model' })
  createTireModel(@Body() dto: CreateTireModelDto, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.adminTireBrandsModelsService.createTireModel(dto, {
      actorUserId: user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Patch('tire-models/:id')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Update tire model' })
  updateTireModel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTireModelDto,
    @Req() req: Request,
  ) {
    const user = req.user as { id: string };
    return this.adminTireBrandsModelsService.updateTireModel(id, dto, {
      actorUserId: user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Patch('tire-brands/:id/archive')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Archive tire brand' })
  archiveTireBrand(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.adminTireBrandsModelsService.archiveTireBrand(id, {
      actorUserId: user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Patch('tire-models/:id/archive')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Archive tire model' })
  archiveTireModel(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.adminTireBrandsModelsService.archiveTireModel(id, {
      actorUserId: user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Patch('tire-brands/:id/unarchive')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Unarchive tire brand' })
  unarchiveTireBrand(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.adminTireBrandsModelsService.unarchiveTireBrand(id, {
      actorUserId: user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Patch('tire-models/:id/unarchive')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Unarchive tire model' })
  unarchiveTireModel(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.adminTireBrandsModelsService.unarchiveTireModel(id, {
      actorUserId: user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
