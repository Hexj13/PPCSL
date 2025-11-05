import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { BrandsService } from './brands.service';

@ApiTags('brands')
@Controller('api/brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @ApiOperation({ summary: 'Get all brands' })
  @ApiResponse({ status: 200, description: 'List of brands' })
  @Get()
  findAll() {
    return this.brandsService.findAll();
  }

  @ApiOperation({ summary: 'Get models by brand ID' })
  @ApiParam({
    name: 'id',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Brand UUID',
  })
  @ApiResponse({ status: 200, description: 'List of models' })
  @Get(':id/models')
  getModels(@Param('id') id: string) {
    return this.brandsService.getModelsByBrand(id);
  }

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
