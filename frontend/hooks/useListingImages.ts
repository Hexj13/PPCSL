import { useCallback, useEffect, useRef, useState } from 'react';

import { bindImageReadiness } from '@/components/listing/useListingCardCarouselPreload';
import { useLoadingState } from '@/hooks/useLoadingState';
import { getOptimizedImageUrl } from '@/lib/utils';

interface UseListingImagesProps {
  images: string[];
  currentImageIndex: number;
  imageErrors: Set<number>;
}

const PREVIEW_IMAGE_QUALITY = 75;
const PREVIEW_IMAGE_WIDTH = 1200;
const PRELOAD_SECOND_AHEAD_DELAY_MS = 40;
const PRELOAD_THIRD_AHEAD_DELAY_MS = 120;
const PRELOAD_PREV_DELAY_MS = 180;
const LOADING_INDICATOR_DELAY_MS = 120;
const EXISTING_PRELOAD_MAX_FRAMES = 900;

export function useListingImages({
  images,
  currentImageIndex,
  imageErrors,
}: UseListingImagesProps) {
  const [mainImageLoading, setMainImageLoading] = useState(false);
  const mainImageLoadedRef = useRef<Set<number>>(new Set());
  const heroImageLoadedRef = useRef<Set<number>>(new Set());
  const mainImagePreloadingRef = useRef<Set<number>>(new Set());
  const imagesCacheRef = useRef<HTMLImageElement[]>([]);
  const imagesSignature = images.join('\u0001');

  const { visible: showMainImageLoader } = useLoadingState({
    isLoading: mainImageLoading,
    showDelay: LOADING_INDICATOR_DELAY_MS,
    minDisplayTime: 120,
  });

  const getPreviewUrl = useCallback(
    (imageUrl: string) =>
      getOptimizedImageUrl(imageUrl, PREVIEW_IMAGE_QUALITY, PREVIEW_IMAGE_WIDTH),
    [],
  );

  const markLoaded = useCallback((index: number) => {
    mainImageLoadedRef.current.add(index);
    mainImagePreloadingRef.current.delete(index);
  }, []);

  useEffect(() => {
    mainImageLoadedRef.current.clear();
    heroImageLoadedRef.current.clear();
    mainImagePreloadingRef.current.clear();
    for (const img of imagesCacheRef.current) {
      img.onload = null;
      img.onerror = null;
    }
    imagesCacheRef.current = [];
    setMainImageLoading(false);
  }, [imagesSignature]);

  useEffect(() => {
    if (images.length <= 1 || typeof window === 'undefined') return;

    const preloadCleanups: Array<() => void> = [];

    const preloadByIndex = (index: number, delay = 0) => {
      const imageUrl = images[index];
      if (!imageUrl || imageUrl === '/placeholder-car.jpg' || imageErrors.has(index)) {
        return;
      }
      if (mainImageLoadedRef.current.has(index) || mainImagePreloadingRef.current.has(index)) {
        return;
      }

      let preloadTimeout: ReturnType<typeof setTimeout> | null = null;
      let img: HTMLImageElement | null = null;

      const startPreload = () => {
        if (mainImageLoadedRef.current.has(index) || mainImagePreloadingRef.current.has(index)) {
          return;
        }
        img = new window.Image();
        imagesCacheRef.current.push(img);
        mainImagePreloadingRef.current.add(index);
        const resolveReadiness = bindImageReadiness(
          img,
          () => markLoaded(index),
          () => {
            mainImagePreloadingRef.current.delete(index);
          },
        );
        img.src = getPreviewUrl(imageUrl);
        if (img.complete) {
          resolveReadiness();
        }
      };

      if (delay > 0) {
        preloadTimeout = setTimeout(startPreload, delay);
      } else {
        startPreload();
      }

      preloadCleanups.push(() => {
        if (preloadTimeout) {
          clearTimeout(preloadTimeout);
        }
        if (!img) {
          return;
        }
        if (img.complete && img.naturalWidth > 0) {
          markLoaded(index);
        } else {
          mainImagePreloadingRef.current.delete(index);
        }
        img.onload = null;
        img.onerror = null;
      });
    };

    const nextIndex = (currentImageIndex + 1) % images.length;
    const prevIndex = (currentImageIndex - 1 + images.length) % images.length;
    const secondAheadIndex = (currentImageIndex + 2) % images.length;
    const thirdAheadIndex = (currentImageIndex + 3) % images.length;

    type PreloadJob = { index: number; delay: number };
    const preloadJobs: PreloadJob[] = [];
    const addPreloadJob = (idx: number, delay: number) => {
      const url = images[idx];
      if (!url || url === '/placeholder-car.jpg' || imageErrors.has(idx)) {
        return;
      }
      const existing = preloadJobs.find((j) => j.index === idx);
      if (existing) {
        existing.delay = Math.min(existing.delay, delay);
      } else {
        preloadJobs.push({ index: idx, delay });
      }
    };

    addPreloadJob(nextIndex, 0);
    if (images.length > 2) {
      addPreloadJob(secondAheadIndex, PRELOAD_SECOND_AHEAD_DELAY_MS);
    }
    if (images.length > 3) {
      addPreloadJob(thirdAheadIndex, PRELOAD_THIRD_AHEAD_DELAY_MS);
    }
    addPreloadJob(prevIndex, PRELOAD_PREV_DELAY_MS);

    for (const { index, delay } of preloadJobs) {
      preloadByIndex(index, delay);
    }

    return () => {
      for (const cleanup of preloadCleanups) {
        cleanup();
      }
    };
  }, [currentImageIndex, getPreviewUrl, images, imageErrors, markLoaded]);

  const isTargetReady = useCallback(
    (index: number) => {
      const imageUrl = images[index];
      if (!imageUrl || imageUrl === '/placeholder-car.jpg' || imageErrors.has(index)) {
        return true;
      }
      return mainImageLoadedRef.current.has(index);
    },
    [images, imageErrors],
  );

  const isHeroReady = useCallback(
    (index: number) => {
      const imageUrl = images[index];
      if (!imageUrl || imageUrl === '/placeholder-car.jpg' || imageErrors.has(index)) {
        return true;
      }
      return heroImageLoadedRef.current.has(index);
    },
    [images, imageErrors],
  );

  const preloadTarget = useCallback(
    (
      index: number,
      callbacks?: {
        onReady?: () => void;
        onFailure?: () => void;
      },
    ) => {
      const imageUrl = images[index];
      if (!imageUrl || imageUrl === '/placeholder-car.jpg' || imageErrors.has(index)) {
        callbacks?.onReady?.();
        return () => {};
      }
      if (mainImageLoadedRef.current.has(index)) {
        callbacks?.onReady?.();
        return () => {};
      }
      if (mainImagePreloadingRef.current.has(index)) {
        if (!callbacks?.onReady && !callbacks?.onFailure) {
          return () => {};
        }

        let cancelled = false;
        let rafId: number | null = null;
        let waitFrames = 0;

        const waitForExistingPreload = () => {
          if (cancelled) {
            return;
          }
          if (mainImageLoadedRef.current.has(index)) {
            callbacks?.onReady?.();
            return;
          }
          if (!mainImagePreloadingRef.current.has(index)) {
            callbacks?.onFailure?.();
            return;
          }
          waitFrames += 1;
          if (waitFrames > EXISTING_PRELOAD_MAX_FRAMES) {
            mainImagePreloadingRef.current.delete(index);
            callbacks?.onFailure?.();
            return;
          }
          rafId = window.requestAnimationFrame(waitForExistingPreload);
        };

        rafId = window.requestAnimationFrame(waitForExistingPreload);

        return () => {
          cancelled = true;
          if (rafId !== null) {
            window.cancelAnimationFrame(rafId);
          }
        };
      }

      const img = new window.Image();
      imagesCacheRef.current.push(img);
      mainImagePreloadingRef.current.add(index);
      const resolveReadiness = bindImageReadiness(
        img,
        () => {
          markLoaded(index);
          callbacks?.onReady?.();
        },
        () => {
          mainImagePreloadingRef.current.delete(index);
          callbacks?.onFailure?.();
        },
      );
      img.src = getPreviewUrl(imageUrl);
      if (img.complete) {
        resolveReadiness();
      }

      return () => {
        if (img.complete && img.naturalWidth > 0) {
          markLoaded(index);
        } else {
          mainImagePreloadingRef.current.delete(index);
        }
        img.onload = null;
        img.onerror = null;
      };
    },
    [getPreviewUrl, images, imageErrors, markLoaded],
  );

  const handleHeroImageLoad = (index: number) => {
    const imageUrl = images[index];
    if (!imageUrl || imageUrl === '/placeholder-car.jpg') return;
    markLoaded(index);
    heroImageLoadedRef.current.add(index);
    if (index === currentImageIndex) setMainImageLoading(false);
  };

  const handleThumbnailImageLoad = (index: number) => {
    const imageUrl = images[index];
    if (!imageUrl || imageUrl === '/placeholder-car.jpg') return;
    markLoaded(index);
  };

  return {
    showMainImageLoader,
    mainImageLoading,
    mainImageLoadedRef,
    heroImageLoadedRef,
    setMainImageLoading,
    isTargetReady,
    isHeroReady,
    preloadTarget,
    handleHeroImageLoad,
    handleThumbnailImageLoad,
  };
}
