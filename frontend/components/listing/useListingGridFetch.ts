'use client';

import { isAxiosError } from 'axios';
import { startTransition, useCallback, useRef, type Dispatch, type SetStateAction } from 'react';

import { analytics, listingToViewItemListEntry } from '@/lib/analytics';
import type { Listing, PaginationMeta } from '@/lib/api';
import { sessionStorageSetItem } from '@/lib/browser-session-storage';
import { SEARCH_FILTERS_LIMIT_ERROR_TOAST_KEY } from '@/lib/constants';

import {
  LISTING_CARD_APPEND_PRELOAD_COUNT,
  prewarmListingCardCoverImages,
} from './listing-card-image';
import { buildFetchParams, fetchListingsPage, saveGridState } from './listing-grid-state';

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
  listingsRef: MutableRef<Listing[]>;
};

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
  listingsRef,
}: UseListingGridFetchArgs) {
  const fetchControllerRef = useRef<AbortController | null>(null);
  const appendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appendInFlightRef = useRef(false);

  const fetchListings = useCallback(
    async (page: number, append: boolean = false) => {
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

      try {
        const firstRes = await fetchListingsPage(params, page, controller.signal);
        if (controller.signal.aborted) return;
        const allNewListings = firstRes.data;
        const finalMeta = firstRes.meta;

        if (append) {
          prewarmListingCardCoverImages(
            allNewListings
              .slice(0, LISTING_CARD_APPEND_PRELOAD_COUNT)
              .map((listing) => listing.images?.[0])
              .filter((url): url is string => Boolean(url)),
          );
        }

        await checkFavorites(allNewListings.map((l) => l.id));
        if (controller.signal.aborted) return;

        if (!append) {
          startTransition(() => {
            setListings(allNewListings);
            listingsRef.current = allNewListings;
            setCurrentPage(1);
            setLoadingMore(false);
            setAppendSkeletonCount(0);
            setMeta(finalMeta);
            setError(null);
            setHasLoadedWithFilters(true);
            dispatchAnalyticsForNewListings(allNewListings);
          });
        } else {
          appendCommitted = true;
          startTransition(() => {
            setListings((prev) => {
              const updated = [...prev, ...allNewListings];
              listingsRef.current = updated;
              setCurrentPage(page);
              setMeta(finalMeta);
              saveGridState(updated, page, finalMeta, searchParamsString);
              return updated;
            });
            setLoadingMore(false);
            setAppendSkeletonCount(0);
            appendInFlightRef.current = false;
          });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        if (handleSearchLimitOverflowError(error, searchParamsString, replaceLocalized)) return;
        if (append) {
          setAppendSkeletonCount(0);
        }
        if (!append) {
          setListings([]);
          setError(t('listings.loadError'));
          setHasLoadedWithFilters(true);
        }
      } finally {
        if (controller.signal.aborted) {
          if (append) {
            appendInFlightRef.current = false;
            setLoadingMore(false);
            setAppendSkeletonCount(0);
          }
        } else if (!appendCommitted) {
          setLoadingMore(false);
          if (append) {
            appendInFlightRef.current = false;
            setAppendSkeletonCount(0);
          }
          if (!append) {
            setLoading(false);
          }
          if (!append && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('searchComplete'));
          }
        }
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
      listingsRef,
    ],
  );

  const fetchListingsRef = useRef(fetchListings);
  fetchListingsRef.current = fetchListings;

  return { fetchListings, fetchListingsRef, fetchControllerRef, appendTimeoutRef };
}
