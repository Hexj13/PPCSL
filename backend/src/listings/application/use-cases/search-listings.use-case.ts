import { Inject, Injectable } from '@nestjs/common';

import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { removePasswordFromUser } from '../../../common/utils/error-handling.utils';
import { ExchangeRatesService } from '../../../exchange-rates/exchange-rates.service';
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
  private static readonly MAX_SEARCH_IMAGES = 5;

  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepo: IListingRepository,
    @Inject(LISTING_CACHE)
    private readonly listingCache: IListingCache,
    private readonly exchangeRatesService: ExchangeRatesService,
  ) {}

  async execute(criteria: SearchCriteria): Promise<SearchListingsResult> {
    const { page = 1, limit = 20 } = criteria;

    const cached = await this.listingCache.getSearchResults(criteria);
    if (cached) {
      const enriched = await this.exchangeRatesService.enrichListingsWithApproxPrice(cached.data);
      return {
        data: enriched,
        meta: {
          total: cached.total,
          page,
          limit,
          totalPages: Math.ceil(cached.total / limit),
        },
      };
    }

    const searchCriteria = await this.ensurePriceSortRates(criteria);
    const { data: listings, total } = await this.listingRepo.search(searchCriteria);
    const masked = this.maskListings(listings);
    const enriched = await this.exchangeRatesService.enrichListingsWithApproxPrice(masked);

    await this.listingCache.setSearchResults(criteria, { data: masked, total });

    return {
      data: enriched,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async ensurePriceSortRates(criteria: SearchCriteria): Promise<SearchCriteria> {
    const sortBy = criteria.sortBy ?? 'created_at';
    if (sortBy !== 'price') return criteria;

    const { defaultCurrency, rates } = await this.exchangeRatesService.getAllRatesMap();
    return {
      ...criteria,
      defaultCurrency,
      priceSortRates: rates,
    };
  }

  private maskListings(listings: Listing[]): Listing[] {
    return listings.map((listing) => {
      if (listing.images && listing.images.length > SearchListingsUseCase.MAX_SEARCH_IMAGES) {
        listing.images = listing.images.slice(0, SearchListingsUseCase.MAX_SEARCH_IMAGES);
      }
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
