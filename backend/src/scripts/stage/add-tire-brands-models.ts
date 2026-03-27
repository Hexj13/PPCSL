import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';

import { RedisService } from '../../common/redis.service';
import { CACHE_PREFIXES } from '../../common/utils/cache.utils';
import { AppDataSource } from '../../data-source';
import { runTireCatalogSeed } from '../data/tire-catalog-seed';
import { checkEnvironment, checkPlatform } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);
checkPlatform(['md']);

async function main() {
  console.log('🚀 Tire brands/models seed (stage)\n');

  await AppDataSource.initialize();
  console.log('✅ Database connected\n');

  const summary = await runTireCatalogSeed(AppDataSource);
  console.log('Summary:', JSON.stringify(summary, null, 2));

  const configService = new ConfigService();
  const redisService = new RedisService(configService);
  await redisService.onModuleInit();

  const tb = await redisService.invalidateByPrefix(CACHE_PREFIXES.tireBrands);
  const tm = await redisService.invalidateByPrefix(CACHE_PREFIXES.tireBrandsModels);
  const search = await redisService.invalidateByPrefix(CACHE_PREFIXES.listingsSearch);
  console.log(
    `\nCache invalidated: tire-brands=${tb}, tire-models=${tm}, listings:search=${search}\n`,
  );

  await redisService.onModuleDestroy();
  await AppDataSource.destroy();

  console.log('✅ Done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
