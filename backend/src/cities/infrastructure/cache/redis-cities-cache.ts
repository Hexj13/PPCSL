import { Injectable } from '@nestjs/common';

import { RedisService } from '../../../common/redis.service';
import { CACHE_PREFIXES, CACHE_TTL, generateCacheKey } from '../../../common/utils/cache.utils';
import { City, ICitiesCache } from '../../application/ports/cities-cache.port';

@Injectable()
export class RedisCitiesCache implements ICitiesCache {
  constructor(private readonly redisService: RedisService) {}

  async getAll(): Promise<City[] | null> {
    const cacheKey = generateCacheKey({ prefix: CACHE_PREFIXES.cities, parts: ['all'] });
    return this.redisService.getJson<City[]>(cacheKey);
  }

  async setAll(cities: City[]): Promise<void> {
    const cacheKey = generateCacheKey({ prefix: CACHE_PREFIXES.cities, parts: ['all'] });
    await this.redisService.setJson(cacheKey, cities, CACHE_TTL.cities.all);
  }
}
