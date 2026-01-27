import 'reflect-metadata';

import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { BODY_TYPES_BY_VEHICLE_TYPE } from '../../common/constants';
import { AppDataSource } from '../../data-source';
import { Listing } from '../../listings/entities/listing.entity';
import { Vehicle } from '../../listings/entities/vehicle.entity';
import { determineVehicleType } from '../data/vehicle-classification';
import { checkEnvironment, checkPlatform } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);
checkPlatform(['md']);

function getVehicleTypeFromBodyType(bodyType: string): 'car' | 'truck' | 'moto' | null {
  if (!bodyType) {
    return null;
  }

  for (const [vehicleType, bodyTypes] of Object.entries(BODY_TYPES_BY_VEHICLE_TYPE)) {
    if ((bodyTypes as readonly string[]).includes(bodyType)) {
      return vehicleType as 'car' | 'truck' | 'moto';
    }
  }
  return null;
}

async function syncVehicleTypesFromListings() {
  console.log('🔄 Starting vehicle types synchronization from listings...\n');

  await AppDataSource.initialize();
  console.log('✅ Connected to database\n');

  const modelRepo = AppDataSource.getRepository(VehicleModel);
  const brandRepo = AppDataSource.getRepository(Brand);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);
  const listingRepo = AppDataSource.getRepository(Listing);

  const modelsWithoutType = await modelRepo
    .createQueryBuilder('model')
    .where('model.vehicle_type IS NULL')
    .getMany();

  console.log(`📦 Found ${modelsWithoutType.length} models without vehicle_type\n`);

  if (modelsWithoutType.length === 0) {
    console.log('✅ All models already have vehicle_type');
    await AppDataSource.destroy();
    return;
  }

  let modelsUpdated = 0;
  let modelsSkipped = 0;
  const stats = {
    fromBodyType: 0,
    fromClassification: 0,
    conflicts: 0,
  };

  for (const model of modelsWithoutType) {
    const vehicles = await vehicleRepo.find({
      where: { model_id: model.id },
      relations: ['brand'],
    });

    if (vehicles.length === 0) {
      modelsSkipped++;
      continue;
    }

    const bodyTypes = new Map<string, number>();
    let totalListings = 0;

    for (const vehicle of vehicles) {
      const listings = await listingRepo.find({
        where: { vehicle_id: vehicle.id },
      });

      totalListings += listings.length;

      if (vehicle.body_type && listings.length > 0) {
        const count = bodyTypes.get(vehicle.body_type) || 0;
        bodyTypes.set(vehicle.body_type, count + listings.length);
      }
    }

    if (bodyTypes.size === 0) {
      const brand = await brandRepo.findOne({ where: { id: model.brand_id } });
      if (brand) {
        const vehicleType = determineVehicleType(model.name, brand.name);
        model.vehicle_type = vehicleType;
        await modelRepo.save(model);
        modelsUpdated++;
        stats.fromClassification++;
        console.log(
          `✅ ${brand.name} ${model.name}: ${vehicleType} (from classification, no listings)`,
        );
      } else {
        modelsSkipped++;
      }
      continue;
    }

    const vehicleTypesFromBodyTypes = new Map<'car' | 'truck' | 'moto', number>();

    for (const [bodyType, count] of bodyTypes.entries()) {
      const vehicleType = getVehicleTypeFromBodyType(bodyType);
      if (vehicleType) {
        const currentCount = vehicleTypesFromBodyTypes.get(vehicleType) || 0;
        vehicleTypesFromBodyTypes.set(vehicleType, currentCount + count);
      }
    }

    if (vehicleTypesFromBodyTypes.size === 0) {
      const brand = await brandRepo.findOne({ where: { id: model.brand_id } });
      if (brand) {
        const vehicleType = determineVehicleType(model.name, brand.name);
        model.vehicle_type = vehicleType;
        await modelRepo.save(model);
        modelsUpdated++;
        stats.fromClassification++;
        console.log(
          `✅ ${brand.name} ${model.name}: ${vehicleType} (from classification, unknown body types)`,
        );
      } else {
        modelsSkipped++;
      }
      continue;
    }

    if (vehicleTypesFromBodyTypes.size === 1) {
      const vehicleType = Array.from(vehicleTypesFromBodyTypes.keys())[0];
      model.vehicle_type = vehicleType;
      await modelRepo.save(model);
      modelsUpdated++;
      stats.fromBodyType++;
      const brand = await brandRepo.findOne({ where: { id: model.brand_id } });
      const brandName = brand?.name || 'Unknown';
      console.log(`✅ ${brandName} ${model.name}: ${vehicleType} (from ${totalListings} listings)`);
    } else {
      const sortedTypes = Array.from(vehicleTypesFromBodyTypes.entries()).sort(
        (a, b) => b[1] - a[1],
      );
      const mostCommonType = sortedTypes[0][0];
      const secondMostCommonType = sortedTypes[1][0];
      const mostCommonCount = sortedTypes[0][1];
      const secondMostCommonCount = sortedTypes[1][1];

      if (mostCommonCount > secondMostCommonCount * 2) {
        model.vehicle_type = mostCommonType;
        await modelRepo.save(model);
        modelsUpdated++;
        stats.fromBodyType++;
        const brand = await brandRepo.findOne({ where: { id: model.brand_id } });
        const brandName = brand?.name || 'Unknown';
        console.log(
          `✅ ${brandName} ${model.name}: ${mostCommonType} (from body types, ${mostCommonCount} vs ${secondMostCommonCount})`,
        );
      } else {
        const brand = await brandRepo.findOne({ where: { id: model.brand_id } });
        if (brand) {
          const vehicleType = determineVehicleType(model.name, brand.name);
          model.vehicle_type = vehicleType;
          await modelRepo.save(model);
          modelsUpdated++;
          stats.fromClassification++;
          stats.conflicts++;
          console.log(
            `⚠️  ${brand.name} ${model.name}: ${vehicleType} (from classification, conflict: ${mostCommonType}(${mostCommonCount}) vs ${secondMostCommonType}(${secondMostCommonCount}))`,
          );
        } else {
          modelsSkipped++;
        }
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   - Models updated: ${modelsUpdated}`);
  console.log(`   - Models skipped: ${modelsSkipped}`);
  console.log(`   - Updated from body types: ${stats.fromBodyType}`);
  console.log(`   - Updated from classification: ${stats.fromClassification}`);
  console.log(`   - Conflicts resolved: ${stats.conflicts}`);

  if (modelsUpdated > 0) {
    console.log(`\n🔄 Updating brand vehicle_types...`);

    const allBrands = await brandRepo.find({
      relations: ['models'],
    });

    let brandsUpdated = 0;

    for (const brand of allBrands) {
      const models = brand.models || [];
      const types = new Set<'car' | 'truck' | 'moto'>();

      for (const model of models) {
        if (model.vehicle_type) {
          types.add(model.vehicle_type);
        }
      }

      const brandTypes = Array.from(types).sort();
      const currentTypes = (brand.vehicle_types || []).sort();

      if (brandTypes.join(',') !== currentTypes.join(',')) {
        brand.vehicle_types = brandTypes;
        await brandRepo.save(brand);
        brandsUpdated++;
      }
    }

    console.log(`✅ Updated ${brandsUpdated} brands`);
  }

  await AppDataSource.destroy();
  console.log('\n✅ Synchronization completed!');
}

if (require.main === module) {
  syncVehicleTypesFromListings()
    .then(() => {
      console.log('\n🎉 Vehicle types sync from listings completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error during synchronization:', error);
      process.exit(1);
    });
}

export { syncVehicleTypesFromListings };
