import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { logUserEvent } from '../../../common/utils/log-user-event';
import { Listing } from '../../entities/listing.entity';
import { IListingCache, LISTING_CACHE } from '../ports/listing-cache.port';
import { IListingRepository, LISTING_REPOSITORY } from '../ports/listing.repository.port';

@Injectable()
export class PauseListingUseCase {
  private readonly logger = new Logger(PauseListingUseCase.name);

  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepo: IListingRepository,
    @Inject(LISTING_CACHE)
    private readonly listingCache: IListingCache,
  ) {}

  async execute(listingId: string, userId: string): Promise<Listing> {
    const listing = await this.listingRepo.findById(listingId);
    if (!listing) {
      throw new NotFoundException('errors.listingNotFound');
    }
    if (listing.user_id !== userId) {
      throw new ForbiddenException('errors.listingAccessDenied');
    }

    const previousStatus = listing.status;
    listing.pause();
    const saved = await this.listingRepo.save(listing);
    await this.listingCache.invalidateSearch();
    await this.listingCache.invalidateSimilar(listingId);
    await this.listingCache.invalidateSingle(listingId);
    logUserEvent(this.logger, {
      event: 'listing_paused',
      userId,
      listingId,
      previousStatus,
      newStatus: saved.status,
    });
    return saved;
  }
}
