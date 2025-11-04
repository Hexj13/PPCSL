import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { BrandsService } from './brands.service';

@Controller('api/brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  findAll() {
    return this.brandsService.findAll();
  }

  @Get(':id/models')
  getModels(@Param('id') id: string) {
    return this.brandsService.getModelsByBrand(id);
  }

  @Get('name/:name/models')
  getModelsByName(@Param('name') name: string) {
    return this.brandsService.getModelsByBrandName(name);
  }

  @Post('name/:name/models')
  async addModels(@Param('name') name: string, @Body() body: { models: string[] }) {
    return this.brandsService.addModelsToBrand(name, body.models);
  }

  @Delete('all')
  async deleteAll() {
    return this.brandsService.deleteAll();
  }
}
