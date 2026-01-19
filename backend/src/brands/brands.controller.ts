import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { BrandsService } from './brands.service';
import { GetBrandsQueryDto } from './dto/get-brands-query.dto';
import { GetModelsBatchDto } from './dto/get-models-batch.dto';

const isProduction = process.env.NODE_ENV === 'production';
const getThrottleLimit = (prodLimit: number, devLimit: number = prodLimit * 100) => ({
  default: { limit: isProduction ? prodLimit : devLimit, ttl: 60000 },
});

@ApiTags('brands')
@Controller('api/brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @ApiOperation({ summary: 'Get all brands' })
  @ApiResponse({
    status: 200,
    description: 'List of brands',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: {
            type: 'object',
          },
        },
      },
    },
  })
  @Throttle(getThrottleLimit(500, 10000))
  @Get()
  findAll(@Query() query: GetBrandsQueryDto) {
    return this.brandsService.findAll(query.vehicleType);
  }

  @ApiOperation({ summary: 'Get models by brand ID' })
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Brand UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of models',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: {
            type: 'object',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Brand not found',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 404 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @Throttle(getThrottleLimit(500, 10000))
  @Get(':id/models')
  async getModels(@Param('id', ParseUUIDPipe) id: string, @Query() query: GetBrandsQueryDto) {
    const brand = await this.brandsService.findOne(id);
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
    return this.brandsService.getModelsByBrand(id, query.vehicleType);
  }

  @ApiOperation({ summary: 'Get models for multiple brands' })
  @ApiBody({ type: GetModelsBatchDto })
  @ApiResponse({
    status: 200,
    description: 'Map of brand IDs to their models',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          additionalProperties: {
            type: 'array',
            items: { type: 'object' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body',
  })
  @HttpCode(200)
  @Throttle(getThrottleLimit(100, 10000))
  @Post('models/batch')
  async getModelsBatch(@Body() body: GetModelsBatchDto) {
    return this.brandsService.getModelsByBrands(body.brandIds, body.vehicleType);
  }

  @Throttle(getThrottleLimit(500, 10000))
  @ApiOperation({ summary: 'Get models by brand name' })
  @ApiParam({ name: 'name', example: 'BMW', description: 'Brand name' })
  @ApiResponse({ status: 200, description: 'List of models' })
  @Get('name/:name/models')
  getModelsByName(@Param('name') name: string) {
    return this.brandsService.getModelsByBrandName(name);
  }

  @ApiOperation({ summary: 'Add models to brand' })
  @ApiParam({ name: 'name', example: 'BMW', description: 'Brand name' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        models: {
          type: 'array',
          items: { type: 'string' },
          example: ['3 Series', '5 Series', 'X5'],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Models added successfully' })
  @Post('name/:name/models')
  async addModels(@Param('name') name: string, @Body() body: { models: string[] }) {
    return this.brandsService.addModelsToBrand(name, body.models);
  }

  @ApiOperation({ summary: 'Delete all brands (admin only)' })
  @ApiResponse({ status: 200, description: 'All brands deleted successfully' })
  @Delete('all')
  async deleteAll() {
    return this.brandsService.deleteAll();
  }
}
