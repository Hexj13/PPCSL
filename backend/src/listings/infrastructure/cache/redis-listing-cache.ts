import { Injectable } from '@nestjs/common';

import { RedisService } from '../../../common/redis.service';
import {
  CACHE_PREFIXES,
  CACHE_TTL,
  generateCacheKey,
  generateCacheKeyWithHash,
} from '../../../common/utils/cache.utils';
import { IListingCache } from '../../application/ports/listing-cache.port';
import { SearchCriteria } from '../../application/ports/listing.repository.port';
import { Listing } from '../../entities/listing.entity';

@Injectable()
export class RedisListingCache implements IListingCache {
  constructor(private readonly redisService: RedisService) {}

  async getSearchResults(
    criteria: SearchCriteria,
  ): Promise<{ data: Listing[]; total: number } | null> {
    const key = generateCacheKeyWithHash(CACHE_PREFIXES.listingsSearch, criteria);
    return this.redisService.getJson<{ data: Listing[]; total: number }>(key);
  }

  async setSearchResults(
    criteria: SearchCriteria,
    results: { data: Listing[]; total: number },
  ): Promise<void> {
    const key = generateCacheKeyWithHash(CACHE_PREFIXES.listingsSearch, criteria);
    await this.redisService.setJson(key, results, CACHE_TTL.listings.search);
  }

  async getSearchCount(criteria: SearchCriteria): Promise<number | null> {
    const key = generateCacheKeyWithHash(
      CACHE_PREFIXES.listingsSearchCount,
      this.countCriteria(criteria),
    );
    const cached = await this.redisService.getJson<{ total: number }>(key);
    return cached ? cached.total : null;
  }

  async setSearchCount(criteria: SearchCriteria, total: number): Promise<void> {
    const key = generateCacheKeyWithHash(
      CACHE_PREFIXES.listingsSearchCount,
      this.countCriteria(criteria),
    );
    await this.redisService.setJson(key, { total }, CACHE_TTL.listings.search);
  }

  private countCriteria(criteria: SearchCriteria): Partial<SearchCriteria> {
    const {
      page: _page,
      limit: _limit,
      cursor: _cursor,
      sortBy: _sortBy,
      sortOrder: _sortOrder,
      defaultCurrency: _defaultCurrency,
      priceSortRates: _priceSortRates,
      ...filters
    } = criteria;
    void _page;
    void _limit;
    void _cursor;
    void _sortBy;
    void _sortOrder;
    void _defaultCurrency;
    void _priceSortRates;
    return filters;
  }

  async getSingle(id: string): Promise<Listing | null> {
    const key = generateCacheKey({ prefix: CACHE_PREFIXES.listings, parts: [id] });
    return this.redisService.getJson<Listing>(key);
  }

  async setSingle(id: string, listing: Listing, ttl: number): Promise<void> {
    const key = generateCacheKey({ prefix: CACHE_PREFIXES.listings, parts: [id] });
    await this.redisService.setJson(key, listing, ttl);
  }

  async invalidateSearch(): Promise<void> {
    await this.redisService.invalidateByPrefix(CACHE_PREFIXES.listingsSearch);
  }

  async invalidateSingle(id: string): Promise<void> {
    const key = generateCacheKey({ prefix: CACHE_PREFIXES.listings, parts: [id] });
    await this.redisService.del(key);
  }

  async invalidateSimilar(listingId: string): Promise<void> {
    const key = generateCacheKey({ prefix: CACHE_PREFIXES.listingsSimilar, parts: [listingId] });
    await this.redisService.del(key);
  }

  async getSimilarResults(listingId: string): Promise<Listing[] | null> {
    const key = generateCacheKey({ prefix: CACHE_PREFIXES.listingsSimilar, parts: [listingId] });
    return this.redisService.getJson<Listing[]>(key);
  }

  async setSimilarResults(listingId: string, listings: Listing[]): Promise<void> {
    const key = generateCacheKey({ prefix: CACHE_PREFIXES.listingsSimilar, parts: [listingId] });
    await this.redisService.setJson(key, listings, CACHE_TTL.listings.similar);
  }
}
