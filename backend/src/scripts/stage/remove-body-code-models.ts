import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { In } from 'typeorm';

import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { RedisService } from '../../common/redis.service';
import { CACHE_PREFIXES } from '../../common/utils/cache.utils';
import { AppDataSource } from '../../data-source';
import { Vehicle } from '../../listings/entities/vehicle.entity';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);

const BODY_CODE_MODELS: Record<string, string[]> = {
  BMW: ['E30', 'E36', 'E46', 'E39', 'E38', 'E34', 'M3 E30', 'M3 E36', 'M3 E46', 'M5 E34', 'M5 E39'],
  'Mercedes-Benz': ['W124', 'W126', 'W140', 'W201', 'W202', 'W210', 'W211', 'W212', 'W213'],
};

async function removeBodyCodeModels() {
  console.log('Removing body code models (E30, W124, etc.) from BMW and Mercedes-Benz...\n');

  await AppDataSource.initialize();
  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);

  let deleted = 0;
  let skipped = 0;

  for (const [brandName, modelNames] of Object.entries(BODY_CODE_MODELS)) {
    const brand = await brandRepo.findOne({ where: { name: brandName } });
    if (!brand) {
      console.log(`Brand "${brandName}" not found, skipping.\n`);
      continue;
    }

    const models = await modelRepo.find({
      where: { brand_id: brand.id, name: In(modelNames) },
    });

    for (const model of models) {
      const usage = await vehicleRepo.count({ where: { model_id: model.id } });
      if (usage > 0) {
        console.log(`   Skip "${model.name}" (${brandName}): ${usage} listing(s) use it`);
        skipped++;
        continue;
      }
      await modelRepo.remove(model);
      console.log(`   Removed: ${brandName} / ${model.name}`);
      deleted++;
    }
  }

  console.log('\nClearing brands cache...');
  const configService = new ConfigService();
  const redisService = new RedisService(configService);
  await redisService.onModuleInit();
  await redisService.invalidateByPrefix(CACHE_PREFIXES.brands);
  await redisService.invalidateByPrefix(CACHE_PREFIXES.brandsModels);
  await redisService.invalidateByPrefix(CACHE_PREFIXES.listingsSearch);
  await redisService.onModuleDestroy();

  await AppDataSource.destroy();
  console.log(`\nDone. Deleted: ${deleted}, skipped (in use): ${skipped}`);
  return { deleted, skipped };
}

removeBodyCodeModels()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });

export { removeBodyCodeModels };
