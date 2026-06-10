'use client';

import { useLayoutEffect, useRef, type Dispatch, type SetStateAction } from 'react';

import {
  applyHomeScrollRestoreScrollPosition,
  getHomeScrollRestorePhase,
  getPendingRestoreMinHeight,
  prepareHomeScrollRestoreGridLayout,
  shouldDeferVirtualSwapForHomeScrollRestore,
  subscribeHomeScrollRestoreState,
} from '@/lib/home-scroll-restore';

import { requestListingGridVirtualSwap } from './listing-grid-virtual-swap';

export function useListingGridHomeScrollRestoreLayout(
  setGridMinHeight: Dispatch<SetStateAction<number | undefined>>,
  setGridVirtualEpoch: Dispatch<SetStateAction<number>>,
) {
  const skipPostRestoreVirtualSwapRef = useRef(false);

  useLayoutEffect(() => {
    const syncGridMinHeight = () => {
      setGridMinHeight(getPendingRestoreMinHeight(window.innerWidth) ?? undefined);
    };

    const runPendingRestoreWhenGridReady = () => {
      if (getHomeScrollRestorePhase() !== 'pending') {
        return;
      }
      prepareHomeScrollRestoreGridLayout();
      if (shouldDeferVirtualSwapForHomeScrollRestore()) {
        skipPostRestoreVirtualSwapRef.current = true;
        setGridVirtualEpoch((epoch) => epoch + 1);
        prepareHomeScrollRestoreGridLayout();
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

    syncGridMinHeight();
    runPendingRestoreWhenGridReady();

    const unsubscribe = subscribeHomeScrollRestoreState((restorePhase) => {
      if (restorePhase === 'pending') {
        runPendingRestoreWhenGridReady();
      }
      if (
        restorePhase === 'pending' ||
        restorePhase === 'scrolled' ||
        restorePhase === 'correcting'
      ) {
        syncGridMinHeight();
        return;
      }
      setGridMinHeight(undefined);
      if (!skipPostRestoreVirtualSwapRef.current) {
        requestListingGridVirtualSwap();
      }
      skipPostRestoreVirtualSwapRef.current = false;
    });

    return unsubscribe;
  }, [setGridMinHeight, setGridVirtualEpoch]);

  return skipPostRestoreVirtualSwapRef;
}
