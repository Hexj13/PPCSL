import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { IBrandsCache } from '../brands/application/ports/brands-cache.port';
import { BRANDS_CACHE } from '../brands/application/ports/brands-cache.port';
import { Brand } from '../brands/entities/brand.entity';
import { VehicleModel } from '../brands/entities/vehicle-model.entity';
import { buildPaginationMeta } from '../common/utils/pagination.utils';
import { normalizeForComparison } from '../common/utils/slug.utils';
import { IListingCache } from '../listings/application/ports/listing-cache.port';
import { LISTING_CACHE } from '../listings/application/ports/listing-cache.port';
import { Listing } from '../listings/entities/listing.entity';
import { Vehicle } from '../listings/entities/vehicle.entity';

import { AdminAuditService } from './admin-audit.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { CreateModelDto } from './dto/create-model.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { UpdateModelDto } from './dto/update-model.dto';
export interface AdminBrandDto {
  id: string;
  name: string;
  vehicleTypes: ('car' | 'truck' | 'moto' | 'tire')[];
  isArchived: boolean;
  activeListingsCount: number;
  models: AdminModelDto[];
}

export interface AdminModelDto {
  id: string;
  brandId: string;
  name: string;
  vehicleTypes: ('car' | 'truck' | 'moto' | 'tire')[];
  isArchived: boolean;
  activeListingsCount: number;
}

export interface AuditContext {
  actorUserId: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AdminBrandsModelsService {
  private readonly logger = new Logger(AdminBrandsModelsService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
    @InjectRepository(VehicleModel)
    private readonly modelRepo: Repository<VehicleModel>,
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    private readonly auditService: AdminAuditService,
    @Inject(BRANDS_CACHE)
    private readonly brandsCache: IBrandsCache,
    @Inject(LISTING_CACHE)
    private readonly listingCache: IListingCache,
  ) {}

  async getBrandsModels(
    page: number,
    limit: number,
    query?: string,
    vehicleType?: 'car' | 'truck' | 'moto' | 'tire',
  ): Promise<{
    data: AdminBrandDto[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;
    const qb = this.brandRepo
      .createQueryBuilder('brand')
      .where('brand.is_archived = :archived', { archived: false })
      .orderBy('brand.name', 'ASC');
    if (query && query.trim()) {
      qb.andWhere('brand.name ILIKE :q', { q: `%${query.trim()}%` });
    }
    if (vehicleType) {
      qb.andWhere(
        `(brand.vehicle_types IS NOT NULL AND (brand.vehicle_types::text LIKE :pattern1 OR brand.vehicle_types::text LIKE :pattern2 OR brand.vehicle_types::text LIKE :pattern3 OR brand.vehicle_types::text = :vehicleType)) OR EXISTS (SELECT 1 FROM vehicle_models vm WHERE vm.brand_id = brand.id AND vm.is_archived = false AND (vm.vehicle_types::text LIKE :pattern1 OR vm.vehicle_types::text LIKE :pattern2 OR vm.vehicle_types::text LIKE :pattern3 OR vm.vehicle_types::text = :vehicleType))`,
        {
          vehicleType,
          pattern1: `%,${vehicleType},%`,
          pattern2: `${vehicleType},%`,
          pattern3: `%,${vehicleType}`,
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
    const models = await this.modelRepo.find({
      where: { brand_id: In(brandIds), is_archived: false },
      order: { name: 'ASC' },
    });
    const brandCounts = await this.listingRepo
      .createQueryBuilder('l')
      .innerJoin(Vehicle, 'v', 'v.id = l.vehicle_id')
      .where('l.status = :status', { status: 'Active' })
      .andWhere('v.brand_id IN (:...ids)', { ids: brandIds })
      .select('v.brand_id', 'brandId')
      .addSelect('COUNT(*)::int', 'cnt')
      .groupBy('v.brand_id')
      .getRawMany<{ brandId: string; cnt: number }>();
    const modelIds = models.map((m) => m.id);
    const modelCounts =
      modelIds.length > 0
        ? await this.listingRepo
            .createQueryBuilder('l')
            .innerJoin(Vehicle, 'v', 'v.id = l.vehicle_id')
            .where('l.status = :status', { status: 'Active' })
            .andWhere('v.model_id IN (:...ids)', { ids: modelIds })
            .select('v.model_id', 'modelId')
            .addSelect('COUNT(*)::int', 'cnt')
            .groupBy('v.model_id')
            .getRawMany<{ modelId: string; cnt: number }>()
        : [];
    const brandCountMap = new Map(brandCounts.map((r) => [r.brandId, r.cnt]));
    const modelCountMap = new Map(modelCounts.map((r) => [r.modelId, r.cnt]));
    const modelsByBrand = new Map<string, VehicleModel[]>();
    for (const m of models) {
      const list = modelsByBrand.get(m.brand_id) ?? [];
      list.push(m);
      modelsByBrand.set(m.brand_id, list);
    }
    const data: AdminBrandDto[] = brands.map((b) => ({
      id: b.id,
      name: b.name,
      vehicleTypes: (b.vehicle_types ?? []) as ('car' | 'truck' | 'moto' | 'tire')[],
      isArchived: b.is_archived,
      activeListingsCount: brandCountMap.get(b.id) ?? 0,
      models: (modelsByBrand.get(b.id) ?? [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
        .map((m) => ({
          id: m.id,
          brandId: m.brand_id,
          name: m.name,
          vehicleTypes: (m.vehicle_types ?? []) as ('car' | 'truck' | 'moto' | 'tire')[],
          isArchived: m.is_archived,
          activeListingsCount: modelCountMap.get(m.id) ?? 0,
        })),
    }));
    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async createBrand(dto: CreateBrandDto, ctx: AuditContext): Promise<AdminBrandDto> {
    const name = dto.name.trim();
    const nameNormalized = normalizeForComparison(name);
    const result = await this.dataSource.transaction(async (manager) => {
      const existing = await manager.findOne(Brand, {
        where: { name_normalized: nameNormalized, is_archived: false },
      });
      if (existing) {
        throw new ConflictException({
          message: 'errors.brandDuplicateName',
          code: 'DUPLICATE_NAME',
        });
      }
      const brand = manager.create(Brand, {
        name,
        name_normalized: nameNormalized,
        vehicle_types: dto.vehicleTypes,
        is_archived: false,
      });
      const saved = await manager.save(Brand, brand).catch((err: { code?: string }) => {
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
        action: 'BRAND_CREATE',
        entityType: 'BRAND',
        entityId: saved.id,
        after: this.brandSnapshot(saved),
      });
      return this.toAdminBrandDto(saved, []);
    });
    await this.invalidateCaches();
    this.logger.log(
      JSON.stringify({
        event: 'admin_brand_created',
        brandId: result.id,
        name: result.name,
        vehicleTypes: result.vehicleTypes,
        actorUserId: ctx.actorUserId,
      }),
    );
    return result;
  }

  async updateBrand(id: string, dto: UpdateBrandDto, ctx: AuditContext): Promise<AdminBrandDto> {
    return this.dataSource.transaction(async (manager) => {
      const brand = await manager.findOne(Brand, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!brand) {
        throw new NotFoundException({ message: 'errors.brandNotFound', code: 'NOT_FOUND' });
      }
      const before = this.brandSnapshot(brand);
      if (dto.name !== undefined) {
        const name = dto.name.trim();
        const nameNormalized = normalizeForComparison(name);
        const other = await manager.findOne(Brand, {
          where: { name_normalized: nameNormalized, is_archived: false },
        });
        if (other && other.id !== id) {
          throw new ConflictException({
            message: 'errors.brandDuplicateName',
            code: 'DUPLICATE_NAME',
          });
        }
        brand.name = name;
        brand.name_normalized = nameNormalized;
      }
      const prevTypes = (brand.vehicle_types ?? []) as string[];
      if (dto.vehicleTypes !== undefined) {
        const removed = prevTypes.filter(
          (t) => !dto.vehicleTypes!.includes(t as 'car' | 'truck' | 'moto' | 'tire'),
        );
        if (removed.length > 0) {
          const brandModels = await manager.find(VehicleModel, { where: { brand_id: id } });
          const newTypes = dto.vehicleTypes;
          for (const m of brandModels) {
            const types = (m.vehicle_types ?? []).filter((t) => !removed.includes(t));
            m.vehicle_types =
              types.length > 0
                ? types
                : newTypes.length > 0
                  ? [newTypes[0]]
                  : (m.vehicle_types ?? []);
            await manager.save(VehicleModel, m);
          }
        }
        brand.vehicle_types = dto.vehicleTypes;
      }
      await manager.save(Brand, brand).catch((err: { code?: string }) => {
        if (err?.code === '23505') {
          throw new ConflictException({
            message: 'errors.brandDuplicateName',
            code: 'DUPLICATE_NAME',
          });
        }
        throw err;
      });
      const after = this.brandSnapshot(brand);
      await this.auditService.log(manager, {
        ...ctx,
        action: 'BRAND_UPDATE',
        entityType: 'BRAND',
        entityId: id,
        before,
        after,
      });
      const models = await manager.find(VehicleModel, {
        where: { brand_id: id, is_archived: false },
        order: { name: 'ASC' },
      });
      await this.invalidateCaches();
      return this.toAdminBrandDto(brand, models);
    });
  }

  async createModel(dto: CreateModelDto, ctx: AuditContext): Promise<AdminModelDto> {
    const brand = await this.brandRepo.findOne({ where: { id: dto.brandId } });
    if (!brand) {
      throw new NotFoundException({ message: 'errors.brandNotFound', code: 'NOT_FOUND' });
    }
    if (brand.is_archived) {
      throw new BadRequestException({ message: 'errors.brandNotFound', code: 'NOT_FOUND' });
    }
    const brandTypes = (brand.vehicle_types ?? []) as string[];
    for (const t of dto.vehicleTypes) {
      if (!brandTypes.includes(t)) {
        throw new BadRequestException({
          message: 'errors.modelCategoryOutsideBrand',
          code: 'VALIDATION_ERROR',
        });
      }
    }
    const name = dto.name.trim();
    const nameNormalized = normalizeForComparison(name);
    const existing = await this.modelRepo.findOne({
      where: { brand_id: dto.brandId, name_normalized: nameNormalized, is_archived: false },
    });
    if (existing) {
      throw new ConflictException({
        message: 'errors.modelDuplicateName',
        code: 'DUPLICATE_NAME',
      });
    }
    const result = await this.dataSource.transaction(async (manager) => {
      const model = manager.create(VehicleModel, {
        brand_id: dto.brandId,
        name,
        name_normalized: nameNormalized,
        vehicle_types: dto.vehicleTypes,
        is_archived: false,
      });
      const saved = await manager.save(VehicleModel, model).catch((err: { code?: string }) => {
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
        action: 'MODEL_CREATE',
        entityType: 'MODEL',
        entityId: saved.id,
        after: this.modelSnapshot(saved),
      });
      return this.toAdminModelDto(saved, 0);
    });
    await this.invalidateCaches();
    this.logger.log(
      JSON.stringify({
        event: 'admin_model_created',
        modelId: result.id,
        brandId: result.brandId,
        name: result.name,
        vehicleTypes: result.vehicleTypes,
        actorUserId: ctx.actorUserId,
      }),
    );
    return result;
  }

  async updateModel(id: string, dto: UpdateModelDto, ctx: AuditContext): Promise<AdminModelDto> {
    return this.dataSource.transaction(async (manager) => {
      const model = await manager.findOne(VehicleModel, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!model) {
        throw new NotFoundException({ message: 'errors.modelNotFound', code: 'NOT_FOUND' });
      }
      const before = this.modelSnapshot(model);
      if (dto.brandId !== undefined && dto.brandId !== model.brand_id) {
        const newBrand = await manager.findOne(Brand, { where: { id: dto.brandId } });
        if (!newBrand || newBrand.is_archived) {
          throw new NotFoundException({ message: 'errors.brandNotFound', code: 'NOT_FOUND' });
        }
        model.brand_id = dto.brandId;
        if (dto.vehicleTypes !== undefined) {
          const bt = (newBrand.vehicle_types ?? []) as string[];
          for (const t of dto.vehicleTypes) {
            if (!bt.includes(t)) {
              throw new BadRequestException({
                message: 'errors.modelCategoryOutsideBrand',
                code: 'VALIDATION_ERROR',
              });
            }
          }
        }
      } else if (dto.vehicleTypes !== undefined) {
        const brand = await manager.findOne(Brand, { where: { id: model.brand_id } });
        if (!brand) {
          throw new NotFoundException({ message: 'errors.brandNotFound', code: 'NOT_FOUND' });
        }
        const brandTypes = (brand.vehicle_types ?? []) as string[];
        for (const t of dto.vehicleTypes) {
          if (!brandTypes.includes(t)) {
            throw new BadRequestException({
              message: 'errors.modelCategoryOutsideBrand',
              code: 'VALIDATION_ERROR',
            });
          }
        }
      }
      if (dto.name !== undefined) {
        const name = dto.name.trim();
        model.name = name;
        model.name_normalized = normalizeForComparison(name);
      }
      if (dto.vehicleTypes !== undefined) model.vehicle_types = dto.vehicleTypes;
      const nameNormalized = model.name_normalized ?? normalizeForComparison(model.name);
      const other = await manager.findOne(VehicleModel, {
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
      await manager.save(VehicleModel, model).catch((err: { code?: string }) => {
        if (err?.code === '23505') {
          throw new ConflictException({
            message: 'errors.modelDuplicateName',
            code: 'DUPLICATE_NAME',
          });
        }
        throw err;
      });
      const after = this.modelSnapshot(model);
      await this.auditService.log(manager, {
        ...ctx,
        action: 'MODEL_UPDATE',
        entityType: 'MODEL',
        entityId: id,
        before,
        after,
      });
      await this.invalidateCaches();
      return this.toAdminModelDto(model, 0);
    });
  }

  async archiveBrand(id: string, ctx: AuditContext): Promise<void> {
    const brand = await this.brandRepo.findOne({ where: { id } });
    if (!brand) {
      throw new NotFoundException({ message: 'errors.brandNotFound', code: 'NOT_FOUND' });
    }
    const brandCount = await this.activeListingsCountByBrand(id);
    if (brandCount > 0) {
      throw new ConflictException({
        message: 'errors.hasActiveListings',
        code: 'HAS_ACTIVE_LISTINGS',
      });
    }
    const models = await this.modelRepo.find({ where: { brand_id: id } });
    for (const m of models) {
      const c = await this.activeListingsCountByModel(m.id);
      if (c > 0) {
        throw new ConflictException({
          message: 'errors.hasActiveListings',
          code: 'HAS_ACTIVE_LISTINGS',
        });
      }
    }
    return this.dataSource.transaction(async (manager) => {
      const b = await manager.findOne(Brand, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!b) throw new NotFoundException({ message: 'errors.brandNotFound', code: 'NOT_FOUND' });
      b.is_archived = true;
      await manager.save(Brand, b);
      await manager.update(VehicleModel, { brand_id: id }, { is_archived: true });
      await this.auditService.log(manager, {
        ...ctx,
        action: 'BRAND_ARCHIVE',
        entityType: 'BRAND',
        entityId: id,
        after: this.brandSnapshot(b),
      });
      const updatedModels = await manager.find(VehicleModel, { where: { brand_id: id } });
      for (const m of updatedModels) {
        await this.auditService.log(manager, {
          ...ctx,
          action: 'MODEL_ARCHIVE',
          entityType: 'MODEL',
          entityId: m.id,
          after: this.modelSnapshot(m),
        });
      }
      await this.invalidateCaches();
    });
  }

  async archiveModel(id: string, ctx: AuditContext): Promise<void> {
    const model = await this.modelRepo.findOne({ where: { id } });
    if (!model) {
      throw new NotFoundException({ message: 'errors.modelNotFound', code: 'NOT_FOUND' });
    }
    const count = await this.activeListingsCountByModel(id);
    if (count > 0) {
      throw new ConflictException({
        message: 'errors.hasActiveListings',
        code: 'HAS_ACTIVE_LISTINGS',
      });
    }
    return this.dataSource.transaction(async (manager) => {
      const m = await manager.findOne(VehicleModel, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!m) throw new NotFoundException({ message: 'errors.modelNotFound', code: 'NOT_FOUND' });
      m.is_archived = true;
      await manager.save(VehicleModel, m);
      await this.auditService.log(manager, {
        ...ctx,
        action: 'MODEL_ARCHIVE',
        entityType: 'MODEL',
        entityId: id,
        after: this.modelSnapshot(m),
      });
      await this.invalidateCaches();
    });
  }

  async unarchiveBrand(id: string, ctx: AuditContext): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const brand = await manager.findOne(Brand, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!brand) {
        throw new NotFoundException({ message: 'errors.brandNotFound', code: 'NOT_FOUND' });
      }
      const nameNorm = brand.name_normalized ?? normalizeForComparison(brand.name);
      const other = await manager.findOne(Brand, {
        where: { name_normalized: nameNorm, is_archived: false },
      });
      if (other && other.id !== id) {
        throw new ConflictException({
          message: 'errors.brandDuplicateNameActiveExists',
          code: 'DUPLICATE_NAME_ACTIVE_EXISTS',
        });
      }
      brand.is_archived = false;
      await manager.save(Brand, brand);
      await this.auditService.log(manager, {
        ...ctx,
        action: 'BRAND_UNARCHIVE',
        entityType: 'BRAND',
        entityId: id,
        after: this.brandSnapshot(brand),
      });
      await this.invalidateCaches();
    });
  }

  async unarchiveModel(id: string, ctx: AuditContext): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const model = await manager.findOne(VehicleModel, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!model) {
        throw new NotFoundException({ message: 'errors.modelNotFound', code: 'NOT_FOUND' });
      }
      const nameNorm = model.name_normalized ?? normalizeForComparison(model.name);
      const other = await manager.findOne(VehicleModel, {
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
      await manager.save(VehicleModel, model);
      await this.auditService.log(manager, {
        ...ctx,
        action: 'MODEL_UNARCHIVE',
        entityType: 'MODEL',
        entityId: id,
        after: this.modelSnapshot(model),
      });
      await this.invalidateCaches();
    });
  }

  private async activeListingsCountByBrand(brandId: string): Promise<number> {
    const r = await this.listingRepo
      .createQueryBuilder('l')
      .innerJoin(Vehicle, 'v', 'v.id = l.vehicle_id')
      .where('l.status = :status', { status: 'Active' })
      .andWhere('v.brand_id = :brandId', { brandId })
      .select('COUNT(*)', 'cnt')
      .getRawOne<{ cnt: string }>();
    return parseInt(r?.cnt ?? '0', 10);
  }

  private async activeListingsCountByModel(modelId: string): Promise<number> {
    const r = await this.listingRepo
      .createQueryBuilder('l')
      .innerJoin(Vehicle, 'v', 'v.id = l.vehicle_id')
      .where('l.status = :status', { status: 'Active' })
      .andWhere('v.model_id = :modelId', { modelId })
      .select('COUNT(*)', 'cnt')
      .getRawOne<{ cnt: string }>();
    return parseInt(r?.cnt ?? '0', 10);
  }

  private brandSnapshot(b: Brand): Record<string, unknown> {
    return {
      id: b.id,
      name: b.name,
      name_normalized: b.name_normalized,
      vehicle_types: b.vehicle_types,
      is_archived: b.is_archived,
    };
  }

  private modelSnapshot(m: VehicleModel): Record<string, unknown> {
    return {
      id: m.id,
      brand_id: m.brand_id,
      name: m.name,
      name_normalized: m.name_normalized,
      vehicle_types: m.vehicle_types,
      is_archived: m.is_archived,
    };
  }

  private toAdminBrandDto(b: Brand, models: VehicleModel[], brandCount = 0): AdminBrandDto {
    const modelCountMap = new Map<string, number>();
    return {
      id: b.id,
      name: b.name,
      vehicleTypes: (b.vehicle_types ?? []) as ('car' | 'truck' | 'moto' | 'tire')[],
      isArchived: b.is_archived,
      activeListingsCount: brandCount,
      models: models.map((m) => ({
        id: m.id,
        brandId: m.brand_id,
        name: m.name,
        vehicleTypes: (m.vehicle_types ?? []) as ('car' | 'truck' | 'moto' | 'tire')[],
        isArchived: m.is_archived,
        activeListingsCount: modelCountMap.get(m.id) ?? 0,
      })),
    };
  }

  private toAdminModelDto(m: VehicleModel, activeListingsCount: number): AdminModelDto {
    return {
      id: m.id,
      brandId: m.brand_id,
      name: m.name,
      vehicleTypes: (m.vehicle_types ?? []) as ('car' | 'truck' | 'moto' | 'tire')[],
      isArchived: m.is_archived,
      activeListingsCount,
    };
  }

  private async invalidateCaches(): Promise<void> {
    await this.brandsCache.invalidateAll();
    await this.listingCache.invalidateSearch();
  }
}
