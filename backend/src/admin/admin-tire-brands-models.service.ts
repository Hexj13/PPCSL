import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { TireVehicleType } from '../common/types';
import { buildPaginationMeta } from '../common/utils/pagination.utils';
import { normalizeForComparison } from '../common/utils/slug.utils';
import { IListingCache } from '../listings/application/ports/listing-cache.port';
import { LISTING_CACHE } from '../listings/application/ports/listing-cache.port';
import { Listing } from '../listings/entities/listing.entity';
import { ITiresCache, TIRES_CACHE } from '../tires/application/ports/tires-cache.port';
import { TireBrand } from '../tires/entities/tire-brand.entity';
import { TireModel } from '../tires/entities/tire-model.entity';
import { Tire } from '../tires/entities/tire.entity';

import { AdminAuditService } from './admin-audit.service';
import { CreateTireBrandDto } from './dto/create-tire-brand.dto';
import { CreateTireModelDto } from './dto/create-tire-model.dto';
import { UpdateTireBrandDto } from './dto/update-tire-brand.dto';
import { UpdateTireModelDto } from './dto/update-tire-model.dto';

export interface AdminTireModelDto {
  id: string;
  brandId: string;
  name: string;
  vehicleTypes: ('car' | 'truck' | 'moto')[];
  isArchived: boolean;
  activeListingsCount: number;
  isOther: boolean;
}

export interface AdminTireBrandDto {
  id: string;
  name: string;
  vehicleTypes: ('car' | 'truck' | 'moto')[];
  isArchived: boolean;
  activeListingsCount: number;
  models: AdminTireModelDto[];
}

export interface AuditContext {
  actorUserId: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AdminTireBrandsModelsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(TireBrand)
    private readonly tireBrandRepo: Repository<TireBrand>,
    @InjectRepository(TireModel)
    private readonly tireModelRepo: Repository<TireModel>,
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    private readonly auditService: AdminAuditService,
    @Inject(TIRES_CACHE)
    private readonly tiresCache: ITiresCache,
    @Inject(LISTING_CACHE)
    private readonly listingCache: IListingCache,
  ) {}

  async getTireBrandsModels(
    page: number,
    limit: number,
    query?: string,
    tireVehicleType?: TireVehicleType,
  ): Promise<{
    data: AdminTireBrandDto[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;
    const qb = this.tireBrandRepo
      .createQueryBuilder('brand')
      .where('brand.is_archived = :archived', { archived: false })
      .orderBy('brand.name', 'ASC');
    if (query && query.trim()) {
      qb.andWhere('brand.name ILIKE :q', { q: `%${query.trim()}%` });
    }
    if (tireVehicleType) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM listings l
          INNER JOIN tires t ON t.id = l.tire_id
          WHERE l.status = :activeStatus
          AND l.category = :tireCategory
          AND t.brand_id = brand.id
          AND t.tire_vehicle_type = :tvt
        )`,
        {
          activeStatus: 'Active',
          tireCategory: 'tire',
          tvt: tireVehicleType,
        },
      );
    }
    const [brands, total] = await qb.skip(skip).take(limit).getManyAndCount();
    if (brands.length === 0) {
      return {
        data: [],
        meta: buildPaginationMeta(total, page, limit),
      };
    }
    const brandIds = brands.map((b) => b.id);
    const models = await this.tireModelRepo.find({
      where: { brand_id: In(brandIds), is_archived: false },
      order: { name: 'ASC' },
    });
    const brandCounts = await this.activeTireListingCountsByBrandIds(brandIds, tireVehicleType);
    const modelIds = models.map((m) => m.id);
    const modelCounts =
      modelIds.length > 0
        ? await this.activeTireListingCountsByModelIds(modelIds, tireVehicleType)
        : [];
    const brandCountMap = new Map(brandCounts.map((r) => [r.brandId, r.cnt]));
    const modelCountMap = new Map(modelCounts.map((r) => [r.modelId, r.cnt]));
    const modelsByBrand = new Map<string, TireModel[]>();
    for (const m of models) {
      const list = modelsByBrand.get(m.brand_id) ?? [];
      list.push(m);
      modelsByBrand.set(m.brand_id, list);
    }
    const data: AdminTireBrandDto[] = brands.map((b) => ({
      id: b.id,
      name: b.name,
      vehicleTypes: [],
      isArchived: b.is_archived,
      activeListingsCount: brandCountMap.get(b.id) ?? 0,
      models: (modelsByBrand.get(b.id) ?? [])
        .slice()
        .sort((a, c) => a.name.localeCompare(c.name, undefined, { sensitivity: 'base' }))
        .map((m) => ({
          id: m.id,
          brandId: m.brand_id,
          name: m.name,
          vehicleTypes: [],
          isArchived: m.is_archived,
          activeListingsCount: modelCountMap.get(m.id) ?? 0,
          isOther: m.is_other,
        })),
    }));
    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async createTireBrand(dto: CreateTireBrandDto, ctx: AuditContext): Promise<AdminTireBrandDto> {
    const name = dto.name.trim();
    const nameNormalized = normalizeForComparison(name);
    const result = await this.dataSource.transaction(async (manager) => {
      const existing = await manager.findOne(TireBrand, {
        where: { name_normalized: nameNormalized, is_archived: false },
      });
      if (existing) {
        throw new ConflictException({
          message: 'errors.brandDuplicateName',
          code: 'DUPLICATE_NAME',
        });
      }
      const brand = manager.create(TireBrand, {
        name,
        name_normalized: nameNormalized,
        is_archived: false,
      });
      const saved = await manager.save(TireBrand, brand).catch((err: { code?: string }) => {
        if (err?.code === '23505') {
          throw new ConflictException({
            message: 'errors.brandDuplicateName',
            code: 'DUPLICATE_NAME',
          });
        }
        throw err;
      });
      await this.auditService.log(manager, {
        ...ctx,
        action: 'TIRE_BRAND_CREATE',
        entityType: 'TIRE_BRAND',
        entityId: saved.id,
        after: this.tireBrandSnapshot(saved),
      });
      return this.toAdminTireBrandDto(saved, []);
    });
    await this.invalidateCaches();
    return result;
  }

  async updateTireBrand(
    id: string,
    dto: UpdateTireBrandDto,
    ctx: AuditContext,
  ): Promise<AdminTireBrandDto> {
    const result = await this.dataSource.transaction(async (manager) => {
      const brand = await manager.findOne(TireBrand, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!brand) {
        throw new NotFoundException({ message: 'errors.brandNotFound', code: 'NOT_FOUND' });
      }
      const before = this.tireBrandSnapshot(brand);
      if (dto.name !== undefined) {
        const nextName = dto.name.trim();
        const nameNormalized = normalizeForComparison(nextName);
        const other = await manager.findOne(TireBrand, {
          where: { name_normalized: nameNormalized, is_archived: false },
        });
        if (other && other.id !== id) {
          throw new ConflictException({
            message: 'errors.brandDuplicateName',
            code: 'DUPLICATE_NAME',
          });
        }
        brand.name = nextName;
        brand.name_normalized = nameNormalized;
      }
      await manager.save(TireBrand, brand).catch((err: { code?: string }) => {
        if (err?.code === '23505') {
          throw new ConflictException({
            message: 'errors.brandDuplicateName',
            code: 'DUPLICATE_NAME',
          });
        }
        throw err;
      });
      const after = this.tireBrandSnapshot(brand);
      await this.auditService.log(manager, {
        ...ctx,
        action: 'TIRE_BRAND_UPDATE',
        entityType: 'TIRE_BRAND',
        entityId: id,
        before,
        after,
      });
      const models = await manager.find(TireModel, {
        where: { brand_id: id, is_archived: false },
        order: { name: 'ASC' },
      });
      return this.toAdminTireBrandDto(brand, models);
    });
    await this.invalidateCaches();
    return result;
  }

  async createTireModel(dto: CreateTireModelDto, ctx: AuditContext): Promise<AdminTireModelDto> {
    const brand = await this.tireBrandRepo.findOne({ where: { id: dto.brandId } });
    if (!brand) {
      throw new NotFoundException({ message: 'errors.brandNotFound', code: 'NOT_FOUND' });
    }
    if (brand.is_archived) {
      throw new BadRequestException({ message: 'errors.brandNotFound', code: 'NOT_FOUND' });
    }
    const name = dto.name.trim();
    const nameNormalized = normalizeForComparison(name);
    const existing = await this.tireModelRepo.findOne({
      where: { brand_id: dto.brandId, name_normalized: nameNormalized, is_archived: false },
    });
    if (existing) {
      throw new ConflictException({
        message: 'errors.modelDuplicateName',
        code: 'DUPLICATE_NAME',
      });
    }
    const result = await this.dataSource.transaction(async (manager) => {
      const model = manager.create(TireModel, {
        brand_id: dto.brandId,
        name,
        name_normalized: nameNormalized,
        is_archived: false,
        is_other: dto.isOther ?? false,
      });
      const saved = await manager.save(TireModel, model).catch((err: { code?: string }) => {
        if (err?.code === '23505') {
          throw new ConflictException({
            message: 'errors.modelDuplicateName',
            code: 'DUPLICATE_NAME',
          });
        }
        throw err;
      });
      await this.auditService.log(manager, {
        ...ctx,
        action: 'TIRE_MODEL_CREATE',
        entityType: 'TIRE_MODEL',
        entityId: saved.id,
        after: this.tireModelSnapshot(saved),
      });
      const cnt = await this.activeTireListingsCountByModelId(saved.id, undefined);
      return this.toAdminTireModelDto(saved, cnt);
    });
    await this.invalidateCachesForBrand(dto.brandId);
    return result;
  }

  async updateTireModel(
    id: string,
    dto: UpdateTireModelDto,
    ctx: AuditContext,
  ): Promise<AdminTireModelDto> {
    const result = await this.dataSource.transaction(async (manager) => {
      const model = await manager.findOne(TireModel, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!model) {
        throw new NotFoundException({ message: 'errors.modelNotFound', code: 'NOT_FOUND' });
      }
      const before = this.tireModelSnapshot(model);
      const prevBrandId = model.brand_id;
      if (dto.brandId !== undefined && dto.brandId !== model.brand_id) {
        const newBrand = await manager.findOne(TireBrand, { where: { id: dto.brandId } });
        if (!newBrand || newBrand.is_archived) {
          throw new NotFoundException({ message: 'errors.brandNotFound', code: 'NOT_FOUND' });
        }
        model.brand_id = dto.brandId;
      }
      if (dto.name !== undefined) {
        model.name = dto.name.trim();
        model.name_normalized = normalizeForComparison(model.name);
      }
      if (dto.isOther !== undefined) {
        model.is_other = dto.isOther;
      }
      const nameNormalized = model.name_normalized ?? normalizeForComparison(model.name);
      const other = await manager.findOne(TireModel, {
        where: {
          brand_id: model.brand_id,
          name_normalized: nameNormalized,
          is_archived: false,
        },
      });
      if (other && other.id !== id) {
        throw new ConflictException({
          message: 'errors.modelDuplicateName',
          code: 'DUPLICATE_NAME',
        });
      }
      await manager.save(TireModel, model).catch((err: { code?: string }) => {
        if (err?.code === '23505') {
          throw new ConflictException({
            message: 'errors.modelDuplicateName',
            code: 'DUPLICATE_NAME',
          });
        }
        throw err;
      });
      const after = this.tireModelSnapshot(model);
      await this.auditService.log(manager, {
        ...ctx,
        action: 'TIRE_MODEL_UPDATE',
        entityType: 'TIRE_MODEL',
        entityId: id,
        before,
        after,
      });
      const cnt = await this.activeTireListingsCountByModelId(id, undefined);
      return {
        dto: this.toAdminTireModelDto(model, cnt),
        cacheBrandIds: [prevBrandId, model.brand_id],
      };
    });
    await this.invalidateCachesForBrands(result.cacheBrandIds);
    return result.dto;
  }

  async archiveTireBrand(id: string, ctx: AuditContext): Promise<void> {
    const brand = await this.tireBrandRepo.findOne({ where: { id } });
    if (!brand) {
      throw new NotFoundException({ message: 'errors.brandNotFound', code: 'NOT_FOUND' });
    }
    const brandCount = await this.activeTireListingsCountByBrandId(id, undefined);
    if (brandCount > 0) {
      throw new ConflictException({
        message: 'errors.hasActiveListings',
        code: 'HAS_ACTIVE_LISTINGS',
      });
    }
    const models = await this.tireModelRepo.find({ where: { brand_id: id } });
    const modelCounts =
      models.length > 0
        ? await this.activeTireListingCountsByModelIds(
            models.map((model) => model.id),
            undefined,
          )
        : [];
    if (modelCounts.some((entry) => entry.cnt > 0)) {
      throw new ConflictException({
        message: 'errors.hasActiveListings',
        code: 'HAS_ACTIVE_LISTINGS',
      });
    }
    await this.dataSource.transaction(async (manager) => {
      const b = await manager.findOne(TireBrand, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!b) throw new NotFoundException({ message: 'errors.brandNotFound', code: 'NOT_FOUND' });
      b.is_archived = true;
      await manager.save(TireBrand, b);
      await manager.update(TireModel, { brand_id: id }, { is_archived: true });
      await this.auditService.log(manager, {
        ...ctx,
        action: 'TIRE_BRAND_ARCHIVE',
        entityType: 'TIRE_BRAND',
        entityId: id,
        after: this.tireBrandSnapshot(b),
      });
      const updatedModels = await manager.find(TireModel, { where: { brand_id: id } });
      for (const m of updatedModels) {
        await this.auditService.log(manager, {
          ...ctx,
          action: 'TIRE_MODEL_ARCHIVE',
          entityType: 'TIRE_MODEL',
          entityId: m.id,
          after: this.tireModelSnapshot(m),
        });
      }
    });
    await this.invalidateCaches();
  }

  async archiveTireModel(id: string, ctx: AuditContext): Promise<void> {
    const model = await this.tireModelRepo.findOne({ where: { id } });
    if (!model) {
      throw new NotFoundException({ message: 'errors.modelNotFound', code: 'NOT_FOUND' });
    }
    const brandId = model.brand_id;
    const count = await this.activeTireListingsCountByModelId(id, undefined);
    if (count > 0) {
      throw new ConflictException({
        message: 'errors.hasActiveListings',
        code: 'HAS_ACTIVE_LISTINGS',
      });
    }
    await this.dataSource.transaction(async (manager) => {
      const m = await manager.findOne(TireModel, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!m) throw new NotFoundException({ message: 'errors.modelNotFound', code: 'NOT_FOUND' });
      m.is_archived = true;
      await manager.save(TireModel, m);
      await this.auditService.log(manager, {
        ...ctx,
        action: 'TIRE_MODEL_ARCHIVE',
        entityType: 'TIRE_MODEL',
        entityId: id,
        after: this.tireModelSnapshot(m),
      });
    });
    await this.invalidateCachesForBrand(brandId);
  }

  async unarchiveTireBrand(id: string, ctx: AuditContext): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const brand = await manager.findOne(TireBrand, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!brand) {
        throw new NotFoundException({ message: 'errors.brandNotFound', code: 'NOT_FOUND' });
      }
      const nameNorm = brand.name_normalized ?? normalizeForComparison(brand.name);
      const other = await manager.findOne(TireBrand, {
        where: { name_normalized: nameNorm, is_archived: false },
      });
      if (other && other.id !== id) {
        throw new ConflictException({
          message: 'errors.brandDuplicateNameActiveExists',
          code: 'DUPLICATE_NAME_ACTIVE_EXISTS',
        });
      }
      brand.is_archived = false;
      await manager.save(TireBrand, brand);
      await this.auditService.log(manager, {
        ...ctx,
        action: 'TIRE_BRAND_UNARCHIVE',
        entityType: 'TIRE_BRAND',
        entityId: id,
        after: this.tireBrandSnapshot(brand),
      });
    });
    await this.invalidateCaches();
  }

  async unarchiveTireModel(id: string, ctx: AuditContext): Promise<void> {
    const brandId = await this.dataSource.transaction(async (manager) => {
      const model = await manager.findOne(TireModel, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!model) {
        throw new NotFoundException({ message: 'errors.modelNotFound', code: 'NOT_FOUND' });
      }
      const nameNorm = model.name_normalized ?? normalizeForComparison(model.name);
      const other = await manager.findOne(TireModel, {
        where: {
          brand_id: model.brand_id,
          name_normalized: nameNorm,
          is_archived: false,
        },
      });
      if (other && other.id !== id) {
        throw new ConflictException({
          message: 'errors.modelDuplicateNameActiveExists',
          code: 'DUPLICATE_NAME_ACTIVE_EXISTS',
        });
      }
      model.is_archived = false;
      await manager.save(TireModel, model);
      await this.auditService.log(manager, {
        ...ctx,
        action: 'TIRE_MODEL_UNARCHIVE',
        entityType: 'TIRE_MODEL',
        entityId: id,
        after: this.tireModelSnapshot(model),
      });
      return model.brand_id;
    });
    await this.invalidateCachesForBrand(brandId);
  }

  private async activeTireListingCountsByBrandIds(
    brandIds: string[],
    tireVehicleType?: TireVehicleType,
  ): Promise<{ brandId: string; cnt: number }[]> {
    if (brandIds.length === 0) return [];
    const qb = this.listingRepo
      .createQueryBuilder('l')
      .innerJoin(Tire, 'tire', 'tire.id = l.tire_id')
      .where('l.status = :status', { status: 'Active' })
      .andWhere('l.category = :cat', { cat: 'tire' })
      .andWhere('tire.brand_id IN (:...ids)', { ids: brandIds });
    if (tireVehicleType) {
      qb.andWhere('tire.tire_vehicle_type = :tvt', { tvt: tireVehicleType });
    }
    return qb
      .select('tire.brand_id', 'brandId')
      .addSelect('COUNT(*)::int', 'cnt')
      .groupBy('tire.brand_id')
      .getRawMany<{ brandId: string; cnt: number }>();
  }

  private async activeTireListingCountsByModelIds(
    modelIds: string[],
    tireVehicleType?: TireVehicleType,
  ): Promise<{ modelId: string; cnt: number }[]> {
    if (modelIds.length === 0) return [];
    const qb = this.listingRepo
      .createQueryBuilder('l')
      .innerJoin(Tire, 'tire', 'tire.id = l.tire_id')
      .where('l.status = :status', { status: 'Active' })
      .andWhere('l.category = :cat', { cat: 'tire' })
      .andWhere('tire.model_id IN (:...ids)', { ids: modelIds });
    if (tireVehicleType) {
      qb.andWhere('tire.tire_vehicle_type = :tvt', { tvt: tireVehicleType });
    }
    return qb
      .select('tire.model_id', 'modelId')
      .addSelect('COUNT(*)::int', 'cnt')
      .groupBy('tire.model_id')
      .getRawMany<{ modelId: string; cnt: number }>();
  }

  private async activeTireListingsCountByBrandId(
    brandId: string,
    tireVehicleType?: TireVehicleType,
  ): Promise<number> {
    const qb = this.listingRepo
      .createQueryBuilder('l')
      .innerJoin(Tire, 'tire', 'tire.id = l.tire_id')
      .where('l.status = :status', { status: 'Active' })
      .andWhere('l.category = :cat', { cat: 'tire' })
      .andWhere('tire.brand_id = :brandId', { brandId });
    if (tireVehicleType) {
      qb.andWhere('tire.tire_vehicle_type = :tvt', { tvt: tireVehicleType });
    }
    const r = await qb.select('COUNT(*)', 'cnt').getRawOne<{ cnt: string }>();
    return parseInt(r?.cnt ?? '0', 10);
  }

  private async activeTireListingsCountByModelId(
    modelId: string,
    tireVehicleType?: TireVehicleType,
  ): Promise<number> {
    const qb = this.listingRepo
      .createQueryBuilder('l')
      .innerJoin(Tire, 'tire', 'tire.id = l.tire_id')
      .where('l.status = :status', { status: 'Active' })
      .andWhere('l.category = :cat', { cat: 'tire' })
      .andWhere('tire.model_id = :modelId', { modelId });
    if (tireVehicleType) {
      qb.andWhere('tire.tire_vehicle_type = :tvt', { tvt: tireVehicleType });
    }
    const r = await qb.select('COUNT(*)', 'cnt').getRawOne<{ cnt: string }>();
    return parseInt(r?.cnt ?? '0', 10);
  }

  private tireBrandSnapshot(b: TireBrand): Record<string, unknown> {
    return {
      id: b.id,
      name: b.name,
      name_normalized: b.name_normalized,
      is_archived: b.is_archived,
    };
  }

  private tireModelSnapshot(m: TireModel): Record<string, unknown> {
    return {
      id: m.id,
      brand_id: m.brand_id,
      name: m.name,
      name_normalized: m.name_normalized,
      is_other: m.is_other,
      is_archived: m.is_archived,
    };
  }

  private toAdminTireBrandDto(
    b: TireBrand,
    models: TireModel[],
    brandCount = 0,
  ): AdminTireBrandDto {
    const modelCountMap = new Map<string, number>();
    return {
      id: b.id,
      name: b.name,
      vehicleTypes: [],
      isArchived: b.is_archived,
      activeListingsCount: brandCount,
      models: models.map((m) => ({
        id: m.id,
        brandId: m.brand_id,
        name: m.name,
        vehicleTypes: [],
        isArchived: m.is_archived,
        activeListingsCount: modelCountMap.get(m.id) ?? 0,
        isOther: m.is_other,
      })),
    };
  }

  private toAdminTireModelDto(m: TireModel, activeListingsCount: number): AdminTireModelDto {
    return {
      id: m.id,
      brandId: m.brand_id,
      name: m.name,
      vehicleTypes: [],
      isArchived: m.is_archived,
      activeListingsCount,
      isOther: m.is_other,
    };
  }

  private async invalidateCaches(): Promise<void> {
    await this.tiresCache.invalidateAll();
    await this.listingCache.invalidateSearch();
  }

  private async invalidateCachesForBrand(brandId: string): Promise<void> {
    await this.tiresCache.invalidateAll();
    await this.tiresCache.invalidateModels(brandId);
    await this.listingCache.invalidateSearch();
  }

  private async invalidateCachesForBrands(brandIds: string[]): Promise<void> {
    await this.tiresCache.invalidateAll();
    for (const id of new Set(brandIds)) {
      await this.tiresCache.invalidateModels(id);
    }
    await this.listingCache.invalidateSearch();
  }
}
