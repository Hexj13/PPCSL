import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CitiesService } from './cities.service';

@ApiTags('cities')
@Controller('api/cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @ApiOperation({ summary: 'Get all cities' })
  @ApiResponse({ status: 200, description: 'List of cities' })
  @Get()
  findAll() {
    return this.citiesService.getAll();
  }
}
