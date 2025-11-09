import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RedisService } from '../common/redis.service';
import { CACHE_PREFIXES, CACHE_TTL, generateCacheKey } from '../common/utils/cache.utils';
import { Favorite } from '../favorites/entities/favorite.entity';
import { ListingView } from '../listings/entities/listing-view.entity';
import { Listing } from '../listings/entities/listing.entity';
import { Vehicle } from '../listings/entities/vehicle.entity';

import { Brand } from './entities/brand.entity';
import { VehicleModel } from './entities/vehicle-model.entity';

@Injectable()
export class BrandsService {
  private readonly logger = new Logger(BrandsService.name);
  private readonly CACHE_TTL = CACHE_TTL.brands.all;
  private readonly CACHE_TTL_MODELS = CACHE_TTL.brands.models;

  constructor(
    @InjectRepository(Brand)
    private brandsRepository: Repository<Brand>,
    @InjectRepository(VehicleModel)
    private modelsRepository: Repository<VehicleModel>,
    @InjectRepository(Vehicle)
    private vehiclesRepository: Repository<Vehicle>,
    @InjectRepository(Listing)
    private listingsRepository: Repository<Listing>,
    @InjectRepository(ListingView)
    private listingViewsRepository: Repository<ListingView>,
    @InjectRepository(Favorite)
    private favoritesRepository: Repository<Favorite>,
    private redisService: RedisService,
  ) {}

  async findAll(): Promise<Brand[]> {
    const cacheKey = generateCacheKey({ prefix: CACHE_PREFIXES.brands, parts: ['all'] });
    try {
      const cached = await this.redisService.getJson<Brand[]>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      this.logger.warn('Failed to get brands from cache', error);
    }

    const brands = await this.brandsRepository.find({
      order: { name: 'ASC' },
    });

    try {
      await this.redisService.setJson(cacheKey, brands, this.CACHE_TTL);
    } catch (error) {
      this.logger.warn('Failed to set brands cache', error);
    }

    return brands;
  }

  async findOne(id: string): Promise<Brand | null> {
    return this.brandsRepository.findOne({
      where: { id },
      relations: ['models'],
    });
  }

  async findByName(name: string): Promise<Brand | null> {
    return this.brandsRepository.findOne({
      where: { name },
    });
  }

  async getModelsByBrand(brandId: string): Promise<VehicleModel[]> {
    const cacheKey = generateCacheKey({ prefix: CACHE_PREFIXES.brandsModels, parts: [brandId] });
    try {
      const cached = await this.redisService.getJson<VehicleModel[]>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Failed to get models from cache for brand ${brandId}`, error);
    }

    const models = await this.modelsRepository.find({
      where: { brand_id: brandId },
      order: { order: 'ASC', name: 'ASC' },
      relations: ['brand'],
    });

    try {
      await this.redisService.setJson(cacheKey, models, this.CACHE_TTL_MODELS);
    } catch (error) {
      this.logger.warn(`Failed to set models cache for brand ${brandId}`, error);
    }

    return models;
  }

  async getModelsByBrandName(brandName: string): Promise<VehicleModel[]> {
    const brand = await this.findByName(brandName);
    if (!brand) {
      return [];
    }
    return this.getModelsByBrand(brand.id);
  }

  async addModelsToBrand(
    brandName: string,
    modelNames: string[],
  ): Promise<{ brand: Brand; added: number; updated: number; total: number }> {
    const brand = await this.findByName(brandName);

    if (!brand) {
      throw new Error(`Бренд "${brandName}" не е пронајден`);
    }

    const existingModels = await this.modelsRepository.find({
      where: { brand_id: brand.id },
    });

    let added = 0;
    let updated = 0;
    const maxOrder =
      existingModels.length > 0 ? Math.max(...existingModels.map((m) => m.order || 0)) : 0;

    for (let i = 0; i < modelNames.length; i++) {
      const modelName = modelNames[i];
      const modelNameLower = modelName.toLowerCase();

      const existingModel = existingModels.find((m) => m.name.toLowerCase() === modelNameLower);

      if (!existingModel) {
        const model = this.modelsRepository.create({
          name: modelName,
          brand_id: brand.id,
          order: maxOrder + i + 1,
        });
        await this.modelsRepository.save(model);
        added++;
        this.logger.log(`Added model: ${modelName} to brand: ${brandName}`);
      } else {
        existingModel.order = maxOrder + i + 1;
        await this.modelsRepository.save(existingModel);
        updated++;
      }
    }

    const totalModels = await this.modelsRepository.count({
      where: { brand_id: brand.id },
    });

    try {
      await this.redisService.del(
        generateCacheKey({ prefix: CACHE_PREFIXES.brandsModels, parts: [brand.id] }),
      );
      await this.redisService.del(
        generateCacheKey({ prefix: CACHE_PREFIXES.brands, parts: ['all'] }),
      );
    } catch (error) {
      this.logger.warn('Failed to invalidate cache after adding models', error);
    }

    return {
      brand,
      added,
      updated,
      total: totalModels,
    };
  }

  async deleteAll(): Promise<{
    deletedBrands: number;
    deletedModels: number;
    deletedVehicles: number;
    deletedListings: number;
  }> {
    this.logger.log('Starting deletion of all brands...');

    const allBrands = await this.brandsRepository.find();
    this.logger.log(`Found ${allBrands.length} brands to delete`);

    let deletedListings = 0;
    let deletedVehicles = 0;
    let deletedModels = 0;
    let deletedBrands = 0;

    for (const brand of allBrands) {
      const vehicles = await this.vehiclesRepository.find({
        where: { brand_id: brand.id },
      });

      for (const vehicle of vehicles) {
        const listings = await this.listingsRepository.find({
          where: { vehicle_id: vehicle.id },
        });

        for (const listing of listings) {
          const views = await this.listingViewsRepository.find({
            where: { listing_id: listing.id },
          });
          for (const view of views) {
            await this.listingViewsRepository.remove(view);
          }

          const favorites = await this.favoritesRepository.find({
            where: { listing_id: listing.id },
          });
          for (const favorite of favorites) {
            await this.favoritesRepository.remove(favorite);
          }

          await this.listingsRepository.remove(listing);
          deletedListings++;
        }

        await this.vehiclesRepository.remove(vehicle);
        deletedVehicles++;
      }

      const models = await this.modelsRepository.find({
        where: { brand_id: brand.id },
      });
      for (const model of models) {
        await this.modelsRepository.remove(model);
        deletedModels++;
      }

      await this.brandsRepository.remove(brand);
      deletedBrands++;
      this.logger.log(`Deleted brand: ${brand.name}`);
    }

    try {
      await this.redisService.invalidateByPrefix(CACHE_PREFIXES.brands);
    } catch (error) {
      this.logger.warn('Failed to invalidate cache after deleting brands', error);
    }

    this.logger.log(
      `Deletion completed: ${deletedBrands} brands, ${deletedModels} models, ${deletedVehicles} vehicles, ${deletedListings} listings`,
    );

    return {
      deletedBrands,
      deletedModels,
      deletedVehicles,
      deletedListings,
    };
  }
}
