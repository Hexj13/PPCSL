import type { Listing } from '../../entities/listing.entity';

import type { SearchCriteria } from './listing.repository.port';

export const LISTING_CACHE = Symbol('LISTING_CACHE');

export interface IListingCache {
  getSearchResults(criteria: SearchCriteria): Promise<{ data: Listing[]; total: number } | null>;
  setSearchResults(
    criteria: SearchCriteria,
    results: { data: Listing[]; total: number },
  ): Promise<void>;
  getSearchCount(criteria: SearchCriteria): Promise<number | null>;
  setSearchCount(criteria: SearchCriteria, total: number): Promise<void>;
  getSingle(id: string): Promise<Listing | null>;
  setSingle(id: string, listing: Listing, ttl: number): Promise<void>;
  invalidateSearch(): Promise<void>;
  invalidateSingle(id: string): Promise<void>;
  invalidateSimilar(listingId: string): Promise<void>;
  getSimilarResults(listingId: string): Promise<Listing[] | null>;
  setSimilarResults(listingId: string, listings: Listing[]): Promise<void>;
}
