import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { logUserEvent } from '../../../common/utils/log-user-event';
import { Listing } from '../../entities/listing.entity';
import { ListingVideoService } from '../../video/listing-video.service';
import { ListingAiReportService } from '../listing-ai-report.service';
import { IListingCache, LISTING_CACHE } from '../ports/listing-cache.port';
import { IListingRepository, LISTING_REPOSITORY } from '../ports/listing.repository.port';
import { IPromotionHistoryWriter, PROMOTION_HISTORY_WRITER } from '../ports/promotion-history.port';

@Injectable()
export class CloseListingUseCase {
  private readonly logger = new Logger(CloseListingUseCase.name);

  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepo: IListingRepository,
    @Inject(LISTING_CACHE)
    private readonly listingCache: IListingCache,
    @Inject(PROMOTION_HISTORY_WRITER)
    private readonly promotionHistory: IPromotionHistoryWriter,
    private readonly listingAiReportService: ListingAiReportService,
    private readonly listingVideoService: ListingVideoService,
  ) {}

  async execute(listingId: string, userId: string): Promise<Listing> {
    const listing = await this.listingRepo.findById(listingId);
    if (!listing) {
      throw new NotFoundException('errors.listingNotFound');
    }
    if (listing.user_id !== userId) {
      throw new ForbiddenException('errors.listingAccessDenied');
    }

    const wasPromoted = listing.isPromoted();
    const previousStatus = listing.status;
    await this.listingVideoService.purgeListingVideoFromListing(listing);
    listing.close();
    const saved = await this.listingRepo.save(listing);

    await this.listingAiReportService.deleteByListingId(listingId);

    if (wasPromoted) {
      await this.promotionHistory.updateEndDateForListing(listingId);
    }

    await this.listingCache.invalidateSearch();
    await this.listingCache.invalidateSimilar(listingId);
    await this.listingCache.invalidateSingle(listingId);
    logUserEvent(this.logger, {
      event: 'listing_closed',
      userId,
      listingId,
      previousStatus,
      newStatus: saved.status,
    });
    return saved;
  }
}
