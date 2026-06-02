import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MetricsService } from '../../../common/metrics/metrics.service';
import { RedisService } from '../../../common/redis.service';
import { Listing } from '../../entities/listing.entity';

const PENDING_VIEWS_HASH = 'listing:views:pending';
const FLUSH_LOCK_KEY = 'listing:views:flush:lock';
const FLUSH_LOCK_TTL_SECONDS = 120;

@Injectable()
export class ListingViewsCounterService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ListingViewsCounterService.name);

  constructor(
    private readonly redisService: RedisService,
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
    private readonly metricsService: MetricsService,
  ) {}

  onModuleInit(): void {
    this.metricsService.registerGauge('kupito_pending_view_counts', () =>
      this.redisService.hlen(PENDING_VIEWS_HASH),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.flushPendingViewsUnlocked();
  }

  async recordPendingView(listingId: string): Promise<void> {
    await this.redisService.hincrBy(PENDING_VIEWS_HASH, listingId, 1);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async flushPendingViews(): Promise<void> {
    const acquired = await this.redisService.setIfNotExists(
      FLUSH_LOCK_KEY,
      '1',
      FLUSH_LOCK_TTL_SECONDS,
    );
    if (!acquired) {
      return;
    }

    try {
      await this.flushPendingViewsUnlocked();
    } finally {
      await this.redisService.del(FLUSH_LOCK_KEY);
    }
  }

  private async flushPendingViewsUnlocked(): Promise<void> {
    const pending = await this.redisService.hgetall(PENDING_VIEWS_HASH);
    const entries = Object.entries(pending);
    if (entries.length === 0) {
      return;
    }

    for (const [listingId, rawCount] of entries) {
      const increment = Number.parseInt(rawCount, 10);
      if (!Number.isFinite(increment) || increment <= 0) {
        await this.redisService.hdel(PENDING_VIEWS_HASH, listingId);
        continue;
      }

      await this.listingsRepository.increment({ id: listingId }, 'views', increment);

      const remaining = await this.redisService.hincrBy(PENDING_VIEWS_HASH, listingId, -increment);
      if (remaining <= 0) {
        await this.redisService.hdel(PENDING_VIEWS_HASH, listingId);
      }
    }

    this.logger.log(`Flushed view counts for ${entries.length} listing(s)`);
  }
}
