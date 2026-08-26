'use client';

import { isAxiosError } from 'axios';
import { startTransition, useCallback, useRef, type Dispatch, type SetStateAction } from 'react';

import { analytics, listingToViewItemListEntry } from '@/lib/analytics';
import type { Listing, PaginationMeta } from '@/lib/api';
import { sessionStorageSetItem } from '@/lib/browser-session-storage';
import { LISTING_GRID_PAGE_SIZE, SEARCH_FILTERS_LIMIT_ERROR_TOAST_KEY } from '@/lib/constants';

import {
  LISTING_CARD_APPEND_PRELOAD_COUNT,
  prewarmListingCardCoverImages,
} from './listing-card-image';
import {
  buildFetchParams,
  fetchListingsPage,
  fetchUniqueListingAppendPages,
  saveGridState,
} from './listing-grid-state';

type MutableRef<T> = { current: T };

function handleSearchLimitOverflowError(
  error: unknown,
  searchParamsString: string,
  replaceLocalized: (_path: string) => void,
): boolean {
  if (!isAxiosError(error) || error.response?.status !== 400) return false;
  const errorKey = (error.response.data as { errorKey?: string } | undefined)?.errorKey;
  if (errorKey !== 'errors.searchBrandIdsLimit' && errorKey !== 'errors.searchModelIdsLimit') {
    return false;
  }
  if (typeof window !== 'undefined') {
    sessionStorageSetItem(
      SEARCH_FILTERS_LIMIT_ERROR_TOAST_KEY,
      'searchFilters.invalidUrlSelectionLimits',
    );
  }
  console.error('Search filters API rejected limit-overflow query', {
    errorKey,
    searchParams: searchParamsString,
  });
  replaceLocalized('/');
  return true;
}

function dispatchAnalyticsForNewListings(newListings: Listing[]) {
  if (newListings.length === 0) return;
  const items = newListings.map((listing) => listingToViewItemListEntry(listing));
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => analytics.viewItemList(items), { timeout: 500 });
  } else {
    setTimeout(() => analytics.viewItemList(items), 0);
  }
}

function resolveListingGridLimit(params: Record<string, string | number | boolean>): number {
  const limitFromParams = Number(params.limit);
  return Number.isFinite(limitFromParams) && limitFromParams > 0
    ? limitFromParams
    : LISTING_GRID_PAGE_SIZE;
}

type UseListingGridFetchArgs = {
  searchParamsString: string;
  t: (key: string) => string;
  checkFavorites: (listingIds: string[]) => Promise<void>;
  replaceLocalized: (_path: string) => void;
  setListings: Dispatch<SetStateAction<Listing[]>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setLoadingMore: Dispatch<SetStateAction<boolean>>;
  setAppendSkeletonCount: Dispatch<SetStateAction<number>>;
  setMeta: Dispatch<SetStateAction<PaginationMeta | null>>;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setHasLoadedWithFilters: Dispatch<SetStateAction<boolean>>;
  setListingsQueryKey: Dispatch<SetStateAction<string>>;
  listingsRef: MutableRef<Listing[]>;
};

type ListingGridFetchSetters = Pick<
  UseListingGridFetchArgs,
  | 'setListings'
  | 'setLoading'
  | 'setLoadingMore'
  | 'setAppendSkeletonCount'
  | 'setMeta'
  | 'setCurrentPage'
  | 'setError'
  | 'setHasLoadedWithFilters'
  | 'setListingsQueryKey'
  | 'listingsRef'
>;

async function replaceListingGridPage({
  params,
  page,
  signal,
  searchParamsString,
  checkFavorites,
  setters,
}: {
  params: Record<string, string | number | boolean>;
  page: number;
  signal: AbortSignal;
  searchParamsString: string;
  checkFavorites: (listingIds: string[]) => Promise<void>;
  setters: ListingGridFetchSetters;
}): Promise<boolean> {
  const firstRes = await fetchListingsPage(params, page, signal);
  if (signal.aborted) return false;
  const allNewListings = firstRes.data;

  await checkFavorites(allNewListings.map((listing) => listing.id));
  if (signal.aborted) return false;

  startTransition(() => {
    setters.setListings(allNewListings);
    setters.listingsRef.current = allNewListings;
    setters.setCurrentPage(1);
    setters.setLoading(false);
    setters.setLoadingMore(false);
    setters.setAppendSkeletonCount(0);
    setters.setMeta(firstRes.meta);
    setters.setError(null);
    setters.setHasLoadedWithFilters(true);
    setters.setListingsQueryKey(searchParamsString);
    dispatchAnalyticsForNewListings(allNewListings);
  });
  return true;
}

async function appendListingGridPages({
  params,
  page,
  cursor,
  signal,
  searchParamsString,
  checkFavorites,
  appendInFlightRef,
  setters,
}: {
  params: Record<string, string | number | boolean>;
  page: number;
  cursor?: string;
  signal: AbortSignal;
  searchParamsString: string;
  checkFavorites: (listingIds: string[]) => Promise<void>;
  appendInFlightRef: MutableRef<boolean>;
  setters: ListingGridFetchSetters;
}): Promise<boolean> {
  const appended = await fetchUniqueListingAppendPages({
    params,
    startPage: page,
    cursor,
    existing: setters.listingsRef.current,
    limit: resolveListingGridLimit(params),
    signal,
  });
  if (!appended || signal.aborted) return false;

  prewarmListingCardCoverImages(
    appended.uniqueNew
      .slice(0, LISTING_CARD_APPEND_PRELOAD_COUNT)
      .map((listing) => listing.images?.[0])
      .filter((url): url is string => Boolean(url)),
  );

  await checkFavorites(appended.uniqueNew.map((listing) => listing.id));
  if (signal.aborted) return false;

  startTransition(() => {
    setters.setListings(appended.listings);
    setters.listingsRef.current = appended.listings;
    setters.setCurrentPage(appended.page);
    setters.setMeta(appended.meta);
    saveGridState(appended.listings, appended.page, appended.meta, searchParamsString);
    setters.setLoadingMore(false);
    setters.setAppendSkeletonCount(0);
    appendInFlightRef.current = false;
  });
  return true;
}

function handleListingGridFetchError({
  error,
  append,
  searchParamsString,
  replaceLocalized,
  t,
  setters,
}: {
  error: unknown;
  append: boolean;
  searchParamsString: string;
  replaceLocalized: (_path: string) => void;
  t: (key: string) => string;
  setters: ListingGridFetchSetters;
}): void {
  if (handleSearchLimitOverflowError(error, searchParamsString, replaceLocalized)) return;
  if (append) {
    setters.setAppendSkeletonCount(0);
    return;
  }
  setters.setListings([]);
  setters.setError(t('listings.loadError'));
  setters.setHasLoadedWithFilters(true);
  setters.setListingsQueryKey(searchParamsString);
}

function finalizeListingGridFetch({
  aborted,
  append,
  appendCommitted,
  replaceCommitted,
  appendInFlightRef,
  setters,
}: {
  aborted: boolean;
  append: boolean;
  appendCommitted: boolean;
  replaceCommitted: boolean;
  appendInFlightRef: MutableRef<boolean>;
  setters: ListingGridFetchSetters;
}): void {
  if (aborted) {
    if (append) {
      appendInFlightRef.current = false;
      setters.setLoadingMore(false);
      setters.setAppendSkeletonCount(0);
    }
    return;
  }
  if (appendCommitted) return;
  setters.setLoadingMore(false);
  if (append) {
    appendInFlightRef.current = false;
    setters.setAppendSkeletonCount(0);
    return;
  }
  if (!replaceCommitted) {
    setters.setLoading(false);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('searchComplete'));
  }
}

export function useListingGridFetch({
  searchParamsString,
  t,
  checkFavorites,
  replaceLocalized,
  setListings,
  setLoading,
  setLoadingMore,
  setAppendSkeletonCount,
  setMeta,
  setCurrentPage,
  setError,
  setHasLoadedWithFilters,
  setListingsQueryKey,
  listingsRef,
}: UseListingGridFetchArgs) {
  const fetchControllerRef = useRef<AbortController | null>(null);
  const appendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appendInFlightRef = useRef(false);

  const fetchListings = useCallback(
    async (page: number, append: boolean = false, cursor?: string) => {
      if (append && appendInFlightRef.current) {
        return;
      }
      if (append) {
        appendInFlightRef.current = true;
      }

      fetchControllerRef.current?.abort();
      const controller = new AbortController();
      fetchControllerRef.current = controller;

      const params = await buildFetchParams(searchParamsString);

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }
      let appendCommitted = false;
      let replaceCommitted = false;
      const setters: ListingGridFetchSetters = {
        setListings,
        setLoading,
        setLoadingMore,
        setAppendSkeletonCount,
        setMeta,
        setCurrentPage,
        setError,
        setHasLoadedWithFilters,
        setListingsQueryKey,
        listingsRef,
      };

      try {
        if (append) {
          appendCommitted = await appendListingGridPages({
            params,
            page,
            cursor,
            signal: controller.signal,
            searchParamsString,
            checkFavorites,
            appendInFlightRef,
            setters,
          });
        } else {
          replaceCommitted = await replaceListingGridPage({
            params,
            page,
            signal: controller.signal,
            searchParamsString,
            checkFavorites,
            setters,
          });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        handleListingGridFetchError({
          error,
          append,
          searchParamsString,
          replaceLocalized,
          t,
          setters,
        });
      } finally {
        finalizeListingGridFetch({
          aborted: controller.signal.aborted,
          append,
          appendCommitted,
          replaceCommitted,
          appendInFlightRef,
          setters,
        });
      }
    },
    [
      searchParamsString,
      t,
      checkFavorites,
      replaceLocalized,
      setListings,
      setLoading,
      setLoadingMore,
      setAppendSkeletonCount,
      setMeta,
      setCurrentPage,
      setError,
      setHasLoadedWithFilters,
      setListingsQueryKey,
      listingsRef,
    ],
  );

  const fetchListingsRef = useRef(fetchListings);
  fetchListingsRef.current = fetchListings;

  return { fetchListings, fetchListingsRef, fetchControllerRef, appendTimeoutRef };
}
