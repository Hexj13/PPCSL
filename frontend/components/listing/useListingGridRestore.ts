'use client';

import { startTransition, useEffect, type Dispatch, type SetStateAction } from 'react';

import type { Listing, PaginationMeta } from '@/lib/api';
import { silentCatch } from '@/lib/utils';

import {
  fetchListingsThroughPage,
  getRestorableGridState,
  saveGridState,
} from './listing-grid-state';

type MutableRef<T> = {
  current: T;
};

type UseListingGridRestoreArgs = {
  returningWithSavedScroll: boolean;
  searchParamsString: string;
  checkFavorites: (listingIds: string[]) => Promise<void>;
  setListings: Dispatch<SetStateAction<Listing[]>>;
  setMeta: Dispatch<SetStateAction<PaginationMeta | null>>;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  setHasLoadedWithFilters: Dispatch<SetStateAction<boolean>>;
  listingsRef: MutableRef<Listing[]>;
  fetchControllerRef: MutableRef<AbortController | null>;
  restoredFromStorageRef: MutableRef<boolean>;
  restoreCompletedRef: MutableRef<boolean>;
};

export function useListingGridRestore({
  returningWithSavedScroll,
  searchParamsString,
  checkFavorites,
  setListings,
  setMeta,
  setCurrentPage,
  setHasLoadedWithFilters,
  listingsRef,
  fetchControllerRef,
  restoredFromStorageRef,
  restoreCompletedRef,
}: UseListingGridRestoreArgs) {
  useEffect(() => {
    if (restoredFromStorageRef.current) return;
    const saved = getRestorableGridState(returningWithSavedScroll, searchParamsString);
    if (!saved) {
      restoredFromStorageRef.current = true;
      return;
    }
    if (saved.listings?.length) {
      restoredFromStorageRef.current = true;
      setListings(saved.listings);
      setMeta(saved.meta);
      setCurrentPage(saved.page);
      listingsRef.current = saved.listings;
      return;
    }

    restoredFromStorageRef.current = true;
    restoreCompletedRef.current = false;
    fetchControllerRef.current?.abort();
    const controller = new AbortController();
    fetchControllerRef.current = controller;

    void fetchListingsThroughPage(searchParamsString, saved.page, controller.signal)
      .then(async (restored) => {
        if (controller.signal.aborted) return;
        await checkFavorites(restored.data.map((listing) => listing.id));
        if (controller.signal.aborted) return;
        startTransition(() => {
          setListings(restored.data);
          listingsRef.current = restored.data;
          setMeta(restored.meta ?? saved.meta);
          setCurrentPage(saved.page);
          setHasLoadedWithFilters(true);
          saveGridState(restored.data, saved.page, restored.meta ?? saved.meta, searchParamsString);
        });
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          silentCatch('ListingGrid.restoreSavedPages')(error);
        }
      })
      .finally(() => {
        restoreCompletedRef.current = !controller.signal.aborted;
      });

    return () => {
      controller.abort();
      if (!restoreCompletedRef.current) {
        restoredFromStorageRef.current = false;
      }
    };
  }, [
    returningWithSavedScroll,
    searchParamsString,
    checkFavorites,
    setListings,
    setMeta,
    setCurrentPage,
    setHasLoadedWithFilters,
    listingsRef,
    fetchControllerRef,
    restoredFromStorageRef,
    restoreCompletedRef,
  ]);
}
