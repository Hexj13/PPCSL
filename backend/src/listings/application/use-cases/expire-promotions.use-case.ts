import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { Listing } from '../../entities/listing.entity';
import { IListingCache, LISTING_CACHE } from '../ports/listing-cache.port';
import { IPromotionHistoryWriter, PROMOTION_HISTORY_WRITER } from '../ports/promotion-history.port';

@Injectable()
export class ExpirePromotionsUseCase {
  private readonly logger = new Logger(ExpirePromotionsUseCase.name);

  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
    @Inject(PROMOTION_HISTORY_WRITER)
    private readonly promotionHistoryWriter: IPromotionHistoryWriter,
    @Inject(LISTING_CACHE)
    private readonly listingCache: IListingCache,
  ) {}

  async execute(): Promise<{ expired: number }> {
    const now = new Date();

    const expiredPromoListings = await this.listingsRepository.find({
      where: {
        status: ListingStatusEnum.Active,
        is_promoted: true,
        promoted_until: LessThan(now),
      },
      select: ['id'],
    });

    for (const listing of expiredPromoListings) {
      await this.promotionHistoryWriter.updateEndDateForListing(listing.id);
    }

    if (expiredPromoListings.length === 0) {
      return { expired: 0 };
    }

    const result = await this.listingsRepository
      .createQueryBuilder()
      .update(Listing)
      .set({
        is_promoted: false,
        promoted_until: null,
        promoted_started_at: null,
        promoted_paused_at: null,
      })
      .where('status = :status', { status: ListingStatusEnum.Active })
      .andWhere('is_promoted = :isPromoted', { isPromoted: true })
      .andWhere('promoted_until IS NOT NULL')
      .andWhere('promoted_until < :now', { now })
      .execute();

    const expired = result.affected ?? 0;
    this.logger.log(`Expired ${expired} promotions`);

    try {
      await this.listingCache.invalidateSearch();
    } catch (_: unknown) {
      void _;
    }

    return { expired };
  }
}
