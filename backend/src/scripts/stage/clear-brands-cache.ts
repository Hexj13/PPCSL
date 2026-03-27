import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';

import { RedisService } from '../../common/redis.service';
import { CACHE_PREFIXES } from '../../common/utils/cache.utils';
import { AppDataSource } from '../../data-source';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);

async function clearBrandsCache() {
  console.log('🚀 Starting cache cleanup for brands and models...\n');

  await AppDataSource.initialize();
  console.log('✅ Connected to database\n');

  const configService = new ConfigService();
  const redisService = new RedisService(configService);
  await redisService.onModuleInit();

  console.log('🗑️  Deleting brands cache...');
  const deletedBrands = await redisService.invalidateByPrefix(CACHE_PREFIXES.brands);
  console.log(`   ✅ Deleted ${deletedBrands} brand cache entries\n`);

  console.log('🗑️  Deleting models cache...');
  const deletedModels = await redisService.invalidateByPrefix(CACHE_PREFIXES.brandsModels);
  console.log(`   ✅ Deleted ${deletedModels} model cache entries\n`);

  console.log('🗑️  Deleting tire brands cache...');
  const deletedTireBrands = await redisService.invalidateByPrefix(CACHE_PREFIXES.tireBrands);
  console.log(`   ✅ Deleted ${deletedTireBrands} tire brand cache entries\n`);

  console.log('🗑️  Deleting tire models cache...');
  const deletedTireModels = await redisService.invalidateByPrefix(CACHE_PREFIXES.tireBrandsModels);
  console.log(`   ✅ Deleted ${deletedTireModels} tire model cache entries\n`);

  await redisService.onModuleDestroy();
  await AppDataSource.destroy();

  console.log('✅ Brands and models cache cleared!\n');
}

clearBrandsCache()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
