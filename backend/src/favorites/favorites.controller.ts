import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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

import { JwtAuthGuard } from '../auth/infrastructure/guards/jwt-auth.guard';
import { PhoneVerifiedGuard } from '../auth/infrastructure/guards/phone-verified.guard';
import type { AuthenticatedRequest } from '../common/express-augmentation';

import { CheckBatchDto } from './dto/check-batch.dto';
import { FavoritesService } from './favorites.service';

@ApiTags('favorites')
@Controller('api/favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @ApiOperation({ summary: 'Get favorites list (paginated)' })
  @ApiBearerAuth('JWT-auth')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of favorite listings',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { type: 'object' } },
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
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page && Number.isFinite(parseInt(page, 10)) ? parseInt(page, 10) : 1;
    const limitNum = limit && Number.isFinite(parseInt(limit, 10)) ? parseInt(limit, 10) : 20;
    return this.favoritesService.findAll(req.user.id, pageNum, limitNum);
  }

  @Get('ids')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all favorite listing IDs' })
  @ApiResponse({
    status: 200,
    description: 'List of favorite listing IDs',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: { listingIds: { type: 'array', items: { type: 'string' } } },
        },
      },
    },
  })
  getIds(@Request() req: AuthenticatedRequest) {
    return this.favoritesService.getUserFavoriteIds(req.user.id).then((listingIds) => ({
      listingIds,
    }));
  }

  @ApiOperation({ summary: 'Check if multiple listings are in favorites' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Favorite statuses for all listings',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          additionalProperties: { type: 'boolean' },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid listing IDs',
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
  @Post('check-batch')
  @UseGuards(JwtAuthGuard)
  async checkBatch(@Body() dto: CheckBatchDto, @Request() req: AuthenticatedRequest) {
    const result = await this.favoritesService.checkBatch(req.user.id, dto.listingIds);
    return result;
  }

  @ApiOperation({ summary: 'Check if listing is in favorites' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Listing UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Favorite status',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            isFavorite: { type: 'boolean' },
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
  @Get('check/:id')
  @UseGuards(JwtAuthGuard)
  async check(@Param('id') listingId: string, @Request() req: AuthenticatedRequest) {
    const isFavorite = await this.favoritesService.checkIfFavorite(req.user.id, listingId);
    return { isFavorite };
  }

  @ApiOperation({ summary: 'Add listing to favorites' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Listing UUID',
  })
  @ApiResponse({
    status: 201,
    description: 'Listing added to favorites',
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
  @Post(':id')
  @UseGuards(JwtAuthGuard, PhoneVerifiedGuard)
  add(@Param('id') listingId: string, @Request() req: AuthenticatedRequest) {
    return this.favoritesService.add(req.user.id, listingId);
  }

  @ApiOperation({ summary: 'Remove listing from favorites' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Listing UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Listing removed from favorites',
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
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PhoneVerifiedGuard)
  remove(@Param('id') listingId: string, @Request() req: AuthenticatedRequest) {
    return this.favoritesService.remove(req.user.id, listingId);
  }
}
