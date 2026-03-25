'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

import { useListingImages } from '@/hooks/useListingImages';
import { useTranslation } from '@/hooks/useTranslation';
import { blurhashToDataURL } from '@/lib/utils/blurhash';

import { ListingPageImagesLayout } from './ListingPageImagesLayout';
import {
  type HeroPreviewSlotId,
  type HeroPreviewSlots,
  REWIND_STEP_MS,
  RESET_TO_FIRST_DELAY_MS,
} from './ListingPageImagesPreview';

interface ListingPageImagesProps {
  images: string[];
  imageAltTitle: string;
  currentImageIndex: number;
  setCurrentImageIndex: Dispatch<SetStateAction<number>>;
  imageErrors: Set<number>;
  onImageError: (_index: number) => void;
  onImageClick: (_index: number) => void;
  coverBlurHash?: string | null;
  imageBlurHashes?: (string | null)[] | null;
}

export type PreviewState = {
  confirmedSlot: HeroPreviewSlotId;
  pendingSlot: HeroPreviewSlotId | null;
  slotIndices: HeroPreviewSlots;
};

export interface ListingPageImagesHandle {
  goNext: () => void;
  goPrev: () => void;
  goTo: (index: number) => void;
  isBusy: () => boolean;
  getIndex: () => number;
}

const MIN_SWIPE_DISTANCE = 50;
const SWIPE_INTENT_THRESHOLD = 18;

export function createPreviewState(index: number): PreviewState {
  return {
    confirmedSlot: 'primary',
    pendingSlot: null,
    slotIndices: {
      primary: index,
      secondary: null,
    },
  };
}

export function getConfirmedIndex(state: PreviewState) {
  return state.slotIndices[state.confirmedSlot] ?? 0;
}

export function getPendingSlotId(slotId: HeroPreviewSlotId): HeroPreviewSlotId {
  return slotId === 'primary' ? 'secondary' : 'primary';
}

export function preparePendingPreviewState(state: PreviewState, toIndex: number) {
  const pendingSlot = getPendingSlotId(state.confirmedSlot);
  return {
    pendingSlot,
    nextState: {
      ...state,
      pendingSlot,
      slotIndices: {
        ...state.slotIndices,
        [pendingSlot]: toIndex,
      },
    },
  };
}

export function promotePendingPreviewState(
  state: PreviewState,
  pendingSlot: HeroPreviewSlotId,
  toIndex: number,
): PreviewState {
  if (state.pendingSlot !== pendingSlot || state.slotIndices[pendingSlot] !== toIndex) {
    return state;
  }

  const previousConfirmedSlot = state.confirmedSlot;
  return {
    confirmedSlot: pendingSlot,
    pendingSlot: null,
    slotIndices: {
      ...state.slotIndices,
      [previousConfirmedSlot]: null,
    },
  };
}

function getPredictedSwipeIndex(currentIndex: number, total: number, deltaX: number) {
  if (deltaX < 0) {
    return (currentIndex + 1) % total;
  }
  if (deltaX > 0) {
    return currentIndex === 0 ? total - 1 : currentIndex - 1;
  }
  return null;
}

export const ListingPageImages = forwardRef<ListingPageImagesHandle, ListingPageImagesProps>(
  function ListingPageImages(
    {
      images,
      imageAltTitle,
      currentImageIndex,
      setCurrentImageIndex,
      imageErrors,
      onImageError,
      onImageClick,
      coverBlurHash,
      imageBlurHashes,
    },
    ref,
  ) {
    const { t } = useTranslation();
    const imagesSignature = useMemo(() => images.join('\u0001'), [images]);
    const [heroPreviewBlurConsumed, setHeroPreviewBlurConsumed] = useState(false);
    const [state, setState] = useState<PreviewState>(() => createPreviewState(currentImageIndex));
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);
    const touchEndY = useRef<number | null>(null);
    const horizontalSwipeRef = useRef(false);
    const suppressPreviewClickRef = useRef(false);
    const resetToFirstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rewindIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const imgRafRef = useRef<number | undefined>(undefined);
    const navigationSeqRef = useRef(0);
    const preloadCleanupRef = useRef<(() => void) | null>(null);
    const swipePreloadIndexRef = useRef<number | null>(null);
    const previewStateRef = useRef<PreviewState>(state);
    const goPrevInternalRef = useRef<(options?: { clearTimer?: boolean }) => void>(() => {});
    const visibleIndex = getConfirmedIndex(state);

    useEffect(() => {
      setHeroPreviewBlurConsumed(false);
      setState(createPreviewState(currentImageIndex));
      // eslint-disable-next-line react-hooks/exhaustive-deps -- reset carousel only when image set changes; index is parent value at that commit
    }, [imagesSignature]);

    useEffect(() => {
      if (state.pendingSlot || visibleIndex === currentImageIndex) {
        return;
      }
      setState((prev) => ({
        ...prev,
        slotIndices: {
          ...prev.slotIndices,
          [prev.confirmedSlot]: currentImageIndex,
        },
      }));
    }, [currentImageIndex, state.pendingSlot, visibleIndex]);

    const blurDataURLForIndex = useMemo(() => {
      return (index: number): string | undefined => {
        const fromArr = imageBlurHashes?.[index];
        const hash =
          typeof fromArr === 'string' && fromArr.length > 0
            ? fromArr
            : index === 0 && coverBlurHash && coverBlurHash.length > 0
              ? coverBlurHash
              : undefined;
        if (!hash) return undefined;
        try {
          return blurhashToDataURL(hash);
        } catch {
          return undefined;
        }
      };
    }, [imageBlurHashes, coverBlurHash]);

    const clearResetToFirstTimer = useCallback(() => {
      if (resetToFirstTimerRef.current) {
        clearTimeout(resetToFirstTimerRef.current);
        resetToFirstTimerRef.current = null;
      }
      if (rewindIntervalRef.current) {
        clearInterval(rewindIntervalRef.current);
        rewindIntervalRef.current = null;
      }
    }, []);

    const {
      showMainImageLoader,
      setMainImageLoading,
      isTargetReady,
      isHeroReady,
      preloadTarget,
      handleHeroImageLoad,
      handleThumbnailImageLoad,
    } = useListingImages({
      images,
      currentImageIndex: visibleIndex,
      imageErrors,
    });

    const completeNavigation = useCallback(
      (pendingSlot: HeroPreviewSlotId, toIndex: number, sequence: number) => {
        if (navigationSeqRef.current !== sequence) {
          return;
        }
        setState((prev) => {
          return promotePendingPreviewState(prev, pendingSlot, toIndex);
        });
        setCurrentImageIndex(toIndex);
      },
      [setCurrentImageIndex],
    );

    const schedulePendingPromotion = useCallback(
      (pendingSlot: HeroPreviewSlotId, toIndex: number, sequence: number) => {
        if (imgRafRef.current !== undefined) {
          cancelAnimationFrame(imgRafRef.current);
        }
        imgRafRef.current = requestAnimationFrame(() => {
          imgRafRef.current = undefined;
          completeNavigation(pendingSlot, toIndex, sequence);
        });
      },
      [completeNavigation],
    );

    const handleHeroLayerLoad = useCallback(
      (slotId: HeroPreviewSlotId, idx: number) => {
        handleHeroImageLoad(idx);
        if (idx === 0) {
          setHeroPreviewBlurConsumed(true);
        }
        const snapshot = previewStateRef.current;
        if (snapshot.pendingSlot !== slotId || snapshot.slotIndices[slotId] !== idx) {
          return;
        }
        if (preloadCleanupRef.current) {
          preloadCleanupRef.current();
          preloadCleanupRef.current = null;
        }
        setMainImageLoading(false);
        schedulePendingPromotion(slotId, idx, navigationSeqRef.current);
      },
      [handleHeroImageLoad, schedulePendingPromotion, setMainImageLoading],
    );

    const clearSwipePreload = useCallback(() => {
      swipePreloadIndexRef.current = null;
    }, []);

    const clearNavigationWork = useCallback(() => {
      if (imgRafRef.current !== undefined) {
        cancelAnimationFrame(imgRafRef.current);
        imgRafRef.current = undefined;
      }
      if (preloadCleanupRef.current) {
        preloadCleanupRef.current();
        preloadCleanupRef.current = null;
      }
      clearSwipePreload();
      setMainImageLoading(false);
    }, [clearSwipePreload, setMainImageLoading]);

    useEffect(() => () => clearResetToFirstTimer(), [clearResetToFirstTimer]);
    useEffect(() => () => clearNavigationWork(), [clearNavigationWork]);

    useEffect(() => {
      if (!state.pendingSlot && visibleIndex === 0 && rewindIntervalRef.current) {
        clearInterval(rewindIntervalRef.current);
        rewindIntervalRef.current = null;
      }
    }, [state.pendingSlot, visibleIndex]);

    const navigateTo = useCallback(
      (toIndex: number, options?: { clearTimer?: boolean }) => {
        if (state.pendingSlot || images.length <= 1 || visibleIndex === toIndex) {
          return;
        }
        if (options?.clearTimer !== false) {
          clearResetToFirstTimer();
        }
        clearNavigationWork();
        navigationSeqRef.current += 1;
        const sequence = navigationSeqRef.current;
        const { pendingSlot, nextState } = preparePendingPreviewState(
          previewStateRef.current,
          toIndex,
        );

        setState(nextState);

        if (isHeroReady(toIndex)) {
          setMainImageLoading(false);
          schedulePendingPromotion(pendingSlot, toIndex, sequence);
          return;
        }

        if (isTargetReady(toIndex)) {
          setMainImageLoading(false);
          return;
        }

        setMainImageLoading(true);
        preloadCleanupRef.current = preloadTarget(toIndex, {
          onReady: () => {
            preloadCleanupRef.current = null;
          },
          onFailure: () => {
            preloadCleanupRef.current = null;
          },
        });
      },
      [
        clearNavigationWork,
        clearResetToFirstTimer,
        images.length,
        isHeroReady,
        isTargetReady,
        preloadTarget,
        schedulePendingPromotion,
        setMainImageLoading,
        state,
        visibleIndex,
      ],
    );

    const goPrevInternal = useCallback(
      (options?: { clearTimer?: boolean }) => {
        if (state.pendingSlot || images.length <= 1) {
          return;
        }
        const toIndex = visibleIndex === 0 ? images.length - 1 : visibleIndex - 1;
        navigateTo(toIndex, options);
      },
      [images.length, navigateTo, state.pendingSlot, visibleIndex],
    );

    previewStateRef.current = state;
    goPrevInternalRef.current = goPrevInternal;

    const goNextInternal = useCallback(
      (options?: { clearTimer?: boolean }) => {
        if (state.pendingSlot || images.length <= 1) {
          return;
        }
        const toIndex = (visibleIndex + 1) % images.length;
        navigateTo(toIndex, options);
      },
      [images.length, navigateTo, state.pendingSlot, visibleIndex],
    );

    useImperativeHandle(
      ref,
      () => ({
        goNext: () => goNextInternal(),
        goPrev: () => goPrevInternal(),
        goTo: (index: number) => navigateTo(index),
        isBusy: () => state.pendingSlot !== null,
        getIndex: () => getConfirmedIndex(previewStateRef.current),
      }),
      [goNextInternal, goPrevInternal, navigateTo, state.pendingSlot],
    );

    const handlePreviewMouseLeave = useCallback(() => {
      clearResetToFirstTimer();
      if (images.length <= 1 || visibleIndex === 0) {
        return;
      }
      resetToFirstTimerRef.current = setTimeout(() => {
        resetToFirstTimerRef.current = null;
        const snapshot = previewStateRef.current;
        const snapshotIndex = getConfirmedIndex(snapshot);
        if (snapshot.pendingSlot || snapshotIndex <= 0) {
          return;
        }
        rewindIntervalRef.current = setInterval(() => {
          const s = previewStateRef.current;
          const currentIndex = getConfirmedIndex(s);
          if (s.pendingSlot) {
            return;
          }
          if (currentIndex <= 0) {
            if (rewindIntervalRef.current) {
              clearInterval(rewindIntervalRef.current);
              rewindIntervalRef.current = null;
            }
            return;
          }
          goPrevInternalRef.current({ clearTimer: false });
        }, REWIND_STEP_MS);
      }, RESET_TO_FIRST_DELAY_MS);
    }, [clearResetToFirstTimer, images.length, visibleIndex]);

    const handlePreviewMouseEnter = useCallback(() => {
      clearResetToFirstTimer();
    }, [clearResetToFirstTimer]);

    const navBusy = state.pendingSlot !== null;

    const handlePrev = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (navBusy) return;
        goPrevInternal();
      },
      [goPrevInternal, navBusy],
    );

    const handleNext = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (navBusy) return;
        goNextInternal();
      },
      [goNextInternal, navBusy],
    );

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
          if (!state.pendingSlot && images.length > 1) {
            const predictedIndex = getPredictedSwipeIndex(visibleIndex, images.length, deltaX);

            if (predictedIndex !== null && swipePreloadIndexRef.current !== predictedIndex) {
              swipePreloadIndexRef.current = predictedIndex;
              preloadTarget(predictedIndex);
            }
          }
          e.preventDefault();
        }
      },
      [images.length, preloadTarget, state.pendingSlot, visibleIndex],
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

      if (
        touchStartX.current === null ||
        touchEndX.current === null ||
        !horizontalSwipeRef.current
      ) {
        resetTouchState();
        return;
      }

      const distance = touchStartX.current - touchEndX.current;
      const isLeftSwipe = distance > MIN_SWIPE_DISTANCE;
      const isRightSwipe = distance < -MIN_SWIPE_DISTANCE;

      if (isLeftSwipe && images.length > 1) {
        suppressPreviewClickRef.current = true;
        goNextInternal();
      }
      if (isRightSwipe && images.length > 1) {
        suppressPreviewClickRef.current = true;
        goPrevInternal();
      }

      resetTouchState();
    }, [clearSwipePreload, goNextInternal, goPrevInternal, images.length]);

    return (
      <ListingPageImagesLayout
        visibleIndex={visibleIndex}
        images={images}
        imageErrors={imageErrors}
        suppressPreviewClickRef={suppressPreviewClickRef}
        onImageClick={onImageClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        handlePreviewMouseLeave={handlePreviewMouseLeave}
        handlePreviewMouseEnter={handlePreviewMouseEnter}
        navBusy={navBusy}
        handlePrev={handlePrev}
        handleNext={handleNext}
        t={t}
        showMainImageLoader={showMainImageLoader && state.pendingSlot !== null}
        confirmedSlot={state.confirmedSlot}
        pendingSlot={state.pendingSlot}
        slotIndices={state.slotIndices}
        imageAltTitle={imageAltTitle}
        onHeroImageLoad={handleHeroLayerLoad}
        onImageError={onImageError}
        blurDataURLForIndex={blurDataURLForIndex}
        heroPreviewBlurConsumed={heroPreviewBlurConsumed}
        navigateTo={navigateTo}
        setCurrentImageIndex={setCurrentImageIndex}
        handleThumbnailImageLoad={handleThumbnailImageLoad}
      />
    );
  },
);
