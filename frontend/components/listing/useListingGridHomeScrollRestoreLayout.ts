'use client';

import { useLayoutEffect, useRef, type Dispatch, type SetStateAction } from 'react';

import {
  applyHomeScrollRestoreScrollPosition,
  getHomeScrollRestorePhase,
  shouldDeferVirtualSwapForHomeScrollRestore,
  subscribeHomeScrollRestoreState,
} from '@/lib/home-scroll-restore';

import { requestListingGridVirtualSwap } from './listing-grid-virtual-swap';

export function useListingGridHomeScrollRestoreLayout(
  setGridVirtualEpoch: Dispatch<SetStateAction<number>>,
) {
  const deferredVirtualSwapRef = useRef(false);

  useLayoutEffect(() => {
    const runPendingRestoreWhenGridReady = () => {
      if (getHomeScrollRestorePhase() !== 'pending') {
        return;
      }
      if (shouldDeferVirtualSwapForHomeScrollRestore()) {
        deferredVirtualSwapRef.current = true;
        setGridVirtualEpoch((epoch) => epoch + 1);
        if (document.getElementById('listings-results')) {
          applyHomeScrollRestoreScrollPosition();
        }
        return;
      }
      deferredVirtualSwapRef.current = false;
      requestListingGridVirtualSwap();
      if (document.getElementById('listings-results')) {
        applyHomeScrollRestoreScrollPosition();
      }
    };

    runPendingRestoreWhenGridReady();

    const unsubscribe = subscribeHomeScrollRestoreState((restorePhase) => {
      if (restorePhase === 'pending') {
        runPendingRestoreWhenGridReady();
        return;
      }
      if (restorePhase !== 'done' && restorePhase !== 'cancelled') {
        return;
      }
      const shouldSwapAfterDefer = deferredVirtualSwapRef.current;
      deferredVirtualSwapRef.current = false;
      requestAnimationFrame(() => {
        if (shouldSwapAfterDefer) {
          requestListingGridVirtualSwap();
        }
      });
    });

    return unsubscribe;
  }, [setGridVirtualEpoch]);

  return deferredVirtualSwapRef;
}
