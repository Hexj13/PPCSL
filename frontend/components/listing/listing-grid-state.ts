'use client';

import type { Listing, PaginationMeta } from '@/lib/api';
import { listingsApi } from '@/lib/api';
import {
  sessionStorageGetItem,
  sessionStorageRemoveItem,
  sessionStorageSetItem,
} from '@/lib/browser-session-storage';
import { LISTING_GRID_PAGE_SIZE } from '@/lib/constants';
import { shouldRestoreHomeScrollAfterPath } from '@/lib/preserve-home-scroll';
import { getParsedListingSearchParams } from '@/lib/search';

export const GRID_STATE_KEY = 'ppcsl_grid_state';
export const GRID_RESTORE_STATE_KEY = 'ppcsl_grid_restore_state';
export const LISTING_GRID_APPEND_MAX_EXTRA_FETCHES = 2;
const HOME_SCROLL_LAST_REST_PATH_KEY = 'homeScrollLastRestPath';

const GRID_STATE_MAX_AGE_MS = 5 * 60 * 1000;

type SavedGridState = {
  listings?: Listing[];
  page: number;
  meta: PaginationMeta | null;
  searchParamsString: string;
  timestamp: number;
};

function readSavedGridState(key: string): SavedGridState | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = sessionStorageGetItem(key);
    if (!stored) return null;
    const state = JSON.parse(stored) as Partial<SavedGridState>;
    const savedTime = Number(state.timestamp);
    const page = state.page;
    if (!Number.isFinite(savedTime) || Date.now() - savedTime > GRID_STATE_MAX_AGE_MS) {
      sessionStorageRemoveItem(key);
      return null;
    }
    if (
      typeof page !== 'number' ||
      !Number.isInteger(page) ||
      page < 1 ||
      typeof state.searchParamsString !== 'string'
    ) {
      sessionStorageRemoveItem(key);
      return null;
    }
    return {
      listings: Array.isArray(state.listings) ? state.listings : undefined,
      page,
      meta: state.meta ?? null,
      searchParamsString: state.searchParamsString,
      timestamp: savedTime,
    };
  } catch {
    return null;
  }
}

export const saveGridState = (
  listings: Listing[],
  page: number,
  meta: PaginationMeta | null,
  searchParamsString: string,
) => {
  if (typeof window !== 'undefined') {
    const restoreState = { page, meta, searchParamsString, timestamp: Date.now() };
    sessionStorageSetItem(GRID_RESTORE_STATE_KEY, JSON.stringify(restoreState));
    try {
      const state = { ...restoreState, listings };
      sessionStorageSetItem(GRID_STATE_KEY, JSON.stringify(state));
    } catch {
      sessionStorageRemoveItem(GRID_STATE_KEY);
    }
  }
};

const loadGridState = (): SavedGridState | null => {
  const restoreState = readSavedGridState(GRID_RESTORE_STATE_KEY);
  const fullState = readSavedGridState(GRID_STATE_KEY);

  if (!restoreState) return fullState;
  if (
    fullState?.listings &&
    fullState.page === restoreState.page &&
    fullState.searchParamsString === restoreState.searchParamsString
  ) {
    return { ...fullState, meta: fullState.meta ?? restoreState.meta };
  }
  return restoreState;
};

function gridStateMatchesCurrentSearch(
  saved: ReturnType<typeof loadGridState>,
  searchParamsString: string,
): saved is NonNullable<ReturnType<typeof loadGridState>> {
  return Boolean(saved && saved.page > 1 && saved.searchParamsString === searchParamsString);
}

function isListingReturnFirstPageRestore(
  saved: NonNullable<ReturnType<typeof loadGridState>>,
  searchParamsString: string,
): boolean {
  return (
    saved.page === 1 &&
    saved.searchParamsString === searchParamsString &&
    Boolean(saved.listings?.length) &&
    Boolean(sessionStorageGetItem('homeScrollListingId'))
  );
}

export function getRestorableGridState(shouldRestore: boolean, searchParamsString: string) {
  if (!shouldRestore) return null;
  const saved = loadGridState();
  if (!saved || saved.searchParamsString !== searchParamsString) {
    return null;
  }
  if (gridStateMatchesCurrentSearch(saved, searchParamsString)) {
    return saved;
  }
  if (isListingReturnFirstPageRestore(saved, searchParamsString)) {
    return saved;
  }
  return null;
}

export function shouldRestoreGridStateOnMount(searchParamsString: string): boolean {
  if (typeof window === 'undefined') return false;
  const previousRestPath = sessionStorageGetItem(HOME_SCROLL_LAST_REST_PATH_KEY);
  if (!shouldRestoreHomeScrollAfterPath(previousRestPath)) {
    return false;
  }
  if (!sessionStorageGetItem('homeScrollTimestamp')) {
    return false;
  }
  return getRestorableGridState(true, searchParamsString) !== null;
}

export function getVehicleTypeFromParams(searchParamsString: string): 'car' | 'truck' | 'moto' {
  const params = new URLSearchParams(searchParamsString);
  const vehicleTypeParam = params.get('vehicleType') as 'car' | 'truck' | 'moto' | null;
  return vehicleTypeParam && ['car', 'truck', 'moto'].includes(vehicleTypeParam)
    ? vehicleTypeParam
    : 'car';
}

export async function buildFetchParams(searchParamsString: string) {
  const vehicleType = getVehicleTypeFromParams(searchParamsString);
  const parsedParams = await getParsedListingSearchParams(searchParamsString, vehicleType);
  const isTireCategory = parsedParams.category === 'tire';
  const limitFromParams = Number(parsedParams.limit);
  const hasValidLimitInSearch =
    Number.isFinite(limitFromParams) && Number.isInteger(limitFromParams) && limitFromParams > 0;
  let urlHasExplicitLimit = false;
  try {
    urlHasExplicitLimit = new URLSearchParams(searchParamsString).has('limit');
  } catch {
    urlHasExplicitLimit = false;
  }
  const effectiveLimit =
    urlHasExplicitLimit && hasValidLimitInSearch ? limitFromParams : LISTING_GRID_PAGE_SIZE;
  return {
    ...parsedParams,
    ...(!isTireCategory ? { vehicleType } : {}),
    limit: effectiveLimit,
  } as Record<string, string | number | boolean>;
}

export function mergeUniqueListings(
  existing: Listing[],
  incoming: Listing[],
): { listings: Listing[]; uniqueNew: Listing[] } {
  const listings: Listing[] = [];
  const seen = new Set<string>();
  for (const listing of existing) {
    if (seen.has(listing.id)) continue;
    seen.add(listing.id);
    listings.push(listing);
  }
  const uniqueNew: Listing[] = [];
  for (const listing of incoming) {
    if (seen.has(listing.id)) continue;
    seen.add(listing.id);
    listings.push(listing);
    uniqueNew.push(listing);
  }
  return { listings, uniqueNew };
}

export function listingGridHasMore(meta: PaginationMeta | null, currentPage: number): boolean {
  if (!meta) return false;
  if (meta.nextCursor) return true;
  return Boolean(meta.totalPages && currentPage < meta.totalPages);
}

export function shouldBackfillListingAppend({
  uniqueNewCount,
  limit,
  extraFetchesUsed,
  hasMore,
  maxExtraFetches = LISTING_GRID_APPEND_MAX_EXTRA_FETCHES,
}: {
  uniqueNewCount: number;
  limit: number;
  extraFetchesUsed: number;
  hasMore: boolean;
  maxExtraFetches?: number;
}): boolean {
  return hasMore && uniqueNewCount < limit && extraFetchesUsed < maxExtraFetches;
}

export async function fetchListingsPage(
  params: Record<string, string | number | boolean>,
  page: number,
  signal?: AbortSignal,
  cursor?: string,
): Promise<{ data: Listing[]; meta: PaginationMeta }> {
  const paramsWithoutPage = { ...params };
  delete paramsWithoutPage.page;
  const requestParams = cursor ? { ...paramsWithoutPage, cursor } : { ...paramsWithoutPage, page };
  const res = await listingsApi.getAll(requestParams, signal ? { signal } : undefined);
  return { data: res.data.data, meta: res.data.meta };
}

export async function fetchUniqueListingAppendPages({
  params,
  startPage,
  cursor,
  existing,
  limit,
  signal,
}: {
  params: Record<string, string | number | boolean>;
  startPage: number;
  cursor?: string;
  existing: Listing[];
  limit: number;
  signal: AbortSignal;
}): Promise<{
  listings: Listing[];
  uniqueNew: Listing[];
  meta: PaginationMeta | null;
  page: number;
} | null> {
  const originalUnique = mergeUniqueListings([], existing).listings;
  let combined = originalUnique;
  let lastMeta: PaginationMeta | null = null;
  let lastPage = startPage;
  let extraFetchesUsed = 0;
  let nextCursor = cursor;

  while (true) {
    const pageRes = await fetchListingsPage(params, lastPage, signal, nextCursor);
    if (signal.aborted) return null;
    combined = mergeUniqueListings(combined, pageRes.data).listings;
    lastMeta = pageRes.meta;
    const uniqueAdded = combined.length - originalUnique.length;
    const hasMore = listingGridHasMore(pageRes.meta, lastPage);
    if (
      !shouldBackfillListingAppend({
        uniqueNewCount: uniqueAdded,
        limit,
        extraFetchesUsed,
        hasMore,
      })
    ) {
      break;
    }
    extraFetchesUsed += 1;
    lastPage += 1;
    nextCursor = pageRes.meta.nextCursor;
  }

  return {
    listings: combined,
    uniqueNew: combined.slice(originalUnique.length),
    meta: lastMeta,
    page: lastPage,
  };
}

export async function fetchListingsThroughPage(
  searchParamsString: string,
  targetPage: number,
  signal?: AbortSignal,
): Promise<{ data: Listing[]; meta: PaginationMeta | null }> {
  const params = await buildFetchParams(searchParamsString);
  const pages = Array.from({ length: targetPage }, (_, index) => index + 1);
  const results = await Promise.all(pages.map((page) => fetchListingsPage(params, page, signal)));
  return {
    data: results.flatMap((result) => result.data),
    meta: results.at(-1)?.meta ?? null,
  };
}
