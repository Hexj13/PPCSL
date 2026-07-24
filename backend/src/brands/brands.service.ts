import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { I18nService } from '../common/i18n/i18n.service';
import { createSlug, slugMatches, slugToName } from '../common/utils/slug.utils';

import {
  IBrandsCache,
  BRANDS_CACHE,
  BrandVehicleType,
} from './application/ports/brands-cache.port';
import { Brand } from './entities/brand.entity';
import { VehicleModel } from './entities/vehicle-model.entity';

const BRANDS_EXCLUDED_FROM_LIST: string[] = ['Другая марка'];

@Injectable()
export class BrandsService {
  private readonly logger = new Logger(BrandsService.name);

  constructor(
    @InjectRepository(Brand)
    private brandsRepository: Repository<Brand>,
    @InjectRepository(VehicleModel)
    private modelsRepository: Repository<VehicleModel>,
    @Inject(BRANDS_CACHE)
    private brandsCache: IBrandsCache,
    private i18nService: I18nService,
  ) {}

  async findAll(vehicleType?: BrandVehicleType): Promise<Brand[]> {
    try {
      const cached = await this.brandsCache.getBrands(vehicleType);
      if (cached) {
        return cached.filter((b) => !BRANDS_EXCLUDED_FROM_LIST.includes(b.name));
      }
    } catch (error) {
      this.logger.warn('Failed to get brands from cache', error);
    }

    const queryBuilder = this.brandsRepository
      .createQueryBuilder('brand')
      .select([
        'brand.id',
        'brand.name',
        'brand.logoUrl',
        'brand.order',
        'brand.vehicle_types',
        'brand.popular_country',
      ])
      .where('brand.is_archived = :archived', { archived: false });

    if (vehicleType) {
      queryBuilder.andWhere(
        `(brand.vehicle_types IS NOT NULL AND (string_to_array(COALESCE(NULLIF(trim(both from brand.vehicle_types), ''), ''), ','))::text[] @> ARRAY[:vtFilter]::text[]) OR EXISTS (SELECT 1 FROM vehicle_models vm WHERE vm.brand_id = brand.id AND vm.is_archived = false AND (string_to_array(COALESCE(NULLIF(trim(both from vm.vehicle_types), ''), ''), ','))::text[] @> ARRAY[:vtFilter]::text[])`,
        { vtFilter: vehicleType },
      );
    }

    const brands = await queryBuilder.orderBy('brand.name', 'ASC').getMany();
    const filtered = brands.filter((b) => !BRANDS_EXCLUDED_FROM_LIST.includes(b.name));

    try {
      await this.brandsCache.setBrands(vehicleType, filtered);
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

  async getModelsByBrand(brandId: string, vehicleType?: BrandVehicleType): Promise<VehicleModel[]> {
    try {
      const cached = await this.brandsCache.getModels(brandId, vehicleType);
      if (cached) {
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Failed to get models from cache for brand ${brandId}`, error);
    }

    const queryBuilder = this.modelsRepository
      .createQueryBuilder('model')
      .where('model.brand_id = :brandId', { brandId })
      .andWhere('model.is_archived = :archived', { archived: false })
      .leftJoinAndSelect('model.brand', 'brand');

    if (vehicleType) {
      queryBuilder.andWhere(
        `(string_to_array(COALESCE(NULLIF(trim(both from model.vehicle_types), ''), ''), ','))::text[] @> ARRAY[:vtFilter]::text[]`,
        { vtFilter: vehicleType },
      );
    }

    const models = await queryBuilder
      .orderBy('model.order', 'ASC')
      .addOrderBy('model.name', 'ASC')
      .getMany();

    try {
      await this.brandsCache.setModels(brandId, vehicleType, models);
    } catch (error) {
      this.logger.warn(`Failed to set models cache for brand ${brandId}`, error);
    }

    return models;
  }

  async getModelsByBrands(
    brandIds: string[],
    vehicleType?: BrandVehicleType,
  ): Promise<Record<string, VehicleModel[]>> {
    if (brandIds.length === 0) {
      return {};
    }

    const result: Record<string, VehicleModel[]> = {};
    const uncachedBrandIds: string[] = [];

    for (const brandId of brandIds) {
      try {
        const cached = await this.brandsCache.getModels(brandId, vehicleType);
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
        .andWhere('model.is_archived = :archived', { archived: false })
        .leftJoinAndSelect('model.brand', 'brand');

      if (vehicleType) {
        queryBuilder.andWhere(
          `(string_to_array(COALESCE(NULLIF(trim(both from model.vehicle_types), ''), ''), ','))::text[] @> ARRAY[:vtFilter]::text[]`,
          { vtFilter: vehicleType },
        );
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

        try {
          await this.brandsCache.setModels(brandId, vehicleType, brandModels);
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
    vehicleType?: 'car' | 'truck' | 'moto' | 'tire',
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
        const vehicleTypes: ('car' | 'truck' | 'moto' | 'tire')[] =
          brand.vehicle_types && brand.vehicle_types.length > 0 ? [brand.vehicle_types[0]] : [];
        const model = this.modelsRepository.create({
          name: modelName,
          brand_id: brand.id,
          order: maxOrder + i + 1,
          vehicle_types: vehicleTypes.length > 0 ? vehicleTypes : undefined,
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
      await this.brandsCache.invalidateModels(brand.id);
      await this.brandsCache.invalidateBrandsList();
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
}
