import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { I18nService } from '../common/i18n/i18n.service';

import { ITiresCache, TIRES_CACHE } from './application/ports/tires-cache.port';
import { TireBrand } from './entities/tire-brand.entity';
import { TireModel } from './entities/tire-model.entity';

const TIRE_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseTireUuidList(raw: string | undefined, max = 20): string[] {
  if (!raw?.trim()) return [];
  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter((id) => TIRE_UUID_RE.test(id));
  return [...new Set(ids)].slice(0, max);
}

@Injectable()
export class TiresService {
  private readonly logger = new Logger(TiresService.name);

  constructor(
    @InjectRepository(TireBrand)
    private tireBrandsRepository: Repository<TireBrand>,
    @InjectRepository(TireModel)
    private tireModelsRepository: Repository<TireModel>,
    @Inject(TIRES_CACHE)
    private tiresCache: ITiresCache,
    private readonly i18nService: I18nService,
  ) {}

  async findAllBrands(): Promise<TireBrand[]> {
    try {
      const cached = await this.tiresCache.getBrands();
      if (cached) {
        return cached;
      }
    } catch (error) {
      this.logger.warn('Failed to get tire brands from cache', error);
    }

    const brands = await this.tireBrandsRepository
      .createQueryBuilder('brand')
      .select(['brand.id', 'brand.name', 'brand.logoUrl', 'brand.order'])
      .where('brand.is_archived = :archived', { archived: false })
      .orderBy('brand.order', 'ASC')
      .addOrderBy('brand.name', 'ASC')
      .getMany();

    try {
      await this.tiresCache.setBrands(brands);
    } catch (error) {
      this.logger.warn('Failed to set tire brands cache', error);
    }

    return brands;
  }

  async findBrandById(id: string): Promise<TireBrand | null> {
    return this.tireBrandsRepository.findOne({ where: { id, is_archived: false } });
  }

  async getModelsByBrand(brandId: string): Promise<TireModel[]> {
    try {
      const cached = await this.tiresCache.getModels(brandId);
      if (cached) {
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Failed to get tire models from cache for brand ${brandId}`, error);
    }

    const models = await this.tireModelsRepository
      .createQueryBuilder('model')
      .select([
        'model.id',
        'model.brand_id',
        'model.name',
        'model.order',
        'model.is_other',
        'model.is_archived',
      ])
      .where('model.brand_id = :brandId', { brandId })
      .andWhere('model.is_archived = :archived', { archived: false })
      .leftJoinAndSelect('model.brand', 'brand')
      .orderBy('model.is_other', 'ASC')
      .addOrderBy('model.order', 'ASC')
      .addOrderBy('model.name', 'ASC')
      .getMany();

    try {
      await this.tiresCache.setModels(brandId, models);
    } catch (error) {
      this.logger.warn(`Failed to set tire models cache for brand ${brandId}`, error);
    }

    return models;
  }

  async getSearchMetadata(
    tireBrandIdsRaw: string | undefined,
    tireModelIdsRaw: string | undefined,
    locale: string,
  ): Promise<{
    title: string | null;
    description?: string;
    brandName?: string;
    modelNames?: string[];
  }> {
    const brandIds = parseTireUuidList(tireBrandIdsRaw);
    const modelIds = parseTireUuidList(tireModelIdsRaw);

    const tiresHomeDescription = () =>
      this.i18nService.translate('metadata.site.tiresHomePageDescription', locale);

    if (brandIds.length === 0 && modelIds.length === 0) {
      return { title: null, description: tiresHomeDescription() };
    }

    if (modelIds.length > 0) {
      const models = await this.tireModelsRepository.find({
        where: { id: In(modelIds), is_archived: false },
        relations: ['brand'],
      });
      const active = models.filter((m) => m.brand && !m.brand.is_archived);
      if (active.length > 0) {
        const orderMap = new Map(modelIds.map((id, i) => [id, i]));
        active.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
        const parts = active.map((m) => `${m.brand!.name} ${m.name}`);
        const title = parts.join(', ');
        const uniqueBrandIds = [...new Set(active.map((m) => m.brand_id))];
        const brandName = uniqueBrandIds.length === 1 ? active[0].brand!.name : undefined;
        const modelNamesList = uniqueBrandIds.length === 1 ? active.map((m) => m.name) : [];
        const modelName =
          uniqueBrandIds.length === 1 && modelNamesList.length === 1
            ? modelNamesList[0]
            : undefined;
        const description = brandName
          ? modelName
            ? this.i18nService
                .translate('metadata.site.tiresHomePageDescriptionWithBrandModel', locale)
                .replace('{brand}', brandName)
                .replace('{model}', modelName)
            : this.i18nService
                .translate('metadata.site.tiresHomePageDescriptionWithBrand', locale)
                .replace('{brand}', brandName)
          : tiresHomeDescription();
        return {
          title,
          description,
          brandName,
          modelNames: uniqueBrandIds.length === 1 ? modelNamesList : undefined,
        };
      }
    }

    if (brandIds.length > 0) {
      const brands = await this.tireBrandsRepository.find({
        where: { id: In(brandIds), is_archived: false },
      });
      if (brands.length > 0) {
        const orderMap = new Map(brandIds.map((id, i) => [id, i]));
        brands.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
        const title = brands.length === 1 ? brands[0].name : brands.map((b) => b.name).join(', ');
        const brandName = brands.length === 1 ? brands[0].name : undefined;
        const description = brandName
          ? this.i18nService
              .translate('metadata.site.tiresHomePageDescriptionWithBrand', locale)
              .replace('{brand}', brandName)
          : tiresHomeDescription();
        return { title, description, brandName };
      }
    }

    return { title: null, description: tiresHomeDescription() };
  }
}
