'use client';

import type { Listing, PaginationMeta } from '@/lib/api';

import { saveGridState } from './listing-grid-state';

type ListingGridReturnSnapshot = {
  listings: Listing[];
  page: number;
  meta: PaginationMeta | null;
  searchParamsString: string;
};

let latestListingGridReturnSnapshot: ListingGridReturnSnapshot | null = null;

export function updateListingGridReturnSnapshot(snapshot: ListingGridReturnSnapshot | null): void {
  latestListingGridReturnSnapshot = snapshot;
}

export function persistListingGridReturnSnapshot(): void {
  const snapshot = latestListingGridReturnSnapshot;
  if (!snapshot || snapshot.listings.length === 0) {
    return;
  }
  saveGridState(snapshot.listings, snapshot.page, snapshot.meta, snapshot.searchParamsString);
}
