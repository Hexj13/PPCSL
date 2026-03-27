import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';

import { RedisService } from '../../common/redis.service';
import { CACHE_PREFIXES } from '../../common/utils/cache.utils';
import { AppDataSource } from '../../data-source';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['production', 'stage', 'development', 'test']);

async function clearCache() {
  console.log('🚀 Starting cache cleanup...\n');

  await AppDataSource.initialize();
  console.log('✅ Connected to database\n');

  const configService = new ConfigService();
  const redisService = new RedisService(configService);
  await redisService.onModuleInit();

  console.log('🗑️  Deleting listing cache...');
  const deletedSearch = await redisService.invalidateByPrefix(CACHE_PREFIXES.listingsSearch);
  console.log(`   ✅ Deleted ${deletedSearch} search caches\n`);

  const deletedListings = await redisService.invalidateByPrefix(CACHE_PREFIXES.listings);
  console.log(`   ✅ Deleted ${deletedListings} listing caches\n`);

  const deletedUser = await redisService.invalidateByPrefix(CACHE_PREFIXES.listingsUser);
  console.log(`   ✅ Deleted ${deletedUser} user listing caches\n`);

  const deletedBrands = await redisService.invalidateByPrefix(CACHE_PREFIXES.brands);
  console.log(`   ✅ Deleted ${deletedBrands} brand caches\n`);

  const deletedBrandsModels = await redisService.invalidateByPrefix(CACHE_PREFIXES.brandsModels);
  console.log(`   ✅ Deleted ${deletedBrandsModels} model caches\n`);

  const deletedTireBrands = await redisService.invalidateByPrefix(CACHE_PREFIXES.tireBrands);
  console.log(`   ✅ Deleted ${deletedTireBrands} tire brand caches\n`);

  const deletedTireModels = await redisService.invalidateByPrefix(CACHE_PREFIXES.tireBrandsModels);
  console.log(`   ✅ Deleted ${deletedTireModels} tire model caches\n`);

  const deletedCities = await redisService.invalidateByPrefix(CACHE_PREFIXES.cities);
  console.log(`   ✅ Deleted ${deletedCities} city caches\n`);

  await redisService.onModuleDestroy();
  await AppDataSource.destroy();

  console.log('✅ Cache cleanup complete!\n');
}

clearCache()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
