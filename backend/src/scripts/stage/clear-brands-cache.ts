import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';

import { RedisService } from '../../common/redis.service';
import { CACHE_PREFIXES } from '../../common/utils/cache.utils';
import { AppDataSource } from '../../data-source';

async function clearBrandsCache() {
  console.log('🚀 Започнување на чистење на кеш за марки и модели...\n');

  await AppDataSource.initialize();
  console.log('✅ Поврзано со базата на податоци\n');

  const configService = new ConfigService();
  const redisService = new RedisService(configService);
  await redisService.onModuleInit();

  console.log('🗑️  Бришење на кеш за марки...');
  const deletedBrands = await redisService.invalidateByPrefix(CACHE_PREFIXES.brands);
  console.log(`   ✅ Избришани ${deletedBrands} кешови за марки\n`);

  console.log('🗑️  Бришење на кеш за модели...');
  const deletedModels = await redisService.invalidateByPrefix(CACHE_PREFIXES.brandsModels);
  console.log(`   ✅ Избришани ${deletedModels} кешови за модели\n`);

  await redisService.onModuleDestroy();
  await AppDataSource.destroy();

  console.log('✅ Кешот за марки и модели е исчистен!\n');
}

clearBrandsCache()
  .then(() => {
    console.log('✅ Скриптот заврши успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error);
    process.exit(1);
  });
