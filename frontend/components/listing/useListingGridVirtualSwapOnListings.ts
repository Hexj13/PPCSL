'use client';

import { useLayoutEffect } from 'react';

import { LISTING_GRID_PAGE_SIZE } from '@/lib/constants';
import {
  applyHomeScrollRestoreScrollPosition,
  getHomeScrollRestorePhase,
  shouldDeferVirtualSwapForHomeScrollRestore,
} from '@/lib/home-scroll-restore';

import { getRestorableGridState } from './listing-grid-state';
import { requestListingGridVirtualSwap } from './listing-grid-virtual-swap';

type MutableRef<T> = { current: T };

function applyPendingHomeScrollRestorePosition(): void {
  if (getHomeScrollRestorePhase() === 'pending' && document.getElementById('listings-results')) {
    applyHomeScrollRestoreScrollPosition();
  }
}

function shouldAwaitRestoredPageFetch(
  saved: ReturnType<typeof getRestorableGridState>,
  restoreCompletedRef: MutableRef<boolean>,
): boolean {
  return Boolean(
    saved && saved.page > 1 && !saved.listings?.length && !restoreCompletedRef.current,
  );
}

function shouldAwaitRestoredListingCount(
  returningWithSavedScroll: boolean,
  saved: ReturnType<typeof getRestorableGridState>,
  uniqueListingsLength: number,
): boolean {
  if (!returningWithSavedScroll || !saved) {
    return false;
  }
  const expectedListingCount =
    saved.listings?.length ??
    Math.min(saved.page * LISTING_GRID_PAGE_SIZE, saved.meta?.total ?? Infinity);
  return uniqueListingsLength < expectedListingCount;
}

function runDeferredVirtualSwap(
  setGridVirtualEpoch: (_updater: (_epoch: number) => number) => void,
  deferredVirtualSwapRef: MutableRef<boolean>,
): void {
  deferredVirtualSwapRef.current = true;
  setGridVirtualEpoch((epoch) => epoch + 1);
  applyPendingHomeScrollRestorePosition();
}

function runImmediateVirtualSwap(deferredVirtualSwapRef: MutableRef<boolean>): void {
  deferredVirtualSwapRef.current = false;
  requestListingGridVirtualSwap();
  applyPendingHomeScrollRestorePosition();
}

type UseListingGridVirtualSwapOnListingsArgs = {
  uniqueListingsLength: number;
  searchParamsString: string;
  returningWithSavedScroll: boolean;
  restoredFromStorageRef: MutableRef<boolean>;
  restoreCompletedRef: MutableRef<boolean>;
  deferredVirtualSwapRef: MutableRef<boolean>;
  setGridVirtualEpoch: (_updater: (_epoch: number) => number) => void;
};

export function useListingGridVirtualSwapOnListings({
  uniqueListingsLength,
  searchParamsString,
  returningWithSavedScroll,
  restoredFromStorageRef,
  restoreCompletedRef,
  deferredVirtualSwapRef,
  setGridVirtualEpoch,
}: UseListingGridVirtualSwapOnListingsArgs) {
  useLayoutEffect(() => {
    if (uniqueListingsLength === 0) {
      return;
    }

    const saved = getRestorableGridState(returningWithSavedScroll, searchParamsString);

    if (shouldAwaitRestoredPageFetch(saved, restoreCompletedRef)) {
      return;
    }

    if (returningWithSavedScroll && !restoredFromStorageRef.current) {
      return;
    }

    if (shouldAwaitRestoredListingCount(returningWithSavedScroll, saved, uniqueListingsLength)) {
      return;
    }

    if (shouldDeferVirtualSwapForHomeScrollRestore()) {
      runDeferredVirtualSwap(setGridVirtualEpoch, deferredVirtualSwapRef);
      return;
    }

    runImmediateVirtualSwap(deferredVirtualSwapRef);
  }, [
    uniqueListingsLength,
    searchParamsString,
    returningWithSavedScroll,
    restoredFromStorageRef,
    restoreCompletedRef,
    deferredVirtualSwapRef,
    setGridVirtualEpoch,
  ]);
}
