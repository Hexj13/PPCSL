import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { CitiesService } from './cities.service';

const isProduction = process.env.NODE_ENV === 'production';
const getThrottleLimit = (prodLimit: number, devLimit: number = prodLimit * 100) => ({
  default: { limit: isProduction ? prodLimit : devLimit, ttl: 60000 },
});

@ApiTags('cities')
@Controller('api/cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @ApiOperation({ summary: 'Get all cities' })
  @ApiResponse({
    status: 200,
    description: 'List of cities',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              nameEn: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @Throttle(getThrottleLimit(500, 10000))
  @Get()
  findAll() {
    return this.citiesService.getAll();
  }
}
