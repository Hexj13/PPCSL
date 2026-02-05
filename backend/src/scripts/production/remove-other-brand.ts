import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';

import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { RedisService } from '../../common/redis.service';
import { CACHE_PREFIXES } from '../../common/utils/cache.utils';
import { AppDataSource } from '../../data-source';
import { Listing } from '../../listings/entities/listing.entity';
import { Vehicle } from '../../listings/entities/vehicle.entity';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['production']);

const BRAND_NAME_TO_REMOVE = 'Другая марка';

async function removeOtherBrand() {
  const force = process.argv.includes('--force');
  console.log(`🔧 Removing brand "${BRAND_NAME_TO_REMOVE}" from database...\n`);

  await AppDataSource.initialize();
  console.log('✅ Connected to database\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);
  const listingRepo = AppDataSource.getRepository(Listing);

  const brand = await brandRepo.findOne({ where: { name: BRAND_NAME_TO_REMOVE } });
  if (!brand) {
    console.log(`✅ Brand "${BRAND_NAME_TO_REMOVE}" not found — nothing to do\n`);
    await AppDataSource.destroy();
    return { removed: false, reason: 'not_found' };
  }

  const vehicles = await vehicleRepo.find({ where: { brand_id: brand.id } });
  const vehiclesCount = vehicles.length;
  if (vehiclesCount > 0 && !force) {
    console.log(
      `⚠️  Brand "${BRAND_NAME_TO_REMOVE}" has ${vehiclesCount} vehicle(s) in listings. Run with --force to detach vehicles (listings will lose vehicle data) and remove brand.\n`,
    );
    await AppDataSource.destroy();
    return { removed: false, reason: 'has_vehicles' };
  }

  if (vehiclesCount > 0 && force) {
    for (const vehicle of vehicles) {
      await listingRepo.update({ vehicle_id: vehicle.id }, { vehicle_id: null });
    }
    for (const vehicle of vehicles) {
      await vehicleRepo.remove(vehicle);
    }
    console.log(`   🗑️  Detached and removed ${vehiclesCount} vehicle(s)`);
  }

  const models = await modelRepo.find({ where: { brand_id: brand.id } });
  for (const model of models) {
    await modelRepo.remove(model);
    console.log(`   🗑️  Removed model: ${model.name}`);
  }
  await brandRepo.remove(brand);
  console.log(`   🗑️  Removed brand: "${BRAND_NAME_TO_REMOVE}"\n`);

  console.log('🔄 Clearing Redis cache...');
  const configService = new ConfigService();
  const redisService = new RedisService(configService);
  await redisService.onModuleInit();
  await redisService.invalidateByPrefix(CACHE_PREFIXES.brands);
  await redisService.invalidateByPrefix(CACHE_PREFIXES.brandsModels);
  await redisService.invalidateByPrefix(CACHE_PREFIXES.listingsSearch);
  await redisService.onModuleDestroy();
  console.log('   ✅ Cache cleared\n');

  await AppDataSource.destroy();
  return { removed: true };
}

if (require.main === module) {
  removeOtherBrand()
    .then((r) => {
      console.log(r.removed ? '✅ Done' : '');
      process.exit(r.removed ? 0 : 1);
    })
    .catch((err) => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

export { removeOtherBrand };
