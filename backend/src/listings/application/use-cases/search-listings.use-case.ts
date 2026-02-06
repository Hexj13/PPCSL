import { Inject, Injectable } from '@nestjs/common';

import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { removePasswordFromUser } from '../../../common/utils/error-handling.utils';
import { Listing } from '../../entities/listing.entity';
import { IListingCache, LISTING_CACHE } from '../ports/listing-cache.port';
import {
  IListingRepository,
  LISTING_REPOSITORY,
  SearchCriteria,
} from '../ports/listing.repository.port';

export interface SearchListingsResult {
  data: Listing[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class SearchListingsUseCase {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepo: IListingRepository,
    @Inject(LISTING_CACHE)
    private readonly listingCache: IListingCache,
  ) {}

  async execute(criteria: SearchCriteria): Promise<SearchListingsResult> {
    const { page = 1, limit = 20 } = criteria;

    const cached = await this.listingCache.getSearchResults(criteria);
    if (cached) {
      return {
        data: cached.data,
        meta: {
          total: cached.total,
          page,
          limit,
          totalPages: Math.ceil(cached.total / limit),
        },
      };
    }

    const { data: listings, total } = await this.listingRepo.search(criteria);
    const masked = this.maskListings(listings);

    await this.listingCache.setSearchResults(criteria, { data: masked, total });

    return {
      data: masked,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private maskListings(listings: Listing[]): Listing[] {
    return listings.map((listing) => {
      if (listing.user) {
        listing.user = removePasswordFromUser(listing.user) as typeof listing.user;
        if (
          listing.status === ListingStatusEnum.Closed ||
          (!listing.user.email && !listing.user.phone)
        ) {
          listing.user.phone = null;
          listing.user.email = null;
          listing.user.firstName = null;
          listing.user.lastName = null;
          listing.user.companyName = null;
          listing.user.companyWebsiteUrl = null;
        }
      }
      return listing;
    });
  }
}
