import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { GetPopularListingsUseCase } from './use-cases/get-popular-listings.use-case';

@Injectable()
export class PopularListingsRefreshService {
  private readonly logger = new Logger(PopularListingsRefreshService.name);

  constructor(private readonly getPopularListingsUseCase: GetPopularListingsUseCase) {}

  @Cron('0 1 * * *')
  async refreshPopularListings(): Promise<void> {
    try {
      await this.getPopularListingsUseCase.execute({ forceRefresh: true });
      this.logger.log('Popular listings cache refreshed');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to refresh popular listings cache: ${err.message}`, err.stack);
    }
  }
}
