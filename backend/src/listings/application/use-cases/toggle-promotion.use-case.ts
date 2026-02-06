import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PromotionRulesService } from '../../domain/services/promotion-rules.service';
import { Listing } from '../../entities/listing.entity';
import { IListingCache, LISTING_CACHE } from '../ports/listing-cache.port';
import { IListingRepository, LISTING_REPOSITORY } from '../ports/listing.repository.port';
import { IPromotionHistoryWriter, PROMOTION_HISTORY_WRITER } from '../ports/promotion-history.port';

@Injectable()
export class TogglePromotionUseCase {
  private readonly validDays = [1, 7, 14, 30];

  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepo: IListingRepository,
    @Inject(LISTING_CACHE)
    private readonly listingCache: IListingCache,
    @Inject(PROMOTION_HISTORY_WRITER)
    private readonly promotionHistory: IPromotionHistoryWriter,
    private readonly promotionRulesService: PromotionRulesService,
  ) {}

  async execute(
    listingId: string,
    userId: string,
    userType: string | undefined,
    isPromoted: boolean,
    days: number | null,
  ): Promise<Listing> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(listingId)) {
      throw new BadRequestException('errors.invalidListingId');
    }

    const listing = await this.listingRepo.findById(listingId);
    if (!listing) {
      throw new NotFoundException('errors.listingNotFound');
    }
    if (listing.user_id !== userId) {
      throw new ForbiddenException('errors.listingAccessDenied');
    }

    if (isPromoted && days !== null && !this.validDays.includes(days)) {
      throw new BadRequestException('errors.invalidPromotionPeriod');
    }

    const accessStatus = this.promotionRulesService.getPromotionAccessStatus(userType);
    if (!accessStatus.canPromote) {
      throw new ForbiddenException(
        accessStatus.access === 'disabled'
          ? 'errors.promotionDisabled'
          : 'errors.promotionAdminOnly',
      );
    }

    const wasPromoted = listing.isPromoted();

    if (isPromoted && !wasPromoted) {
      const activePromotionsCount = await this.listingRepo.countPromotedByUser(userId);
      const maxPromotions = this.promotionRulesService.getMaxPromotedListings();
      if (activePromotionsCount >= maxPromotions) {
        throw new BadRequestException(`errors.maxPromotionsReached|${maxPromotions}`);
      }
      try {
        listing.startPromotion(days !== undefined && days !== null ? days : 7);
      } catch (e) {
        if (e instanceof Error && e.message === 'errors.promotionOnlyActive') {
          throw new BadRequestException('errors.promotionOnlyActive');
        }
        throw e;
      }
      await this.promotionHistory.create({
        listing_id: listingId,
        user_id: userId,
        listing_title: listing.title,
        started_at: new Date(),
        ended_at: null,
        days,
      });
    } else if (wasPromoted && !isPromoted) {
      listing.stopPromotion();
      await this.promotionHistory.updateEndDateForListing(listingId);
    } else if (!isPromoted) {
      listing.stopPromotion();
    }

    const saved = await this.listingRepo.save(listing);
    await this.listingCache.invalidateSearch();
    await this.listingCache.invalidateSingle(listingId);
    return saved;
  }
}
