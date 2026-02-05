import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { I18nService } from '../common/i18n/i18n.service';
import { RedisService } from '../common/redis.service';
import { CACHE_PREFIXES, CACHE_TTL, generateCacheKey } from '../common/utils/cache.utils';
import { createSlug, slugMatches, slugToName } from '../common/utils/slug.utils';
import { Favorite } from '../favorites/entities/favorite.entity';
import { ListingView } from '../listings/entities/listing-view.entity';
import { Listing } from '../listings/entities/listing.entity';
import { Vehicle } from '../listings/entities/vehicle.entity';

import { Brand } from './entities/brand.entity';
import { VehicleModel } from './entities/vehicle-model.entity';

const BRANDS_EXCLUDED_FROM_LIST: string[] = ['Другая марка'];

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
    private i18nService: I18nService,
  ) {}

  async findAll(vehicleType?: 'car' | 'truck' | 'moto'): Promise<Brand[]> {
    const cacheKey = generateCacheKey({
      prefix: CACHE_PREFIXES.brands,
      parts: vehicleType ? ['all', vehicleType] : ['all'],
    });
    try {
      const cached = await this.redisService.getJson<Brand[]>(cacheKey);
      if (cached) {
        return cached.filter((b) => !BRANDS_EXCLUDED_FROM_LIST.includes(b.name));
      }
    } catch (error) {
      this.logger.warn('Failed to get brands from cache', error);
    }

    const queryBuilder = this.brandsRepository
      .createQueryBuilder('brand')
      .select(['brand.id', 'brand.name', 'brand.logoUrl', 'brand.order', 'brand.vehicle_types']);

    if (vehicleType) {
      queryBuilder.where(
        `(brand.vehicle_types IS NOT NULL AND (brand.vehicle_types::text LIKE :pattern1 OR brand.vehicle_types::text LIKE :pattern2 OR brand.vehicle_types::text LIKE :pattern3 OR brand.vehicle_types::text = :vehicleType)) OR EXISTS (SELECT 1 FROM vehicle_models WHERE vehicle_models.brand_id = brand.id AND vehicle_models.vehicle_type::text = :vehicleType)`,
        {
          vehicleType,
          pattern1: `%,${vehicleType},%`,
          pattern2: `${vehicleType},%`,
          pattern3: `%,${vehicleType}`,
        },
      );
    }

    const brands = await queryBuilder.orderBy('brand.name', 'ASC').getMany();
    const filtered = brands.filter((b) => !BRANDS_EXCLUDED_FROM_LIST.includes(b.name));

    try {
      await this.redisService.setJson(cacheKey, filtered, this.CACHE_TTL);
    } catch (error) {
      this.logger.warn('Failed to set brands cache', error);
    }

    return filtered;
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

  async getModelsByBrand(
    brandId: string,
    vehicleType?: 'car' | 'truck' | 'moto',
  ): Promise<VehicleModel[]> {
    const cacheKey = generateCacheKey({
      prefix: CACHE_PREFIXES.brandsModels,
      parts: vehicleType ? [brandId, vehicleType] : [brandId],
    });
    try {
      const cached = await this.redisService.getJson<VehicleModel[]>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Failed to get models from cache for brand ${brandId}`, error);
    }

    const queryBuilder = this.modelsRepository
      .createQueryBuilder('model')
      .where('model.brand_id = :brandId', { brandId })
      .leftJoinAndSelect('model.brand', 'brand');

    if (vehicleType) {
      queryBuilder.andWhere('model.vehicle_type = :vehicleType', { vehicleType });
    }

    const models = await queryBuilder
      .orderBy('model.order', 'ASC')
      .addOrderBy('model.name', 'ASC')
      .getMany();

    try {
      await this.redisService.setJson(cacheKey, models, this.CACHE_TTL_MODELS);
    } catch (error) {
      this.logger.warn(`Failed to set models cache for brand ${brandId}`, error);
    }

    return models;
  }

  async getModelsByBrands(
    brandIds: string[],
    vehicleType?: 'car' | 'truck' | 'moto',
  ): Promise<Record<string, VehicleModel[]>> {
    if (brandIds.length === 0) {
      return {};
    }

    const result: Record<string, VehicleModel[]> = {};
    const uncachedBrandIds: string[] = [];

    for (const brandId of brandIds) {
      const cacheKey = generateCacheKey({
        prefix: CACHE_PREFIXES.brandsModels,
        parts: vehicleType ? [brandId, vehicleType] : [brandId],
      });
      try {
        const cached = await this.redisService.getJson<VehicleModel[]>(cacheKey);
        if (cached) {
          result[brandId] = cached;
        } else {
          uncachedBrandIds.push(brandId);
        }
      } catch (error) {
        this.logger.warn(`Failed to get models from cache for brand ${brandId}`, error);
        uncachedBrandIds.push(brandId);
      }
    }

    if (uncachedBrandIds.length > 0) {
      const queryBuilder = this.modelsRepository
        .createQueryBuilder('model')
        .where('model.brand_id IN (:...brandIds)', { brandIds: uncachedBrandIds })
        .leftJoinAndSelect('model.brand', 'brand');

      if (vehicleType) {
        queryBuilder.andWhere('model.vehicle_type = :vehicleType', { vehicleType });
      }

      const models = await queryBuilder
        .orderBy('model.order', 'ASC')
        .addOrderBy('model.name', 'ASC')
        .getMany();

      const modelsByBrand = new Map<string, VehicleModel[]>();
      for (const model of models) {
        if (!modelsByBrand.has(model.brand_id)) {
          modelsByBrand.set(model.brand_id, []);
        }
        modelsByBrand.get(model.brand_id)!.push(model);
      }

      for (const brandId of uncachedBrandIds) {
        const brandModels = modelsByBrand.get(brandId) || [];
        result[brandId] = brandModels;

        const cacheKey = generateCacheKey({
          prefix: CACHE_PREFIXES.brandsModels,
          parts: vehicleType ? [brandId, vehicleType] : [brandId],
        });
        try {
          await this.redisService.setJson(cacheKey, brandModels, this.CACHE_TTL_MODELS);
        } catch (error) {
          this.logger.warn(`Failed to set models cache for brand ${brandId}`, error);
        }
      }
    }

    return result;
  }

  async getSearchMetadata(
    brandSlug: string | undefined,
    modelSlug: string | undefined,
    locale: string,
    vehicleType?: 'car' | 'truck' | 'moto',
  ): Promise<{
    title: string | null;
    description?: string;
    brandName?: string;
    modelNames?: string[];
  }> {
    if (!brandSlug || !brandSlug.trim()) {
      return {
        title: null,
        description: this.i18nService.translate('metadata.site.homePageDescription', locale),
      };
    }
    const brandSlugs = brandSlug
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (brandSlugs.length === 0) {
      return {
        title: null,
        description: this.i18nService.translate('metadata.site.homePageDescription', locale),
      };
    }
    const brands = await this.findAll(vehicleType);
    const foundBrands = brandSlugs
      .map((slug) => {
        const bySlug = brands.find((b) => createSlug(b.name) === slug);
        if (bySlug) return bySlug;
        return brands.find((b) => b.name.toLowerCase() === slug);
      })
      .filter((b): b is Brand => Boolean(b));
    if (foundBrands.length === 0) {
      return {
        title: null,
        description: this.i18nService.translate('metadata.site.homePageDescription', locale),
      };
    }

    const modelSlugs = modelSlug
      ? modelSlug
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      : [];
    if (modelSlugs.length === 0) {
      const title =
        foundBrands.length === 1 ? foundBrands[0].name : foundBrands.map((b) => b.name).join(', ');
      const brandName = foundBrands.length === 1 ? foundBrands[0].name : undefined;
      const description = brandName
        ? this.i18nService
            .translate('metadata.site.homePageDescriptionWithBrand', locale)
            .replace('{brand}', brandName)
        : this.i18nService.translate('metadata.site.homePageDescription', locale);
      return { title, description, brandName };
    }

    const brandIds = foundBrands.map((b) => b.id);
    const modelsByBrand = await this.getModelsByBrands(brandIds, vehicleType);
    const parts: string[] = [];
    const modelNames: string[] = [];

    foundBrands.forEach((brand) => {
      const models = modelsByBrand[brand.id] || [];
      const brandParts: string[] = [];

      modelSlugs.forEach((slug) => {
        const model = models.find(
          (m) =>
            m.name.toLowerCase() === slug ||
            createSlug(m.name) === slug ||
            slugMatches(slug, m.name),
        );
        if (model) {
          brandParts.push(`${brand.name} ${model.name}`);
          if (foundBrands.length === 1) {
            modelNames.push(model.name);
          }
        }
      });

      if (brandParts.length > 0) {
        parts.push(...brandParts);
      } else if (foundBrands.length === 1 && modelSlugs.length > 0) {
        const fallbackModels = modelSlugs.map((s) => slugToName(s)).join(', ');
        parts.push(`${brand.name} ${fallbackModels}`);
        modelSlugs.forEach((s) => modelNames.push(slugToName(s)));
      } else {
        parts.push(brand.name);
      }
    });

    if (parts.length === 0) {
      const title =
        foundBrands.length === 1 ? foundBrands[0].name : foundBrands.map((b) => b.name).join(', ');
      const brandName = foundBrands.length === 1 ? foundBrands[0].name : undefined;
      const description = brandName
        ? this.i18nService
            .translate('metadata.site.homePageDescriptionWithBrand', locale)
            .replace('{brand}', brandName)
        : this.i18nService.translate('metadata.site.homePageDescription', locale);
      return { title, description, brandName };
    }

    const brandName = foundBrands.length === 1 ? foundBrands[0].name : undefined;
    const modelName =
      foundBrands.length === 1 && modelNames.length === 1 ? modelNames[0] : undefined;
    const description = brandName
      ? modelName
        ? this.i18nService
            .translate('metadata.site.homePageDescriptionWithBrandModel', locale)
            .replace('{brand}', brandName)
            .replace('{model}', modelName)
        : this.i18nService
            .translate('metadata.site.homePageDescriptionWithBrand', locale)
            .replace('{brand}', brandName)
      : this.i18nService.translate('metadata.site.homePageDescription', locale);

    return {
      title: parts.join(', '),
      description,
      brandName,
      modelNames: foundBrands.length === 1 ? modelNames : undefined,
    };
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
      throw new BadRequestException(`errors.brandNotFound|${brandName}`);
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
