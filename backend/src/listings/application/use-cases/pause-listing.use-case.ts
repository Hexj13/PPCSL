import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { Listing } from '../../entities/listing.entity';
import { IListingCache, LISTING_CACHE } from '../ports/listing-cache.port';
import { IListingRepository, LISTING_REPOSITORY } from '../ports/listing.repository.port';

@Injectable()
export class PauseListingUseCase {
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

    listing.pause();
    const saved = await this.listingRepo.save(listing);
    await this.listingCache.invalidateSearch();
    await this.listingCache.invalidateSingle(listingId);
    return saved;
  }
}
