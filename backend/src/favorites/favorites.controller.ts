import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/infrastructure/guards/jwt-auth.guard';

import { CheckBatchDto } from './dto/check-batch.dto';
import { FavoritesService } from './favorites.service';

@ApiTags('favorites')
@Controller('api/favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @ApiOperation({ summary: 'Get favorites list' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'List of favorite listings',
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
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Request() req) {
    return this.favoritesService.findAll(req.user.id);
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
  async checkBatch(@Body() dto: CheckBatchDto, @Request() req) {
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
  async check(@Param('id') listingId: string, @Request() req) {
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
  @UseGuards(JwtAuthGuard)
  add(@Param('id') listingId: string, @Request() req) {
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
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') listingId: string, @Request() req) {
    return this.favoritesService.remove(req.user.id, listingId);
  }
}
