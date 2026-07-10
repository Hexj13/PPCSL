import { Inject, Injectable } from '@nestjs/common';

import type { PopularListingsData } from '../../domain/popular-listings.types';
import { IListingCache, LISTING_CACHE } from '../ports/listing-cache.port';
import { IListingRepository, LISTING_REPOSITORY } from '../ports/listing.repository.port';

@Injectable()
export class GetPopularListingsUseCase {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepo: IListingRepository,
    @Inject(LISTING_CACHE)
    private readonly listingCache: IListingCache,
  ) {}

  async execute(options?: { forceRefresh?: boolean }): Promise<PopularListingsData> {
    if (!options?.forceRefresh) {
      const cached = await this.listingCache.getPopularListings();
      if (cached) {
        return cached;
      }
    }

    const aggregates = await this.listingRepo.getPopularListingsAggregates();
    const data: PopularListingsData = {
      generatedAt: new Date().toISOString(),
      ...aggregates,
    };
    await this.listingCache.setPopularListings(data);
    return data;
  }
}
