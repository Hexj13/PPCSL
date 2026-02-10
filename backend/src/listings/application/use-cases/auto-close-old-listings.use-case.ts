import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, LessThanOrEqual, Repository } from 'typeorm';

import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { Listing } from '../../entities/listing.entity';
import { IListingCache, LISTING_CACHE } from '../ports/listing-cache.port';
import { IPromotionHistoryWriter, PROMOTION_HISTORY_WRITER } from '../ports/promotion-history.port';

@Injectable()
export class AutoCloseOldListingsUseCase {
  private readonly logger = new Logger(AutoCloseOldListingsUseCase.name);

  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
    @Inject(PROMOTION_HISTORY_WRITER)
    private readonly promotionHistoryWriter: IPromotionHistoryWriter,
    @Inject(LISTING_CACHE)
    private readonly listingCache: IListingCache,
  ) {}

  async execute(): Promise<{ closed: number }> {
    const Sentry = await import('@sentry/node');
    return Sentry.withMonitor(
      'auto-close-old-listings',
      async () => {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const now = new Date();
        const closedAt = new Date();

        const promotedListingsWithExpiredPromo = await this.listingsRepository.find({
          where: {
            status: ListingStatusEnum.Active,
            last_updated_at: LessThanOrEqual(ninetyDaysAgo),
            is_promoted: true,
            promoted_until: LessThan(now),
          },
          select: ['id'],
        });

        for (const listing of promotedListingsWithExpiredPromo) {
          await this.promotionHistoryWriter.updateEndDateForListing(listing.id);
        }

        const result = await this.listingsRepository
          .createQueryBuilder()
          .update(Listing)
          .set({
            status: ListingStatusEnum.Closed,
            closed_at: closedAt,
            is_promoted: false,
            promoted_until: null,
            promoted_started_at: null,
            promoted_paused_at: null,
          })
          .where('status = :status', { status: ListingStatusEnum.Active })
          .andWhere('last_updated_at <= :ninetyDaysAgo', { ninetyDaysAgo })
          .andWhere(
            '(is_promoted = false OR (is_promoted = true AND promoted_until IS NOT NULL AND promoted_until < :now))',
            { now },
          )
          .execute();

        this.logger.log(`Auto-closed ${result.affected || 0} old listings`);

        try {
          await this.listingCache.invalidateSearch();
        } catch (_: unknown) {
          void _;
        }

        return { closed: result.affected || 0 };
      },
      {
        schedule: { type: 'crontab', value: '0 0 * * *' },
        checkinMargin: 5,
        maxRuntime: 30,
      },
    );
  }
}
