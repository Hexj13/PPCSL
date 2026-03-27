import {
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { I18nService } from '../common/i18n/i18n.service';

import { GetTireSearchMetadataQueryDto } from './dto/get-tire-search-metadata-query.dto';
import { TiresService } from './tires.service';

const isProduction = process.env.NODE_ENV === 'production';
const getThrottleLimit = (prodLimit: number, devLimit: number = prodLimit * 100) => ({
  default: { limit: isProduction ? prodLimit : devLimit, ttl: 60000 },
});

@ApiTags('tire-brands')
@Controller('api/tire-brands')
export class TiresController {
  constructor(
    private readonly tiresService: TiresService,
    private readonly i18nService: I18nService,
  ) {}

  @ApiOperation({ summary: 'Get all tire brands' })
  @ApiResponse({ status: 200, description: 'List of tire brands' })
  @Throttle(getThrottleLimit(500, 10000))
  @Get()
  findAll() {
    return this.tiresService.findAllBrands();
  }

  @ApiOperation({ summary: 'Get tire search page metadata (brand/model title)' })
  @ApiResponse({
    status: 200,
    description: 'Title and resolved tire brand/model names',
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
  getSearchMetadata(
    @Query() query: GetTireSearchMetadataQueryDto,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const locale = this.i18nService.getLocaleFromHeader(acceptLanguage);
    return this.tiresService.getSearchMetadata(
      query.tire_brand_ids?.trim(),
      query.tire_model_ids?.trim(),
      locale,
    );
  }

  @ApiOperation({ summary: 'Get tire models by brand ID' })
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Tire brand UUID',
  })
  @ApiResponse({ status: 200, description: 'List of tire models' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  @Throttle(getThrottleLimit(500, 10000))
  @Get(':id/models')
  async getModels(@Param('id', ParseUUIDPipe) id: string) {
    const brand = await this.tiresService.findBrandById(id);
    if (!brand) {
      throw new NotFoundException('errors.tireBrandNotFound');
    }
    return this.tiresService.getModelsByBrand(id);
  }
}
