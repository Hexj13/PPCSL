import 'reflect-metadata';

import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { determineVehicleType, getBrandCategory } from '../data/vehicle-classification';
import { checkEnvironment, checkPlatform } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);
checkPlatform(['md']);

async function syncVehicleTypes(forceReset: boolean = false) {
  console.log('🔄 Starting vehicle types synchronization...\n');

  if (forceReset) {
    console.log('⚠️  Force reset mode: will recalculate ALL vehicle types\n');
  }

  await AppDataSource.initialize();
  console.log('✅ Connected to database\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  const allBrands = await brandRepo.find({
    relations: ['models'],
  });

  console.log(`📦 Found ${allBrands.length} brands to process\n`);

  let brandsUpdated = 0;
  let modelsUpdated = 0;
  let modelsSkipped = 0;
  let brandsSkipped = 0;

  const stats = {
    car: 0,
    truck: 0,
    moto: 0,
    tire: 0,
  };

  for (const brand of allBrands) {
    const models = brand.models || [];
    const modelTypes = new Set<'car' | 'truck' | 'moto' | 'tire'>();
    let modelsNeedUpdate = false;
    const modelsToUpdate: VehicleModel[] = [];

    const brandCategory = getBrandCategory(brand.name);

    for (const model of models) {
      const currentType = model.vehicle_types?.[0];
      const shouldUpdate = forceReset || !currentType;

      if (shouldUpdate) {
        const vehicleType = determineVehicleType(model.name, brand.name);
        model.vehicle_types = [vehicleType];
        modelTypes.add(vehicleType);
        modelsToUpdate.push(model);
        modelsNeedUpdate = true;
        stats[vehicleType]++;
      } else {
        modelTypes.add(currentType);
        stats[currentType]++;
      }
    }

    if (modelsNeedUpdate && modelsToUpdate.length > 0) {
      await modelRepo.save(modelsToUpdate);
      modelsUpdated += modelsToUpdate.length;
    } else {
      modelsSkipped += models.length;
    }

    const brandTypes = Array.from(modelTypes).sort();
    const currentBrandTypes = (brand.vehicle_types || []).sort();

    const brandNeedsUpdate =
      forceReset ||
      brandTypes.length !== currentBrandTypes.length ||
      !brandTypes.every((type, idx) => type === currentBrandTypes[idx]);

    if (brandNeedsUpdate && brandTypes.length > 0) {
      brand.vehicle_types = brandTypes;
      await brandRepo.save(brand);
      brandsUpdated++;
      console.log(
        `✅ ${brand.name} [${brandCategory}]: ${brandTypes.join(', ')} (${models.length} models)`,
      );
    } else {
      brandsSkipped++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   - Brands updated: ${brandsUpdated}`);
  console.log(`   - Brands skipped (no changes): ${brandsSkipped}`);
  console.log(`   - Models updated: ${modelsUpdated}`);
  console.log(`   - Models skipped (already set): ${modelsSkipped}`);

  console.log(`\n📈 Classification stats:`);
  console.log(`   - Car models: ${stats.car}`);
  console.log(`   - Truck models: ${stats.truck}`);
  console.log(`   - Moto models: ${stats.moto}`);
  console.log(`   - Tire models: ${stats.tire}`);

  const brandsWithoutTypes = await brandRepo
    .createQueryBuilder('brand')
    .where("brand.vehicle_types IS NULL OR brand.vehicle_types = ''")
    .getCount();

  const modelsWithoutTypes = await modelRepo
    .createQueryBuilder('model')
    .where("(model.vehicle_types IS NULL OR model.vehicle_types = '')")
    .getCount();

  if (brandsWithoutTypes > 0 || modelsWithoutTypes > 0) {
    console.log(`\n⚠️  Warning:`);
    console.log(`   - Brands without types: ${brandsWithoutTypes}`);
    console.log(`   - Models without types: ${modelsWithoutTypes}`);
  }

  await AppDataSource.destroy();
  console.log('\n✅ Synchronization completed!');
}

if (require.main === module) {
  const forceReset = process.argv.includes('--force') || process.argv.includes('-f');

  syncVehicleTypes(forceReset)
    .then(() => {
      console.log('\n🎉 Vehicle types sync completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error during synchronization:', error);
      process.exit(1);
    });
}

export { syncVehicleTypes };
