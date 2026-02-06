import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { Listing } from '../../entities/listing.entity';
import { IListingCache, LISTING_CACHE } from '../ports/listing-cache.port';
import { IPromotionHistoryWriter, PROMOTION_HISTORY_WRITER } from '../ports/promotion-history.port';

@Injectable()
export class CloseAllUserListingsUseCase {
  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
    @Inject(PROMOTION_HISTORY_WRITER)
    private readonly promotionHistoryWriter: IPromotionHistoryWriter,
    @Inject(LISTING_CACHE)
    private readonly listingCache: IListingCache,
  ) {}

  async execute(userId: string): Promise<number> {
    const promotedListings = await this.listingsRepository.find({
      where: {
        user_id: userId,
        status: In([ListingStatusEnum.Active, ListingStatusEnum.Paused]),
        is_promoted: true,
      },
      select: ['id'],
    });

    for (const listing of promotedListings) {
      await this.promotionHistoryWriter.updateEndDateForListing(listing.id);
    }

    const closedAt = new Date();
    const result = await this.listingsRepository.update(
      {
        user_id: userId,
        status: In([ListingStatusEnum.Active, ListingStatusEnum.Paused]),
      },
      {
        status: ListingStatusEnum.Closed,
        closed_at: closedAt,
        is_promoted: false,
        promoted_until: null,
        promoted_started_at: null,
        promoted_paused_at: null,
      },
    );

    try {
      await this.listingCache.invalidateSearch();
    } catch (_: unknown) {
      void _;
    }

    return result.affected || 0;
  }
}
