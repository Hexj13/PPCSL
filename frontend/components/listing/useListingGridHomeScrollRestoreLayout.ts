'use client';

import { useLayoutEffect, useRef, type Dispatch, type SetStateAction } from 'react';

import {
  applyHomeScrollRestoreScrollPosition,
  getHomeScrollRestorePhase,
  getPendingRestoreMinHeight,
  prepareHomeScrollRestoreGridLayout,
  readPendingHomeReloadScrollY,
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
      skipPostRestoreVirtualSwapRef.current = true;
      if (shouldDeferVirtualSwapForHomeScrollRestore()) {
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
      const skipSwap = skipPostRestoreVirtualSwapRef.current;
      skipPostRestoreVirtualSwapRef.current = false;
      requestAnimationFrame(() => {
        const savedReloadScrollY = readPendingHomeReloadScrollY();
        setGridMinHeight(undefined);
        if (!skipSwap) {
          requestListingGridVirtualSwap();
        }
        if (!savedReloadScrollY) {
          return;
        }
        const reapplySavedReloadScroll = () => {
          if (Math.abs(window.scrollY - savedReloadScrollY) > 2) {
            window.scrollTo({ top: savedReloadScrollY, left: 0, behavior: 'instant' });
          }
        };
        reapplySavedReloadScroll();
        requestAnimationFrame(reapplySavedReloadScroll);
        window.setTimeout(reapplySavedReloadScroll, 0);
        window.setTimeout(reapplySavedReloadScroll, 400);
      });
    });

    return unsubscribe;
  }, [setGridMinHeight, setGridVirtualEpoch]);

  return skipPostRestoreVirtualSwapRef;
}
