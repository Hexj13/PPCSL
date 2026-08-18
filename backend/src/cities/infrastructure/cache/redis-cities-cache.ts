import { Injectable } from '@nestjs/common';

import { getCountry } from '../../../common/env';
import { RedisService } from '../../../common/redis.service';
import { CACHE_PREFIXES, CACHE_TTL, generateCacheKey } from '../../../common/utils/cache.utils';
import { City, ICitiesCache } from '../../application/ports/cities-cache.port';

@Injectable()
export class RedisCitiesCache implements ICitiesCache {
  constructor(private readonly redisService: RedisService) {}

  private cacheKey(): string {
    return generateCacheKey({
      prefix: CACHE_PREFIXES.cities,
      parts: [getCountry() || 'md', 'all', 'v2'],
    });
  }

  async getAll(): Promise<City[] | null> {
    return this.redisService.getJson<City[]>(this.cacheKey());
  }

  async setAll(cities: City[]): Promise<void> {
    await this.redisService.setJson(this.cacheKey(), cities, CACHE_TTL.cities.all);
  }
}
