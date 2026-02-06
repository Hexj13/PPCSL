import { Injectable } from '@nestjs/common';

import { RedisService } from '../../../common/redis.service';
import { CACHE_PREFIXES, CACHE_TTL, generateCacheKey } from '../../../common/utils/cache.utils';
import { IBrandsCache, BrandVehicleType } from '../../application/ports/brands-cache.port';
import { Brand } from '../../entities/brand.entity';
import { VehicleModel } from '../../entities/vehicle-model.entity';

@Injectable()
export class RedisBrandsCache implements IBrandsCache {
  constructor(private readonly redisService: RedisService) {}

  async getBrands(vehicleType?: BrandVehicleType): Promise<Brand[] | null> {
    const cacheKey = generateCacheKey({
      prefix: CACHE_PREFIXES.brands,
      parts: vehicleType ? ['all', vehicleType] : ['all'],
    });
    return this.redisService.getJson<Brand[]>(cacheKey);
  }

  async setBrands(vehicleType: BrandVehicleType | undefined, brands: Brand[]): Promise<void> {
    const cacheKey = generateCacheKey({
      prefix: CACHE_PREFIXES.brands,
      parts: vehicleType ? ['all', vehicleType] : ['all'],
    });
    await this.redisService.setJson(cacheKey, brands, CACHE_TTL.brands.all);
  }

  async getModels(brandId: string, vehicleType?: BrandVehicleType): Promise<VehicleModel[] | null> {
    const cacheKey = generateCacheKey({
      prefix: CACHE_PREFIXES.brandsModels,
      parts: vehicleType ? [brandId, vehicleType] : [brandId],
    });
    return this.redisService.getJson<VehicleModel[]>(cacheKey);
  }

  async setModels(
    brandId: string,
    vehicleType: BrandVehicleType | undefined,
    models: VehicleModel[],
  ): Promise<void> {
    const cacheKey = generateCacheKey({
      prefix: CACHE_PREFIXES.brandsModels,
      parts: vehicleType ? [brandId, vehicleType] : [brandId],
    });
    await this.redisService.setJson(cacheKey, models, CACHE_TTL.brands.models);
  }

  async invalidateAll(): Promise<void> {
    await this.redisService.invalidateByPrefix(CACHE_PREFIXES.brands);
  }

  async invalidateModels(brandId: string): Promise<void> {
    const prefix = `${CACHE_PREFIXES.brandsModels}:${brandId}`;
    await this.redisService.invalidateByPrefix(prefix);
  }

  async invalidateBrandsList(): Promise<void> {
    await this.redisService.invalidateByPrefix(CACHE_PREFIXES.brands);
  }
}
