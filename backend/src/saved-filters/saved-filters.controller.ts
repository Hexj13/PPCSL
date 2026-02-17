import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/infrastructure/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/express-augmentation';

import { CreateSavedFilterDto } from './dto/create-saved-filter.dto';
import { UpdateSavedFilterDto } from './dto/update-saved-filter.dto';
import { SavedFiltersService } from './saved-filters.service';

@ApiTags('saved-filters')
@Controller('api/saved-filters')
export class SavedFiltersController {
  constructor(private readonly savedFiltersService: SavedFiltersService) {}

  @ApiOperation({ summary: 'Get all saved filters' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'List of saved filters',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              user_id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              filters: { type: 'object' },
              created_at: { type: 'string', format: 'date-time' },
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
  findAll(@Request() req: AuthenticatedRequest) {
    return this.savedFiltersService.findAll(req.user.id);
  }

  @ApiOperation({ summary: 'Create saved filter' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 201,
    description: 'Filter saved successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            filters: { type: 'object' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Maximum limit reached or validation error',
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
  create(@Body() createDto: CreateSavedFilterDto, @Request() req: AuthenticatedRequest) {
    return this.savedFiltersService.create(req.user.id, createDto.name, createDto.filters);
  }

  @ApiOperation({ summary: 'Update saved filter' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Saved filter UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Filter updated successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            filters: { type: 'object' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Filter not found or validation error',
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
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateSavedFilterDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.savedFiltersService.update(req.user.id, id, updateDto.name);
  }

  @ApiOperation({ summary: 'Delete saved filter' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Saved filter UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Filter deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Filter not found',
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
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.savedFiltersService.remove(req.user.id, id);
  }
}
