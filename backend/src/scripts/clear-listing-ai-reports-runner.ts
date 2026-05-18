import { ConfigService } from '@nestjs/config';

import { RedisService } from '../common/redis.service';
import { AppDataSource } from '../data-source';
import {
  LISTING_AI_REPORT_LOCK_PREFIX,
  LISTING_AI_REPORT_QUOTA_PREFIX,
} from '../listings/application/listing-ai-report-redis-prefixes';
import { ListingAiReport } from '../listings/entities/listing-ai-report.entity';

export async function runClearListingAiReports(): Promise<void> {
  console.log('🚀 Starting cleanup of listing AI reports...\n');

  await AppDataSource.initialize();
  console.log('✅ Connected to database\n');

  try {
    const reportRepo = AppDataSource.getRepository(ListingAiReport);
    const beforeCount = await reportRepo.count();
    console.log(`📊 Found ${beforeCount} AI report row(s)\n`);

    const del = await AppDataSource.createQueryBuilder().delete().from(ListingAiReport).execute();
    const deleted = del.affected ?? 0;
    console.log(`🗑️  Deleted ${deleted} AI report row(s)\n`);

    const afterCount = await reportRepo.count();
    console.log(`📊 Remaining AI report rows: ${afterCount}\n`);

    const configService = new ConfigService();
    const redisService = new RedisService(configService);
    await redisService.onModuleInit();

    const locks = await redisService.invalidateByPrefix(LISTING_AI_REPORT_LOCK_PREFIX);
    console.log(`🗑️  Removed ${locks} Redis key(s) (${LISTING_AI_REPORT_LOCK_PREFIX}*)\n`);

    const quotas = await redisService.invalidateByPrefix(LISTING_AI_REPORT_QUOTA_PREFIX);
    console.log(`🗑️  Removed ${quotas} Redis key(s) (${LISTING_AI_REPORT_QUOTA_PREFIX}*)\n`);

    await redisService.onModuleDestroy();
    console.log('✅ Listing AI reports cleanup complete!\n');
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}
