import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
import { Throttle } from '@nestjs/throttler';

import { AdminGuard } from '../auth/infrastructure/guards/admin.guard';
import { JwtAuthGuard } from '../auth/infrastructure/guards/jwt-auth.guard';
import { I18nService } from '../common/i18n/i18n.service';

import { BrandsService } from './brands.service';
import { AddModelsToBrandDto } from './dto/add-models-to-brand.dto';
import { GetBrandsQueryDto } from './dto/get-brands-query.dto';
import { GetCatalogSuggestQueryDto } from './dto/get-catalog-suggest-query.dto';
import { GetModelsBatchDto } from './dto/get-models-batch.dto';
import { GetSearchMetadataQueryDto } from './dto/get-search-metadata-query.dto';

const isProduction = process.env.NODE_ENV === 'production';
const getThrottleLimit = (prodLimit: number, devLimit: number = prodLimit * 100) => ({
  default: { limit: isProduction ? prodLimit : devLimit, ttl: 60000 },
});

@ApiTags('brands')
@Controller('api/brands')
export class BrandsController {
  constructor(
    private readonly brandsService: BrandsService,
    private readonly i18nService: I18nService,
  ) {}

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

  @ApiOperation({ summary: 'Suggest brands, models, and years for header search' })
  @ApiResponse({
    status: 200,
    description: 'Catalog suggest rows',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              kind: { type: 'string' },
              title: { type: 'string' },
              brandName: { type: 'string', nullable: true },
              vehicleType: { type: 'string', nullable: true },
              logoUrl: { type: 'string', nullable: true },
              brandSlug: { type: 'string', nullable: true },
              modelSlug: { type: 'string', nullable: true },
              year: { type: 'number', nullable: true },
            },
          },
        },
      },
    },
  })
  @Throttle(getThrottleLimit(60, 10000))
  @Get('suggest')
  suggest(@Query() query: GetCatalogSuggestQueryDto) {
    return this.brandsService.suggest(query.q, query.vehicleType, query.limit);
  }

  @ApiOperation({ summary: 'Get search page metadata (brand/model title)' })
  @ApiResponse({
    status: 200,
    description: 'Title and resolved brand/model names',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', nullable: true },
        description: { type: 'string', nullable: true },
        brandName: { type: 'string', nullable: true },
        modelNames: { type: 'array', items: { type: 'string' }, nullable: true },
      },
    },
  })
  @Throttle(getThrottleLimit(500, 10000))
  @Get('search-metadata')
  async getSearchMetadata(
    @Query() query: GetSearchMetadataQueryDto,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const locale = this.i18nService.getLocaleFromHeader(acceptLanguage);
    return this.brandsService.getSearchMetadata(
      query.brand?.trim(),
      query.model?.trim(),
      locale,
      query.vehicleType,
    );
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
      throw new NotFoundException('errors.brandNotFoundById');
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
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'name', example: 'BMW', description: 'Brand name' })
  @ApiBody({ type: AddModelsToBrandDto })
  @ApiResponse({ status: 201, description: 'Models added successfully' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('name/:name/models')
  async addModels(@Param('name') name: string, @Body() body: AddModelsToBrandDto) {
    return this.brandsService.addModelsToBrand(name, body.models);
  }
}
