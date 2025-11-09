import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';

import { RedisService } from '../../common/redis.service';
import { CACHE_PREFIXES } from '../../common/utils/cache.utils';
import { AppDataSource } from '../../data-source';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);

async function clearCache() {
  console.log('🚀 Започнување на чистење на кеш...\n');

  await AppDataSource.initialize();
  console.log('✅ Поврзано со базата на податоци\n');

  const configService = new ConfigService();
  const redisService = new RedisService(configService);
  await redisService.onModuleInit();

  console.log('🗑️  Бришење на кеш за објави...');
  const deletedSearch = await redisService.invalidateByPrefix(CACHE_PREFIXES.listingsSearch);
  console.log(`   ✅ Избришани ${deletedSearch} кешови за пребарување\n`);

  const deletedListings = await redisService.invalidateByPrefix(CACHE_PREFIXES.listings);
  console.log(`   ✅ Избришани ${deletedListings} кешови за објави\n`);

  const deletedUser = await redisService.invalidateByPrefix(CACHE_PREFIXES.listingsUser);
  console.log(`   ✅ Избришани ${deletedUser} кешови за кориснички објави\n`);

  const deletedBrands = await redisService.invalidateByPrefix(CACHE_PREFIXES.brands);
  console.log(`   ✅ Избришани ${deletedBrands} кешови за марки\n`);

  const deletedBrandsModels = await redisService.invalidateByPrefix(CACHE_PREFIXES.brandsModels);
  console.log(`   ✅ Избришани ${deletedBrandsModels} кешови за модели\n`);

  const deletedCities = await redisService.invalidateByPrefix(CACHE_PREFIXES.cities);
  console.log(`   ✅ Избришани ${deletedCities} кешови за градови\n`);

  await redisService.onModuleDestroy();
  await AppDataSource.destroy();

  console.log('✅ Кешот е целосно исчистен!\n');
}

clearCache()
  .then(() => {
    console.log('✅ Скриптот заврши успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error);
    process.exit(1);
  });
