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
  IMAGE_SLIDE_DURATION_MS,
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

type PreviewState =
  | { type: 'idle'; index: number }
  | { type: 'preloading'; fromIndex: number; toIndex: number; direction: 'next' | 'prev' }
  | {
      type: 'animating';
      fromIndex: number;
      toIndex: number;
      direction: 'next' | 'prev';
      phase: 'setup' | 'running';
    };

export interface ListingPageImagesHandle {
  goNext: () => void;
  goPrev: () => void;
  goTo: (index: number) => void;
  isBusy: () => boolean;
  getIndex: () => number;
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
    const [state, setState] = useState<PreviewState>({ type: 'idle', index: currentImageIndex });
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);
    const touchEndY = useRef<number | null>(null);
    const horizontalSwipeRef = useRef(false);
    const suppressPreviewClickRef = useRef(false);
    const resetToFirstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rewindIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const imgRafRef = useRef<number | undefined>(undefined);
    const imgTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const preloadCleanupRef = useRef<(() => void) | null>(null);
    const visibleIndex = state.type === 'idle' ? state.index : state.fromIndex;

    useEffect(() => {
      setHeroPreviewBlurConsumed(false);
      setState({ type: 'idle', index: currentImageIndex });
    }, [currentImageIndex, imagesSignature]);

    useEffect(() => {
      if (state.type !== 'idle' || state.index === currentImageIndex) {
        return;
      }
      setState({ type: 'idle', index: currentImageIndex });
    }, [currentImageIndex, state]);

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
      preloadTarget,
      preloadAllRemaining,
      handleImageLoad,
    } = useListingImages({
      images,
      currentImageIndex: visibleIndex,
      imageErrors,
    });

    const handlePreviewImageLoad = useCallback(
      (idx: number) => {
        handleImageLoad(idx);
        if (idx === 0) {
          setHeroPreviewBlurConsumed(true);
        }
      },
      [handleImageLoad],
    );

    const clearAnimationWork = useCallback(() => {
      if (imgRafRef.current !== undefined) {
        cancelAnimationFrame(imgRafRef.current);
        imgRafRef.current = undefined;
      }
      if (imgTimerRef.current !== undefined) {
        clearTimeout(imgTimerRef.current);
        imgTimerRef.current = undefined;
      }
      if (preloadCleanupRef.current) {
        preloadCleanupRef.current();
        preloadCleanupRef.current = null;
      }
      setMainImageLoading(false);
    }, [setMainImageLoading]);

    useEffect(() => () => clearResetToFirstTimer(), [clearResetToFirstTimer]);
    useEffect(() => () => clearAnimationWork(), [clearAnimationWork]);

    useEffect(() => {
      if (state.type === 'idle' && state.index === 0 && rewindIntervalRef.current) {
        clearInterval(rewindIntervalRef.current);
        rewindIntervalRef.current = null;
      }
    }, [state]);

    const getDirection = useCallback(
      (fromIndex: number, toIndex: number) => {
        const len = images.length;
        const forwardDistance = (toIndex - fromIndex + len) % len;
        const backwardDistance = (fromIndex - toIndex + len) % len;
        return forwardDistance <= backwardDistance ? 'next' : 'prev';
      },
      [images.length],
    );

    const completeNavigation = useCallback(
      (toIndex: number) => {
        setState({ type: 'idle', index: toIndex });
        setCurrentImageIndex(toIndex);
      },
      [setCurrentImageIndex],
    );

    const startAnimating = useCallback(
      (fromIndex: number, toIndex: number, direction: 'next' | 'prev') => {
        clearAnimationWork();
        setState({
          type: 'animating',
          fromIndex,
          toIndex,
          direction,
          phase: 'setup',
        });
        imgRafRef.current = requestAnimationFrame(() => {
          imgRafRef.current = requestAnimationFrame(() => {
            setState((prev) =>
              prev.type === 'animating' ? { ...prev, phase: 'running' as const } : prev,
            );
            imgTimerRef.current = setTimeout(() => {
              completeNavigation(toIndex);
              imgTimerRef.current = undefined;
            }, IMAGE_SLIDE_DURATION_MS + 30);
          });
        });
      },
      [clearAnimationWork, completeNavigation],
    );

    const navigateTo = useCallback(
      (toIndex: number, options?: { clearTimer?: boolean }) => {
        if (state.type !== 'idle' || images.length <= 1 || state.index === toIndex) {
          return;
        }
        if (options?.clearTimer !== false) {
          clearResetToFirstTimer();
        }
        preloadAllRemaining();
        const fromIndex = state.index;
        const direction = getDirection(fromIndex, toIndex);
        if (isTargetReady(toIndex)) {
          setMainImageLoading(false);
          startAnimating(fromIndex, toIndex, direction);
          return;
        }
        setState({ type: 'preloading', fromIndex, toIndex, direction });
        setMainImageLoading(true);
        preloadCleanupRef.current = preloadTarget(toIndex, {
          onReady: () => {
            preloadCleanupRef.current = null;
            setMainImageLoading(false);
            startAnimating(fromIndex, toIndex, direction);
          },
          onFailure: () => {
            preloadCleanupRef.current = null;
            setMainImageLoading(false);
            startAnimating(fromIndex, toIndex, direction);
          },
        });
      },
      [
        clearResetToFirstTimer,
        getDirection,
        images.length,
        isTargetReady,
        preloadAllRemaining,
        preloadTarget,
        setMainImageLoading,
        startAnimating,
        state,
      ],
    );

    const goPrevInternal = useCallback(
      (options?: { clearTimer?: boolean }) => {
        if (state.type !== 'idle' || images.length <= 1) {
          return;
        }
        const toIndex = state.index === 0 ? images.length - 1 : state.index - 1;
        navigateTo(toIndex, options);
      },
      [images.length, navigateTo, state],
    );

    const goNextInternal = useCallback(
      (options?: { clearTimer?: boolean }) => {
        if (state.type !== 'idle' || images.length <= 1) {
          return;
        }
        const toIndex = (state.index + 1) % images.length;
        navigateTo(toIndex, options);
      },
      [images.length, navigateTo, state],
    );

    useImperativeHandle(
      ref,
      () => ({
        goNext: () => goNextInternal(),
        goPrev: () => goPrevInternal(),
        goTo: (index: number) => navigateTo(index),
        isBusy: () => state.type !== 'idle',
        getIndex: () => (state.type === 'idle' ? state.index : state.fromIndex),
      }),
      [goNextInternal, goPrevInternal, navigateTo, state],
    );

    const handlePreviewMouseLeave = useCallback(() => {
      clearResetToFirstTimer();
      if (images.length <= 1 || visibleIndex === 0) {
        return;
      }
      resetToFirstTimerRef.current = setTimeout(() => {
        resetToFirstTimerRef.current = null;
        rewindIntervalRef.current = setInterval(() => {
          if (state.type !== 'idle') {
            return;
          }
          if (state.index <= 0) {
            if (rewindIntervalRef.current) {
              clearInterval(rewindIntervalRef.current);
              rewindIntervalRef.current = null;
            }
            return;
          }
          goPrevInternal({ clearTimer: false });
        }, REWIND_STEP_MS);
      }, RESET_TO_FIRST_DELAY_MS);
    }, [clearResetToFirstTimer, goPrevInternal, images.length, state, visibleIndex]);

    const handlePreviewMouseEnter = useCallback(() => {
      clearResetToFirstTimer();
    }, [clearResetToFirstTimer]);

    const navBusy = state.type !== 'idle';

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

    const minSwipeDistance = 50;
    const swipeIntentThreshold = 18;

    const onTouchStart = useCallback((e: React.TouchEvent) => {
      touchEndX.current = null;
      touchEndY.current = null;
      horizontalSwipeRef.current = false;
      touchStartX.current = e.targetTouches[0].clientX;
      touchStartY.current = e.targetTouches[0].clientY;
    }, []);

    const onTouchMove = useCallback((e: React.TouchEvent) => {
      const nextX = e.targetTouches[0].clientX;
      const nextY = e.targetTouches[0].clientY;
      touchEndX.current = nextX;
      touchEndY.current = nextY;

      if (touchStartX.current === null || touchStartY.current === null) return;

      const deltaX = nextX - touchStartX.current;
      const deltaY = nextY - touchStartY.current;
      const isHorizontalIntent =
        Math.abs(deltaX) > swipeIntentThreshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.1;

      if (isHorizontalIntent) {
        horizontalSwipeRef.current = true;
        e.preventDefault();
      }
    }, []);

    const onTouchEnd = useCallback(() => {
      const resetTouchState = () => {
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
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;

      if (isLeftSwipe && images.length > 1) {
        suppressPreviewClickRef.current = true;
        goNextInternal();
      }
      if (isRightSwipe && images.length > 1) {
        suppressPreviewClickRef.current = true;
        goPrevInternal();
      }

      resetTouchState();
    }, [goNextInternal, goPrevInternal, images.length]);

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
        showMainImageLoader={showMainImageLoader}
        animState={state.type === 'animating' ? state : null}
        imageAltTitle={imageAltTitle}
        handlePreviewImageLoad={handlePreviewImageLoad}
        onImageError={onImageError}
        blurDataURLForIndex={blurDataURLForIndex}
        heroPreviewBlurConsumed={heroPreviewBlurConsumed}
        navigateTo={navigateTo}
        setCurrentImageIndex={setCurrentImageIndex}
        handleImageLoad={handleImageLoad}
      />
    );
  },
);
