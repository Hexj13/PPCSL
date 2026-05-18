import { useCallback, useRef, type MutableRefObject } from 'react';

const MIN_SWIPE_DISTANCE = 50;
const SWIPE_INTENT_THRESHOLD = 18;

function getPredictedSwipeIndex(currentIndex: number, total: number, deltaX: number) {
  if (deltaX < 0) {
    return (currentIndex + 1) % total;
  }
  if (deltaX > 0) {
    return currentIndex === 0 ? total - 1 : currentIndex - 1;
  }
  return null;
}

export function useListingPageImagesTouchHandlers({
  imagesLength,
  visibleIndex,
  preloadTarget,
  goNextInternal,
  goPrevInternal,
  clearSwipePreload,
  suppressPreviewClickRef,
  swipePreloadIndexRef,
}: {
  imagesLength: number;
  visibleIndex: number;
  preloadTarget: (index: number) => void;
  goNextInternal: (options?: { clearTimer?: boolean }) => void;
  goPrevInternal: (options?: { clearTimer?: boolean }) => void;
  clearSwipePreload: () => void;
  suppressPreviewClickRef: MutableRefObject<boolean>;
  swipePreloadIndexRef: MutableRefObject<number | null>;
}) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const horizontalSwipeRef = useRef(false);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      clearSwipePreload();
      touchEndX.current = null;
      touchEndY.current = null;
      horizontalSwipeRef.current = false;
      touchStartX.current = e.targetTouches[0].clientX;
      touchStartY.current = e.targetTouches[0].clientY;
    },
    [clearSwipePreload],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const nextX = e.targetTouches[0].clientX;
      const nextY = e.targetTouches[0].clientY;
      touchEndX.current = nextX;
      touchEndY.current = nextY;

      if (touchStartX.current === null || touchStartY.current === null) return;

      const deltaX = nextX - touchStartX.current;
      const deltaY = nextY - touchStartY.current;
      const isHorizontalIntent =
        Math.abs(deltaX) > SWIPE_INTENT_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * 1.1;

      if (isHorizontalIntent) {
        horizontalSwipeRef.current = true;
        if (imagesLength > 1) {
          const predictedIndex = getPredictedSwipeIndex(visibleIndex, imagesLength, deltaX);

          if (predictedIndex !== null && swipePreloadIndexRef.current !== predictedIndex) {
            swipePreloadIndexRef.current = predictedIndex;
            preloadTarget(predictedIndex);
          }
        }
        e.preventDefault();
      }
    },
    [imagesLength, preloadTarget, visibleIndex, swipePreloadIndexRef],
  );

  const onTouchEnd = useCallback(() => {
    const resetTouchState = () => {
      clearSwipePreload();
      horizontalSwipeRef.current = false;
      touchStartX.current = null;
      touchStartY.current = null;
      touchEndX.current = null;
      touchEndY.current = null;
    };

    if (touchStartX.current === null || touchEndX.current === null || !horizontalSwipeRef.current) {
      resetTouchState();
      return;
    }

    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > MIN_SWIPE_DISTANCE;
    const isRightSwipe = distance < -MIN_SWIPE_DISTANCE;

    if (isLeftSwipe && imagesLength > 1) {
      suppressPreviewClickRef.current = true;
      goNextInternal();
    }
    if (isRightSwipe && imagesLength > 1) {
      suppressPreviewClickRef.current = true;
      goPrevInternal();
    }

    resetTouchState();
  }, [clearSwipePreload, goNextInternal, goPrevInternal, imagesLength, suppressPreviewClickRef]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
