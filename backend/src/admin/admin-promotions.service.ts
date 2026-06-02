import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ListingStatus as ListingStatusEnum } from '../common/types';
import { IListingCache, LISTING_CACHE } from '../listings/application/ports/listing-cache.port';
import { Listing } from '../listings/entities/listing.entity';
import { PromotionHistory, PromotionSource } from '../listings/entities/promotion-history.entity';
import { ListingsService } from '../listings/listings.service';

@Injectable()
export class AdminPromotionsService {
  constructor(
    @InjectRepository(Listing)
    private listingsRepository: Repository<Listing>,
    private listingsService: ListingsService,
    @Inject(LISTING_CACHE)
    private listingCache: IListingCache,
    private configService: ConfigService,
  ) {}

  assertPromotionAccessAllowed(): void {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const promotionAccess = this.configService.get<string>('PROMOTION_ACCESS', 'disabled');
    if (isProduction && promotionAccess === 'disabled') {
      throw new ForbiddenException('errors.promotionDisabled');
    }
  }

  async toggleListingPromotion(
    id: string,
    isPromoted: boolean,
    days?: number | null,
  ): Promise<Listing> {
    const listing = await this.listingsRepository.findOne({ where: { id } });
    if (!listing) {
      throw new NotFoundException('errors.listingNotFound');
    }

    const wasPromoted = listing.is_promoted;
    listing.is_promoted = isPromoted;

    if (isPromoted) {
      const now = new Date();
      listing.promoted_started_at = now;
      listing.promoted_paused_at = null;

      if (days === null) {
        listing.promoted_until = null;
      } else if (days && days > 0) {
        const until = new Date();
        until.setDate(until.getDate() + days);
        listing.promoted_until = until;
      } else {
        const until = new Date();
        until.setDate(until.getDate() + 7);
        listing.promoted_until = until;
      }

      if (!wasPromoted && listing.user_id) {
        const promotionSource: PromotionSource = days === null ? 'admin_unlimited' : 'duration';
        await this.listingsService.createPromotionHistory(
          listing.id,
          listing.user_id,
          listing.title,
          days ?? null,
          promotionSource,
        );
      }
    } else {
      listing.promoted_until = null;
      listing.promoted_started_at = null;
      listing.promoted_paused_at = null;

      if (wasPromoted) {
        await this.listingsService.updatePromotionHistoryEndDate(listing.id);
      }
    }

    try {
      await this.listingCache.invalidateSearch();
      await this.listingCache.invalidateSingle(id);
    } catch {
      // Ignore cache errors
    }

    return await this.listingsRepository.save(listing);
  }

  async getAllPromotions(
    page: number = 1,
    limit: number = 50,
    listingId?: string,
    userId?: string,
    fromDate?: Date,
  ): Promise<{
    data: Array<PromotionHistory & { listing_status?: ListingStatusEnum; listing_id: string }>;
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    return this.listingsService.getAdminPromotions({ page, limit, listingId, userId, fromDate });
  }
}
