import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';

import { RedisService } from '../../common/redis.service';
import { CACHE_PREFIXES, generateCacheKey } from '../../common/utils/cache.utils';
import { AppDataSource } from '../../data-source';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);

async function clearListingCache(listingId?: string) {
  console.log('🚀 Започнување на чистење на кеш за објави...\n');

  await AppDataSource.initialize();
  console.log('✅ Поврзано со базата на податоци\n');

  const configService = new ConfigService();
  const redisService = new RedisService(configService);
  await redisService.onModuleInit();

  if (listingId) {
    console.log(`🗑️  Бришење на кеш за објава ${listingId}...`);
    await redisService.del(
      generateCacheKey({ prefix: CACHE_PREFIXES.listings, parts: [listingId] }),
    );
    console.log(`   ✅ Избришан кеш за објава ${listingId}\n`);
  } else {
    console.log('🗑️  Бришење на кеш за пребарување на објави...');
    const deletedSearch = await redisService.invalidateByPrefix(CACHE_PREFIXES.listingsSearch);
    console.log(`   ✅ Избришани ${deletedSearch} кешови за пребарување\n`);

    console.log('🗑️  Бришење на кеш за објави...');
    const deletedListings = await redisService.invalidateByPrefix(CACHE_PREFIXES.listings);
    console.log(`   ✅ Избришани ${deletedListings} кешови за објави\n`);

    console.log('🗑️  Бришење на кеш за кориснички објави...');
    const deletedUser = await redisService.invalidateByPrefix(CACHE_PREFIXES.listingsUser);
    console.log(`   ✅ Избришани ${deletedUser} кешови за кориснички објави\n`);
  }

  await redisService.onModuleDestroy();
  await AppDataSource.destroy();

  console.log('✅ Кешот за објави е исчистен!\n');
}

const listingId = process.argv[2];

clearListingCache(listingId)
  .then(() => {
    console.log('✅ Скриптот заврши успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error);
    process.exit(1);
  });
