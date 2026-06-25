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
  const skipPostRestoreVirtualSwapRef = useRef(false);

  useLayoutEffect(() => {
    const runPendingRestoreWhenGridReady = () => {
      if (getHomeScrollRestorePhase() !== 'pending') {
        return;
      }
      skipPostRestoreVirtualSwapRef.current = true;
      if (shouldDeferVirtualSwapForHomeScrollRestore()) {
        setGridVirtualEpoch((epoch) => epoch + 1);
        if (document.getElementById('listings-results')) {
          applyHomeScrollRestoreScrollPosition();
        }
        return;
      }
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
      const skipSwap = skipPostRestoreVirtualSwapRef.current;
      skipPostRestoreVirtualSwapRef.current = false;
      requestAnimationFrame(() => {
        if (!skipSwap) {
          requestListingGridVirtualSwap();
        }
      });
    });

    return unsubscribe;
  }, [setGridVirtualEpoch]);

  return skipPostRestoreVirtualSwapRef;
}
