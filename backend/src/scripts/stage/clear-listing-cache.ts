import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';

import { RedisService } from '../../common/redis.service';
import { CACHE_PREFIXES, generateCacheKey } from '../../common/utils/cache.utils';
import { AppDataSource } from '../../data-source';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);

async function clearListingCache(listingId?: string) {
  console.log('🚀 Starting listing cache cleanup...\n');

  await AppDataSource.initialize();
  console.log('✅ Connected to database\n');

  const configService = new ConfigService();
  const redisService = new RedisService(configService);
  await redisService.onModuleInit();

  if (listingId) {
    console.log(`🗑️  Deleting cache for listing ${listingId}...`);
    await redisService.del(
      generateCacheKey({ prefix: CACHE_PREFIXES.listings, parts: [listingId] }),
    );
    console.log(`   ✅ Deleted cache for listing ${listingId}\n`);
  } else {
    console.log('🗑️  Deleting search cache...');
    const deletedSearch = await redisService.invalidateByPrefix(CACHE_PREFIXES.listingsSearch);
    console.log(`   ✅ Deleted ${deletedSearch} search caches\n`);

    console.log('🗑️  Deleting listing cache...');
    const deletedListings = await redisService.invalidateByPrefix(CACHE_PREFIXES.listings);
    console.log(`   ✅ Deleted ${deletedListings} listing caches\n`);

    console.log('🗑️  Deleting user listing cache...');
    const deletedUser = await redisService.invalidateByPrefix(CACHE_PREFIXES.listingsUser);
    console.log(`   ✅ Deleted ${deletedUser} user listing caches\n`);
  }

  await redisService.onModuleDestroy();
  await AppDataSource.destroy();

  console.log('✅ Listing cache cleanup complete!\n');
}

const listingId = process.argv[2];

clearListingCache(listingId)
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
