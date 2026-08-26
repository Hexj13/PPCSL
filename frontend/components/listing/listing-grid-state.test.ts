/** @jest-environment jsdom */

import type { Listing, PaginationMeta } from '@/lib/api';
import { listingsApi } from '@/lib/api';

import {
  fetchListingsPage,
  fetchUniqueListingAppendPages,
  listingGridHasMore,
  mergeUniqueListings,
  saveGridState,
  shouldBackfillListingAppend,
  shouldRestoreGridStateOnMount,
} from './listing-grid-state';

jest.mock('@/lib/api', () => ({
  listingsApi: {
    getAll: jest.fn(),
  },
}));

function createListing(id: string): Listing {
  return { id } as Listing;
}

describe('shouldRestoreGridStateOnMount', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('does not restore grid state on a direct home reload with stale scroll keys', () => {
    saveGridState([createListing('listing-1')], 1, null, 'body_types=Minivan');
    window.sessionStorage.setItem('homeScrollPosition', '1200');
    window.sessionStorage.setItem('homeScrollTimestamp', String(Date.now()));
    window.sessionStorage.setItem('homeScrollListingId', 'listing-1');
    window.sessionStorage.setItem('homeScrollLastRestPath', '/');

    expect(shouldRestoreGridStateOnMount('body_types=Minivan')).toBe(false);
  });

  it('restores grid state after returning from a listing detail page', () => {
    saveGridState([createListing('listing-1')], 1, null, 'body_types=Minivan');
    window.sessionStorage.setItem('homeScrollPosition', '1200');
    window.sessionStorage.setItem('homeScrollTimestamp', String(Date.now()));
    window.sessionStorage.setItem('homeScrollListingId', 'listing-1');
    window.sessionStorage.setItem('homeScrollLastRestPath', '/listings/listing-1');

    expect(shouldRestoreGridStateOnMount('body_types=Minivan')).toBe(true);
  });
});

describe('mergeUniqueListings', () => {
  it('appends only listings whose ids are not already present', () => {
    const existing = [createListing('a'), createListing('b'), createListing('a')];
    const incoming = [createListing('b'), createListing('c'), createListing('d')];

    expect(mergeUniqueListings(existing, incoming)).toEqual({
      listings: [createListing('a'), createListing('b'), createListing('c'), createListing('d')],
      uniqueNew: [createListing('c'), createListing('d')],
    });
  });
});

describe('listingGridHasMore', () => {
  it('is true when nextCursor is present even if the offset page looks complete', () => {
    const meta: PaginationMeta = {
      page: 3,
      limit: 20,
      total: 60,
      totalPages: 3,
      nextCursor: 'abc',
    };
    expect(listingGridHasMore(meta, 3)).toBe(true);
  });

  it('falls back to totalPages when nextCursor is absent', () => {
    const meta: PaginationMeta = { page: 1, limit: 20, total: 40, totalPages: 2 };
    expect(listingGridHasMore(meta, 1)).toBe(true);
    expect(listingGridHasMore(meta, 2)).toBe(false);
  });
});

describe('shouldBackfillListingAppend', () => {
  it('backfills while unique new count is below the page size and more results exist', () => {
    expect(
      shouldBackfillListingAppend({
        uniqueNewCount: 18,
        limit: 20,
        extraFetchesUsed: 0,
        hasMore: true,
      }),
    ).toBe(true);
  });

  it('stops after the extra-fetch cap', () => {
    expect(
      shouldBackfillListingAppend({
        uniqueNewCount: 18,
        limit: 20,
        extraFetchesUsed: 2,
        hasMore: true,
      }),
    ).toBe(false);
  });
});

describe('fetchListingsPage', () => {
  beforeEach(() => {
    (listingsApi.getAll as jest.Mock).mockReset();
  });

  it('sends cursor and omits page when a keyset cursor is provided', async () => {
    (listingsApi.getAll as jest.Mock).mockResolvedValue({
      data: { data: [createListing('n')], meta: { page: 1, limit: 20, total: 40, totalPages: 2 } },
    });

    await fetchListingsPage({ page: 1, limit: 20, vehicleType: 'car' }, 2, undefined, 'cursor-1');

    expect(listingsApi.getAll).toHaveBeenCalledWith(
      { limit: 20, vehicleType: 'car', cursor: 'cursor-1' },
      undefined,
    );
  });

  it('sends the requested page when no cursor is provided', async () => {
    (listingsApi.getAll as jest.Mock).mockResolvedValue({
      data: { data: [], meta: { page: 2, limit: 20, total: 40, totalPages: 2 } },
    });

    await fetchListingsPage({ page: 1, limit: 20 }, 2);

    expect(listingsApi.getAll).toHaveBeenCalledWith({ limit: 20, page: 2 }, undefined);
  });
});

describe('fetchUniqueListingAppendPages', () => {
  beforeEach(() => {
    (listingsApi.getAll as jest.Mock).mockReset();
  });

  it('backfills until a full unique page is collected', async () => {
    (listingsApi.getAll as jest.Mock)
      .mockResolvedValueOnce({
        data: {
          data: [createListing('a'), createListing('c')],
          meta: { page: 2, limit: 2, total: 6, totalPages: 3, nextCursor: 'c2' },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [createListing('d')],
          meta: { page: 3, limit: 2, total: 6, totalPages: 3, nextCursor: 'c3' },
        },
      });

    const result = await fetchUniqueListingAppendPages({
      params: { limit: 2 },
      startPage: 2,
      cursor: 'c1',
      existing: [createListing('a'), createListing('b')],
      limit: 2,
      signal: new AbortController().signal,
    });

    expect(result?.uniqueNew.map((listing) => listing.id)).toEqual(['c', 'd']);
    expect(result?.listings.map((listing) => listing.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(listingsApi.getAll).toHaveBeenCalledTimes(2);
  });
});
