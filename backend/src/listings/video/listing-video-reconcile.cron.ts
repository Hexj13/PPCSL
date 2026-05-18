import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';

import { ListingVideoService } from './listing-video.service';

const DEV_RECONCILE_INTERVAL_MS = 30_000;

@Injectable()
export class ListingVideoReconcileCronService {
  private readonly logger = new Logger(ListingVideoReconcileCronService.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  constructor(private readonly listingVideoService: ListingVideoService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async run(): Promise<void> {
    if (!this.isProduction) {
      return;
    }
    await this.reconcile();
  }

  @Interval(DEV_RECONCILE_INTERVAL_MS)
  async runDevelopment(): Promise<void> {
    if (this.isProduction) {
      return;
    }
    await this.reconcile({ minimumAgeMs: 0 });
  }

  private async reconcile(options?: { minimumAgeMs?: number }): Promise<void> {
    try {
      await this.listingVideoService.reconcileStuckProcessingVideos(options);
    } catch (error) {
      this.logger.warn(`reconcile: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
