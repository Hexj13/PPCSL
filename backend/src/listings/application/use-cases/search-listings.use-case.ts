import { Inject, Injectable } from '@nestjs/common';

import { MetricsService } from '../../../common/metrics/metrics.service';
import { ExchangeRatesService } from '../../../exchange-rates/exchange-rates.service';
import { Listing } from '../../entities/listing.entity';
import { ListingPublicViewMapper } from '../mappers/listing-public-view.mapper';
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
    nextCursor?: string;
  };
}

@Injectable()
export class SearchListingsUseCase {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepo: IListingRepository,
    @Inject(LISTING_CACHE)
    private readonly listingCache: IListingCache,
    private readonly exchangeRatesService: ExchangeRatesService,
    private readonly listingPublicViewMapper: ListingPublicViewMapper,
    private readonly metricsService: MetricsService,
  ) {}

  async execute(criteria: SearchCriteria): Promise<SearchListingsResult> {
    const { page = 1, limit = 20 } = criteria;

    const cached = criteria.cursor ? null : await this.listingCache.getSearchResults(criteria);
    if (cached) {
      this.metricsService.incrementCacheHit('listings_search');
      const enriched = await this.exchangeRatesService.enrichListingsWithApproxPrice(cached.data);
      return {
        data: enriched,
        meta: {
          total: cached.total,
          page,
          limit,
          totalPages: Math.ceil(cached.total / limit),
          nextCursor: cached.nextCursor,
        },
      };
    }

    if (!criteria.cursor) {
      this.metricsService.incrementCacheMiss('listings_search');
    }

    const cachedTotal = await this.listingCache.getSearchCount(criteria);
    const searchCriteria = await this.ensurePriceSortRates(
      cachedTotal !== null ? { ...criteria, knownTotal: cachedTotal } : criteria,
    );
    const { data: listings, total, nextCursor } = await this.listingRepo.search(searchCriteria);
    const masked = this.listingPublicViewMapper.toListViews(listings);
    const enriched = await this.exchangeRatesService.enrichListingsWithApproxPrice(masked);

    if (cachedTotal === null) {
      await this.listingCache.setSearchCount(criteria, total);
    }
    if (!criteria.cursor) {
      await this.listingCache.setSearchResults(criteria, { data: masked, total, nextCursor });
    }

    return {
      data: enriched,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        nextCursor,
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
}
