import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';

import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { RedisService } from '../../common/redis.service';
import { CACHE_PREFIXES } from '../../common/utils/cache.utils';
import { normalizeForComparison } from '../../common/utils/slug.utils';
import { AppDataSource } from '../../data-source';
import { Vehicle } from '../../listings/entities/vehicle.entity';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);

const CORRECT_BRAND_NAMES: Record<string, string> = {
  citroen: 'Citroën',
  skoda: 'Škoda',
  mini: 'MINI',
  bmw: 'BMW',
  seat: 'SEAT',
  mg: 'MG',
  byd: 'BYD',
  ds: 'DS Automobiles',
  mercedesbenz: 'Mercedes-Benz',
  alfaromeo: 'Alfa Romeo',
  landrover: 'Land Rover',
  rangerover: 'Range Rover',
  astonmartin: 'Aston Martin',
  rollsroyce: 'Rolls-Royce',
  greatwall: 'Great Wall',
  lynkco: 'Lynk & Co',
};

async function fixBrandDuplicates() {
  console.log('🔧 Fixing brand duplicates with diacritics...\n');

  await AppDataSource.initialize();
  console.log('✅ Connected to database\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);

  const allBrands = await brandRepo.find({
    relations: ['models'],
    order: { name: 'ASC' },
  });

  console.log(`📊 Found ${allBrands.length} brands in database\n`);

  const brandGroups = new Map<string, Brand[]>();

  for (const brand of allBrands) {
    const normalized = normalizeForComparison(brand.name);
    if (!brandGroups.has(normalized)) {
      brandGroups.set(normalized, []);
    }
    brandGroups.get(normalized)!.push(brand);
  }

  let duplicatesFixed = 0;
  let modelsReassigned = 0;
  let vehiclesReassigned = 0;

  for (const [normalizedName, brands] of brandGroups.entries()) {
    if (brands.length > 1) {
      console.log(`\n⚠️  Found duplicate: "${brands.map((b) => b.name).join('" vs "')}"`);

      const correctName = CORRECT_BRAND_NAMES[normalizedName];
      let primaryBrand: Brand;

      if (correctName) {
        primaryBrand = brands.find((b) => b.name === correctName) || brands[0];
        console.log(`   📌 Correct name: "${correctName}"`);
      } else {
        primaryBrand = brands.reduce((a, b) => {
          const aHasDiacritics = a.name !== a.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const bHasDiacritics = b.name !== b.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (aHasDiacritics && !bHasDiacritics) return a;
          if (!aHasDiacritics && bHasDiacritics) return b;
          const aModelCount = a.models?.length || 0;
          const bModelCount = b.models?.length || 0;
          return aModelCount >= bModelCount ? a : b;
        });
      }

      console.log(`   ✅ Keeping: "${primaryBrand.name}" (ID: ${primaryBrand.id})`);

      for (const duplicateBrand of brands) {
        if (duplicateBrand.id === primaryBrand.id) continue;

        console.log(`   🗑️  Merging: "${duplicateBrand.name}" (ID: ${duplicateBrand.id})`);

        const models = await modelRepo.find({ where: { brand_id: duplicateBrand.id } });
        for (const model of models) {
          const existingModel = await modelRepo.findOne({
            where: { brand_id: primaryBrand.id, name: model.name },
          });

          if (existingModel) {
            const vehiclesWithModel = await vehicleRepo.find({ where: { model_id: model.id } });
            for (const vehicle of vehiclesWithModel) {
              await vehicleRepo.update(vehicle.id, { model_id: existingModel.id });
              vehiclesReassigned++;
            }
            await modelRepo.remove(model);
          } else {
            await modelRepo.update(model.id, { brand_id: primaryBrand.id });
            modelsReassigned++;
          }
        }

        const vehiclesWithBrand = await vehicleRepo.find({
          where: { brand_id: duplicateBrand.id },
        });
        for (const vehicle of vehiclesWithBrand) {
          await vehicleRepo.update(vehicle.id, { brand_id: primaryBrand.id });
          vehiclesReassigned++;
        }

        await brandRepo.remove(duplicateBrand);
        duplicatesFixed++;
        console.log(`      ✅ Deleted duplicate brand`);
      }

      if (correctName && primaryBrand.name !== correctName) {
        console.log(`   📝 Renaming "${primaryBrand.name}" → "${correctName}"`);
        primaryBrand.name = correctName;
        await brandRepo.save(primaryBrand);
      }
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   - Duplicate brands fixed: ${duplicatesFixed}`);
  console.log(`   - Models reassigned: ${modelsReassigned}`);
  console.log(`   - Vehicles reassigned: ${vehiclesReassigned}`);

  console.log('\n🔍 Checking for model duplicates within brands...\n');

  const allBrandsAfter = await brandRepo.find();
  let modelDuplicatesFixed = 0;

  for (const brand of allBrandsAfter) {
    const models = await modelRepo.find({
      where: { brand_id: brand.id },
      order: { order: 'ASC' },
    });

    const modelGroups = new Map<string, VehicleModel[]>();
    for (const model of models) {
      const normalized = normalizeForComparison(model.name);
      if (!modelGroups.has(normalized)) {
        modelGroups.set(normalized, []);
      }
      modelGroups.get(normalized)!.push(model);
    }

    for (const [, modelList] of modelGroups.entries()) {
      if (modelList.length > 1) {
        console.log(
          `⚠️  "${brand.name}" has duplicate models: "${modelList.map((m) => m.name).join('" vs "')}"`,
        );

        const primaryModel = modelList.reduce((a, b) => {
          const aHasDiacritics = a.name !== a.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const bHasDiacritics = b.name !== b.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (aHasDiacritics && !bHasDiacritics) return a;
          if (!aHasDiacritics && bHasDiacritics) return b;
          return a.order <= b.order ? a : b;
        });

        for (const duplicate of modelList) {
          if (duplicate.id === primaryModel.id) continue;

          const vehiclesWithModel = await vehicleRepo.find({ where: { model_id: duplicate.id } });
          for (const vehicle of vehiclesWithModel) {
            await vehicleRepo.update(vehicle.id, { model_id: primaryModel.id });
          }

          await modelRepo.remove(duplicate);
          modelDuplicatesFixed++;
          console.log(`   ✅ Merged "${duplicate.name}" → "${primaryModel.name}"`);
        }
      }
    }
  }

  console.log(`\n📊 Model duplicates fixed: ${modelDuplicatesFixed}`);

  const finalBrands = await brandRepo.find({ order: { name: 'ASC' } });
  const totalModels = await modelRepo.count();

  console.log('\n✅ Database cleanup completed!');
  console.log(`   📊 Total brands: ${finalBrands.length}`);
  console.log(`   📊 Total models: ${totalModels}\n`);

  if (duplicatesFixed > 0 || modelDuplicatesFixed > 0) {
    console.log('🗑️  Clearing Redis cache...\n');

    const configService = new ConfigService();
    const redisService = new RedisService(configService);
    await redisService.onModuleInit();

    const deletedBrands = await redisService.invalidateByPrefix(CACHE_PREFIXES.brands);
    console.log(`   ✅ Deleted ${deletedBrands} brand caches`);

    const deletedBrandsModels = await redisService.invalidateByPrefix(CACHE_PREFIXES.brandsModels);
    console.log(`   ✅ Deleted ${deletedBrandsModels} model caches`);

    const deletedSearch = await redisService.invalidateByPrefix(CACHE_PREFIXES.listingsSearch);
    console.log(`   ✅ Deleted ${deletedSearch} search caches`);

    await redisService.onModuleDestroy();
    console.log('\n✅ Cache cleared!\n');
  } else {
    console.log('ℹ️  No changes made, skipping cache clear\n');
  }

  await AppDataSource.destroy();
  console.log('🔌 Database connection closed');
}

fixBrandDuplicates()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
