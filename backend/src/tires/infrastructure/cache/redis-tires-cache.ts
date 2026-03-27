import { Injectable } from '@nestjs/common';

import { RedisService } from '../../../common/redis.service';
import { CACHE_PREFIXES, CACHE_TTL, generateCacheKey } from '../../../common/utils/cache.utils';
import { ITiresCache } from '../../application/ports/tires-cache.port';
import { TireBrand } from '../../entities/tire-brand.entity';
import { TireModel } from '../../entities/tire-model.entity';

@Injectable()
export class RedisTiresCache implements ITiresCache {
  constructor(private readonly redisService: RedisService) {}

  async getBrands(): Promise<TireBrand[] | null> {
    const cacheKey = generateCacheKey({
      prefix: CACHE_PREFIXES.tireBrands,
      parts: ['all'],
    });
    return this.redisService.getJson<TireBrand[]>(cacheKey);
  }

  async setBrands(brands: TireBrand[]): Promise<void> {
    const cacheKey = generateCacheKey({
      prefix: CACHE_PREFIXES.tireBrands,
      parts: ['all'],
    });
    await this.redisService.setJson(cacheKey, brands, CACHE_TTL.tireBrands.all);
  }

  async getModels(brandId: string): Promise<TireModel[] | null> {
    const cacheKey = generateCacheKey({
      prefix: CACHE_PREFIXES.tireBrandsModels,
      parts: [brandId],
    });
    return this.redisService.getJson<TireModel[]>(cacheKey);
  }

  async setModels(brandId: string, models: TireModel[]): Promise<void> {
    const cacheKey = generateCacheKey({
      prefix: CACHE_PREFIXES.tireBrandsModels,
      parts: [brandId],
    });
    await this.redisService.setJson(cacheKey, models, CACHE_TTL.tireBrands.models);
  }

  async invalidateAll(): Promise<void> {
    await this.redisService.invalidateByPrefix(CACHE_PREFIXES.tireBrands);
    await this.redisService.invalidateByPrefix(CACHE_PREFIXES.tireBrandsModels);
  }

  async invalidateModels(brandId: string): Promise<void> {
    const prefix = `${CACHE_PREFIXES.tireBrandsModels}:${brandId}`;
    await this.redisService.invalidateByPrefix(prefix);
  }
}
