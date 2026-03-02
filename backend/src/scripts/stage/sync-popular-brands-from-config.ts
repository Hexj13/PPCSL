import * as fs from 'fs';
import * as path from 'path';

import { ConfigService } from '@nestjs/config';

import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { RedisService } from '../../common/redis.service';
import { CACHE_PREFIXES } from '../../common/utils/cache.utils';
import { AppDataSource } from '../../data-source';
import { checkEnvironment, checkPlatform } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);
checkPlatform(['md']);

const PLATFORM_CONFIG_PATH = path.join(__dirname, '../../../../../config');

type PopularJson = {
  market: string;
  segment: string;
  brands: Array<{
    brand: string;
    top_models: Array<{ model: string; most_popular: boolean }>;
  }>;
};

function loadPopularJson(filename: string): PopularJson | null {
  const filePath = path.join(PLATFORM_CONFIG_PATH, filename);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(raw) as PopularJson;
  } catch {
    return null;
  }
}

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/-/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function segmentToVehicleType(segment: string): 'car' | 'truck' | 'moto' {
  if (segment === 'commercial_transport_used') return 'truck';
  if (segment === 'motorcycles_used') return 'moto';
  return 'car';
}

function findBrand(brandsByName: Map<string, Brand>, brandName: string): Brand | null {
  return (
    brandsByName.get(normalizeForMatch(brandName)) ??
    brandsByName.get(brandName.toLowerCase()) ??
    null
  );
}

function findModel(modelMap: Map<string, VehicleModel>, modelName: string): VehicleModel | null {
  return (
    modelMap.get(normalizeForMatch(modelName)) ?? modelMap.get(modelName.toLowerCase()) ?? null
  );
}

async function run() {
  await AppDataSource.initialize();

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  const allBrands = await brandRepo.find({ select: ['id', 'name', 'order', 'vehicle_types'] });
  const brandsByName = new Map<string, Brand>();
  for (const b of allBrands) {
    brandsByName.set(normalizeForMatch(b.name), b);
    brandsByName.set(b.name.toLowerCase(), b);
  }

  const modelsByBrandId = new Map<string, Map<string, VehicleModel>>();

  const files: Array<{ file: string; segment: string }> = [
    { file: 'popular-brands.json', segment: 'used_cars' },
    { file: 'popular-brands-truck.json', segment: 'commercial_transport_used' },
    { file: 'popular-brands-moto.json', segment: 'motorcycles_used' },
  ];

  let maxBrandOrder = allBrands.length > 0 ? Math.max(...allBrands.map((b) => b.order ?? 0)) : 0;
  let brandsAdded = 0;
  let modelsAdded = 0;

  for (const { file, segment } of files) {
    const data = loadPopularJson(file);
    if (!data || !Array.isArray(data.brands)) continue;

    const vehicleType = segmentToVehicleType(segment);
    console.log(`\n📂 ${file} (${vehicleType})`);

    for (const item of data.brands) {
      const brandName = item.brand.trim();
      let brand = findBrand(brandsByName, brandName);

      if (!brand) {
        maxBrandOrder += 1;
        brand = brandRepo.create({
          name: brandName,
          order: maxBrandOrder,
          vehicle_types: [vehicleType],
        });
        brand = await brandRepo.save(brand);
        allBrands.push(brand);
        brandsByName.set(normalizeForMatch(brand.name), brand);
        brandsByName.set(brand.name.toLowerCase(), brand);
        brandsAdded++;
        console.log(`  ✅ Brand: ${brandName}`);
      } else {
        const types = brand.vehicle_types ?? [];
        if (!types.includes(vehicleType)) {
          brand.vehicle_types = [...types, vehicleType].sort();
          brand = await brandRepo.save(brand);
          const idx = allBrands.findIndex((b) => b.id === brand!.id);
          if (idx >= 0) allBrands[idx] = brand;
        }
      }

      let modelMap = modelsByBrandId.get(brand.id);
      if (!modelMap) {
        modelMap = new Map();
        modelsByBrandId.set(brand.id, modelMap);
      }

      const existingModels = await modelRepo.find({
        where: { brand_id: brand.id },
        select: ['id', 'name', 'order', 'vehicle_types'],
      });
      for (const m of existingModels) {
        modelMap.set(normalizeForMatch(m.name), m);
        modelMap.set(m.name.toLowerCase(), m);
      }

      let maxOrder =
        existingModels.length > 0 ? Math.max(...existingModels.map((m) => m.order ?? 0)) : 0;

      for (const top of item.top_models) {
        const modelName = top.model.trim();
        const found = findModel(modelMap, modelName);

        if (!found) {
          maxOrder += 1;
          const model = modelRepo.create({
            name: modelName,
            brand_id: brand.id,
            order: maxOrder,
            vehicle_types: [vehicleType],
          });
          const saved = await modelRepo.save(model);
          modelMap.set(normalizeForMatch(modelName), saved);
          modelMap.set(modelName.toLowerCase(), saved);
          modelsAdded++;
          console.log(`     + ${modelName}`);
        }
      }
    }
  }

  if (brandsAdded > 0 || modelsAdded > 0) {
    console.log('\n🗑️  Clearing brands/models Redis cache...');
    try {
      const configService = new ConfigService();
      const redisService = new RedisService(configService);
      await redisService.onModuleInit();
      const deletedBrands = await redisService.invalidateByPrefix(CACHE_PREFIXES.brands);
      const deletedModels = await redisService.invalidateByPrefix(CACHE_PREFIXES.brandsModels);
      await redisService.onModuleDestroy();
      console.log(`   ✅ Cleared ${deletedBrands} brand + ${deletedModels} model cache entries.`);
    } catch (err) {
      console.warn('   ⚠️  Could not clear Redis cache:', (err as Error).message);
    }
  }

  await AppDataSource.destroy();

  console.log('\n---');
  if (brandsAdded > 0 || modelsAdded > 0) {
    console.log(`Done. Added: ${brandsAdded} brand(s), ${modelsAdded} model(s).`);
  } else {
    console.log('All popular brands and models from config JSON already exist in the database.');
  }
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
