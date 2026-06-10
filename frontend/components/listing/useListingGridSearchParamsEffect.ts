'use client';

import { useEffect, useRef } from 'react';

import { sessionStorageRemoveItem } from '@/lib/browser-session-storage';
import { clearHomeScrollRestoreSession } from '@/lib/home-scroll-restore';

import {
  getRestorableGridState,
  GRID_RESTORE_STATE_KEY,
  GRID_STATE_KEY,
} from './listing-grid-state';

type MutableRef<T> = { current: T };

type UseListingGridSearchParamsEffectArgs = {
  searchParamsString: string;
  returningWithSavedScroll: boolean;
  skipClientFetchOnMount: boolean;
  fetchListingsRef: MutableRef<(page: number, append?: boolean) => Promise<void>>;
  fetchControllerRef: MutableRef<AbortController | null>;
  appendTimeoutRef: MutableRef<ReturnType<typeof setTimeout> | null>;
  setCurrentPage: (_page: number) => void;
  setHasLoadedWithFilters: (_value: boolean) => void;
  setLoading: (_value: boolean) => void;
  setAppendSkeletonCount: (_count: number) => void;
  setError: (_error: string | null) => void;
};

export function useListingGridSearchParamsEffect({
  searchParamsString,
  returningWithSavedScroll,
  skipClientFetchOnMount,
  fetchListingsRef,
  fetchControllerRef,
  appendTimeoutRef,
  setCurrentPage,
  setHasLoadedWithFilters,
  setLoading,
  setAppendSkeletonCount,
  setError,
}: UseListingGridSearchParamsEffectArgs) {
  const prevSearchParamsStringRef = useRef<string | null>(null);
  const gridSearchParamsEffectInitializedRef = useRef(false);

  useEffect(() => {
    if (!gridSearchParamsEffectInitializedRef.current) {
      gridSearchParamsEffectInitializedRef.current = true;
      prevSearchParamsStringRef.current = searchParamsString;
      const skipInitialFetch = Boolean(
        getRestorableGridState(returningWithSavedScroll, searchParamsString),
      );
      if (skipInitialFetch || skipClientFetchOnMount) {
        setHasLoadedWithFilters(true);
      } else {
        void fetchListingsRef.current(1, false);
      }
    } else if (searchParamsString !== prevSearchParamsStringRef.current) {
      prevSearchParamsStringRef.current = searchParamsString;
      setCurrentPage(1);
      setHasLoadedWithFilters(false);
      setLoading(true);
      setAppendSkeletonCount(0);
      setError(null);
      sessionStorageRemoveItem(GRID_STATE_KEY);
      sessionStorageRemoveItem(GRID_RESTORE_STATE_KEY);
      clearHomeScrollRestoreSession();
      void fetchListingsRef.current(1, false);
    }

    const fetchController = fetchControllerRef;
    const appendTimeout = appendTimeoutRef;

    return () => {
      fetchController.current?.abort();
      const timeoutId = appendTimeout.current;
      if (timeoutId) {
        clearTimeout(timeoutId);
        appendTimeout.current = null;
      }
    };
  }, [
    searchParamsString,
    returningWithSavedScroll,
    skipClientFetchOnMount,
    fetchListingsRef,
    fetchControllerRef,
    appendTimeoutRef,
    setCurrentPage,
    setHasLoadedWithFilters,
    setLoading,
    setAppendSkeletonCount,
    setError,
  ]);
}
