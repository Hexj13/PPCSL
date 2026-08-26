import type { ModelIndexData } from '../../domain/model-index.types';
import type { PopularListingsData } from '../../domain/popular-listings.types';
import type { Listing } from '../../entities/listing.entity';

import type { SearchCriteria } from './listing.repository.port';

export const LISTING_CACHE = Symbol('LISTING_CACHE');

export type ListingSearchCachePayload = {
  data: Listing[];
  total: number;
  nextCursor?: string;
};

export interface IListingCache {
  getSearchResults(criteria: SearchCriteria): Promise<ListingSearchCachePayload | null>;
  setSearchResults(criteria: SearchCriteria, results: ListingSearchCachePayload): Promise<void>;
  getSearchCount(criteria: SearchCriteria): Promise<number | null>;
  setSearchCount(criteria: SearchCriteria, total: number): Promise<void>;
  getSingle(id: string): Promise<Listing | null>;
  setSingle(id: string, listing: Listing, ttl: number): Promise<void>;
  invalidateSearch(): Promise<void>;
  invalidateSingle(id: string): Promise<void>;
  invalidateSimilar(listingId: string): Promise<void>;
  getSimilarResults(listingId: string): Promise<Listing[] | null>;
  setSimilarResults(listingId: string, listings: Listing[]): Promise<void>;
  getPopularListings(): Promise<PopularListingsData | null>;
  setPopularListings(data: PopularListingsData): Promise<void>;
  getModelIndex(): Promise<ModelIndexData | null>;
  setModelIndex(data: ModelIndexData): Promise<void>;
}
