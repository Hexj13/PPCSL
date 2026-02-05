import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';

import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { RedisService } from '../../common/redis.service';
import { CACHE_PREFIXES } from '../../common/utils/cache.utils';
import { AppDataSource } from '../../data-source';
import { Vehicle } from '../../listings/entities/vehicle.entity';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['production']);

function isEmptyBrandName(name: string | null | undefined): boolean {
  return name == null || String(name).trim() === '';
}

async function fixEmptyBrandNames() {
  console.log('🔧 Fixing brands with empty name...\n');

  await AppDataSource.initialize();
  console.log('✅ Connected to database\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);

  const allBrands = await brandRepo.find({
    relations: ['models'],
    order: { name: 'ASC' },
  });

  const emptyBrands = allBrands.filter((b) => isEmptyBrandName(b.name));
  if (emptyBrands.length === 0) {
    console.log('✅ No brands with empty name found\n');
    await AppDataSource.destroy();
    return { brandsRemoved: 0, modelsReassigned: 0, vehiclesReassigned: 0, skipped: [] };
  }

  console.log(`⚠️  Found ${emptyBrands.length} brand(s) with empty name\n`);

  let brandsRemoved = 0;
  let modelsReassigned = 0;
  let vehiclesReassigned = 0;
  const skipped: Array<{ brandId: string; modelName: string; reason: string }> = [];

  for (const emptyBrand of emptyBrands) {
    console.log(`\n📌 Processing brand ID: ${emptyBrand.id} (name: "${emptyBrand.name ?? ''}")`);
    const models = await modelRepo.find({
      where: { brand_id: emptyBrand.id },
      order: { name: 'ASC' },
    });
    console.log(`   Models: ${models.map((m) => m.name).join(', ') || '(none)'}`);

    for (const model of models) {
      const sameNameModels = await modelRepo.find({
        where: { name: model.name },
        relations: ['brand'],
      });
      const otherBrandModels = sameNameModels.filter(
        (m) => m.brand_id !== emptyBrand.id && !isEmptyBrandName(m.brand?.name),
      );

      if (otherBrandModels.length === 0) {
        console.log(
          `   ⚠️  Model "${model.name}": no other brand has this model — skip (manual fix)`,
        );
        skipped.push({
          brandId: emptyBrand.id,
          modelName: model.name,
          reason: 'no_other_brand_with_same_model',
        });
        continue;
      }

      const target = otherBrandModels[0];
      if (otherBrandModels.length > 1) {
        console.log(
          `   📌 Model "${model.name}": ${otherBrandModels.length} brands have it — using "${target.brand?.name}" (ID: ${target.brand_id})`,
        );
      } else {
        console.log(
          `   ✅ Model "${model.name}" → reassign to "${target.brand?.name}" (ID: ${target.brand_id})`,
        );
      }

      const vehicles = await vehicleRepo.find({ where: { model_id: model.id } });
      for (const vehicle of vehicles) {
        await vehicleRepo.update(vehicle.id, {
          brand_id: target.brand_id,
          model_id: target.id,
        });
        vehiclesReassigned++;
      }
      await modelRepo.remove(model);
      modelsReassigned++;
    }

    const vehiclesStillWithBrand = await vehicleRepo.find({
      where: { brand_id: emptyBrand.id },
    });
    if (vehiclesStillWithBrand.length > 0) {
      console.log(
        `   ⚠️  ${vehiclesStillWithBrand.length} vehicle(s) still reference this brand — skip removing brand (manual fix)`,
      );
      skipped.push({
        brandId: emptyBrand.id,
        modelName: '(vehicles without reassigned model)',
        reason: 'vehicles_left',
      });
    } else {
      await brandRepo.remove(emptyBrand);
      brandsRemoved++;
      console.log(`   🗑️  Brand removed`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   - Brands removed: ${brandsRemoved}`);
  console.log(`   - Models reassigned/removed: ${modelsReassigned}`);
  console.log(`   - Vehicles reassigned: ${vehiclesReassigned}`);
  if (skipped.length > 0) {
    console.log(`   - Skipped (manual fix): ${skipped.length}`);
    skipped.forEach((s) => console.log(`      - ${s.modelName}: ${s.reason}`));
  }

  if (brandsRemoved > 0 || modelsReassigned > 0) {
    console.log('\n🔄 Clearing Redis brands cache...');
    const configService = new ConfigService();
    const redisService = new RedisService(configService);
    await redisService.onModuleInit();
    const deletedBrands = await redisService.invalidateByPrefix(CACHE_PREFIXES.brands);
    const deletedBrandsModels = await redisService.invalidateByPrefix(CACHE_PREFIXES.brandsModels);
    const deletedSearch = await redisService.invalidateByPrefix(CACHE_PREFIXES.listingsSearch);
    await redisService.onModuleDestroy();
    console.log(
      `   Cleared: brands ${deletedBrands}, models ${deletedBrandsModels}, search ${deletedSearch}`,
    );
  }

  await AppDataSource.destroy();
  return { brandsRemoved, modelsReassigned, vehiclesReassigned, skipped };
}

if (require.main === module) {
  fixEmptyBrandNames()
    .then((r) => {
      console.log('\n✅ Done');
      process.exit(r.skipped.length > 0 && r.brandsRemoved === 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

export { fixEmptyBrandNames };
