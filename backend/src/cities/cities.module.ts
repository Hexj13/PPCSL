import { Module } from '@nestjs/common';

import { CommonModule } from '../common/common.module';

import { CITIES_CACHE } from './application/ports/cities-cache.port';
import { CitiesController } from './cities.controller';
import { CitiesService } from './cities.service';
import { RedisCitiesCache } from './infrastructure/cache/redis-cities-cache';

@Module({
  imports: [CommonModule],
  controllers: [CitiesController],
  providers: [
    CitiesService,
    RedisCitiesCache,
    { provide: CITIES_CACHE, useExisting: RedisCitiesCache },
  ],
  exports: [CitiesService],
})
export class CitiesModule {}
