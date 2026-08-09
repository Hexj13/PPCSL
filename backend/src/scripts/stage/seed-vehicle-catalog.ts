import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';

import { ConfigService } from '@nestjs/config';

import { Repository } from 'typeorm';

import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { RedisService } from '../../common/redis.service';
import { CACHE_PREFIXES } from '../../common/utils/cache.utils';
import { normalizeForComparison } from '../../common/utils/slug.utils';
import { AppDataSource } from '../../data-source';
import type {
  VehicleCatalog,
  VehicleCatalogBrand,
  VehicleCatalogVehicleType,
} from '../data/vehicle-catalog.types';
import { VEHICLE_CATALOG_FILENAME } from '../data/vehicle-catalog.types';
import { checkEnvironment, checkPlatform } from '../script-guard';

checkEnvironment(['production', 'stage', 'development', 'test']);
checkPlatform(['md', 'al', 'common']);

const DELAY_BETWEEN_BRANDS_MS = 150;
const MODEL_BATCH_SIZE = 25;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function forceGarbageCollection(): void {
  if (global.gc) {
    global.gc();
  }
}

function loadCatalog(): VehicleCatalog {
  const catalogPath = path.join(__dirname, '..', 'data', VEHICLE_CATALOG_FILENAME);
  if (!fs.existsSync(catalogPath)) {
    throw new Error(
      `Catalog file not found: ${catalogPath}. Run: npm run export:vehicle-catalog`,
    );
  }
  const raw = fs.readFileSync(catalogPath, 'utf8');
  const catalog = JSON.parse(raw) as VehicleCatalog;
  if (!catalog || catalog.version !== 1 || !Array.isArray(catalog.brands)) {
    throw new Error(`Invalid catalog format in ${catalogPath}`);
  }
  return catalog;
}

function normalizeTypes(
  types: VehicleCatalogVehicleType[] | undefined,
): VehicleCatalogVehicleType[] {
  if (!Array.isArray(types) || types.length === 0) {
    return ['car'];
  }
  return types;
}

async function clearBrandsCache(): Promise<void> {
  try {
    const configService = new ConfigService();
    const redisService = new RedisService(configService);
    await redisService.onModuleInit();
    await redisService.invalidateByPrefix(CACHE_PREFIXES.brands);
    await redisService.invalidateByPrefix(CACHE_PREFIXES.brandsModels);
    await redisService.onModuleDestroy();
    console.log('🧹 Brands Redis cache cleared');
  } catch {
    console.warn('⚠️  Cache cannot be cleared (Redis not available)');
  }
}

async function upsertBrand(
  brandRepo: Repository<Brand>,
  entry: VehicleCatalogBrand,
): Promise<{ brand: Brand; created: boolean }> {
  const nameNormalized = normalizeForComparison(entry.name);
  let brand =
    (await brandRepo.findOne({ where: { name_normalized: nameNormalized, is_archived: false } })) ||
    (await brandRepo.findOne({ where: { name: entry.name } }));

  if (!brand) {
    brand = brandRepo.create({
      name: entry.name,
      name_normalized: nameNormalized,
      order: entry.order,
      vehicle_types: normalizeTypes(entry.vehicle_types),
      is_archived: false,
    });
    brand = await brandRepo.save(brand);
    return { brand, created: true };
  }

  brand.name = entry.name;
  brand.name_normalized = nameNormalized;
  brand.order = entry.order;
  brand.vehicle_types = normalizeTypes(entry.vehicle_types);
  brand.is_archived = false;
  brand = await brandRepo.save(brand);
  return { brand, created: false };
}

async function upsertModelsForBrand(
  modelRepo: Repository<VehicleModel>,
  brand: Brand,
  entry: VehicleCatalogBrand,
): Promise<{ created: number; updated: number }> {
  const existingModels = await modelRepo.find({
    where: { brand_id: brand.id },
    select: ['id', 'name', 'name_normalized', 'order', 'vehicle_types', 'is_archived', 'brand_id'],
  });

  const byNormalized = new Map<string, VehicleModel>();
  const byNameLower = new Map<string, VehicleModel>();
  for (const model of existingModels) {
    const normalized = model.name_normalized || normalizeForComparison(model.name);
    byNormalized.set(normalized, model);
    byNameLower.set(model.name.toLowerCase(), model);
  }

  const toCreate: VehicleModel[] = [];
  const toUpdate: VehicleModel[] = [];
  let created = 0;
  let updated = 0;

  for (const modelEntry of entry.models) {
    const nameNormalized = normalizeForComparison(modelEntry.name);
    const existing =
      byNormalized.get(nameNormalized) || byNameLower.get(modelEntry.name.toLowerCase());

    if (!existing) {
      const model = modelRepo.create({
        name: modelEntry.name,
        name_normalized: nameNormalized,
        brand_id: brand.id,
        order: modelEntry.order,
        vehicle_types: normalizeTypes(modelEntry.vehicle_types),
        is_archived: false,
      });
      toCreate.push(model);
      created++;
      continue;
    }

    existing.name = modelEntry.name;
    existing.name_normalized = nameNormalized;
    existing.order = modelEntry.order;
    existing.vehicle_types = normalizeTypes(modelEntry.vehicle_types);
    existing.is_archived = false;
    toUpdate.push(existing);
    updated++;
  }

  for (let i = 0; i < toCreate.length; i += MODEL_BATCH_SIZE) {
    await modelRepo.save(toCreate.slice(i, i + MODEL_BATCH_SIZE));
    await delay(40);
  }
  for (let i = 0; i < toUpdate.length; i += MODEL_BATCH_SIZE) {
    await modelRepo.save(toUpdate.slice(i, i + MODEL_BATCH_SIZE));
    await delay(40);
  }

  return { created, updated };
}

export async function seedVehicleCatalog(): Promise<{
  brandsProcessed: number;
  brandsCreated: number;
  modelsCreated: number;
  modelsUpdated: number;
}> {
  if (!process.env.DB_SYNC) {
    process.env.DB_SYNC = 'false';
  }

  const catalog = loadCatalog();
  console.log(
    `🌱 Seeding vehicle catalog (${catalog.brands.length} brands from ${catalog.source}, exported ${catalog.exportedAt})`,
  );

  await AppDataSource.initialize();
  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  let brandsCreated = 0;
  let modelsCreated = 0;
  let modelsUpdated = 0;

  for (let idx = 0; idx < catalog.brands.length; idx++) {
    const entry = catalog.brands[idx];
    const { brand, created } = await upsertBrand(brandRepo, entry);
    if (created) {
      brandsCreated++;
    }

    const modelStats = await upsertModelsForBrand(modelRepo, brand, entry);
    modelsCreated += modelStats.created;
    modelsUpdated += modelStats.updated;

    if ((idx + 1) % 25 === 0 || idx === catalog.brands.length - 1) {
      console.log(`   … ${idx + 1}/${catalog.brands.length} brands`);
    }

    if (idx < catalog.brands.length - 1) {
      await delay(DELAY_BETWEEN_BRANDS_MS);
    }
    if ((idx + 1) % 40 === 0) {
      forceGarbageCollection();
    }
  }

  const totalBrands = await brandRepo.count();
  const totalModels = await modelRepo.count();
  console.log(
    `📊 Done: processed ${catalog.brands.length} catalog brands (created ${brandsCreated}); models created ${modelsCreated}, updated ${modelsUpdated}`,
  );
  console.log(`📊 DB totals: ${totalBrands} brands, ${totalModels} models`);

  await clearBrandsCache();
  await AppDataSource.destroy();

  return {
    brandsProcessed: catalog.brands.length,
    brandsCreated,
    modelsCreated,
    modelsUpdated,
  };
}

if (require.main === module) {
  seedVehicleCatalog()
    .then(() => {
      console.log('\n✅ Complete');
      process.exit(0);
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`\n❌ Error: ${message}`);
      process.exit(1);
    });
}
