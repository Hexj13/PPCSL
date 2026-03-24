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
const PRELOAD_NEXT_DELAY_MS = 220;
const PRELOAD_THIRD_AHEAD_DELAY_MS = 320;

export function useListingImages({
  images,
  currentImageIndex,
  imageErrors,
}: UseListingImagesProps) {
  const [mainImageLoading, setMainImageLoading] = useState(false);
  const mainImageLoadedRef = useRef<Set<number>>(new Set());
  const mainImagePreloadingRef = useRef<Set<number>>(new Set());
  const navigationCountRef = useRef(0);
  const lastNavigatedIndexRef = useRef(currentImageIndex);
  const hasPreloadedAllRef = useRef(false);
  const imagesCacheRef = useRef<HTMLImageElement[]>([]);
  const preloadAllRemainingCleanupsRef = useRef<Array<() => void>>([]);
  const imagesSignature = images.join('\u0001');

  const { visible: showMainImageLoader } = useLoadingState({
    isLoading: mainImageLoading,
    showDelay: 0,
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
    for (const cleanup of preloadAllRemainingCleanupsRef.current) {
      cleanup();
    }
    preloadAllRemainingCleanupsRef.current = [];
    mainImageLoadedRef.current.clear();
    mainImagePreloadingRef.current.clear();
    navigationCountRef.current = 0;
    lastNavigatedIndexRef.current = currentImageIndex;
    hasPreloadedAllRef.current = false;
    for (const img of imagesCacheRef.current) {
      img.onload = null;
      img.onerror = null;
    }
    imagesCacheRef.current = [];
    setMainImageLoading(false);
    // Intentionally depend only on imagesSignature so reset runs when listing changes, not on every index change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagesSignature]);

  useEffect(() => {
    if (lastNavigatedIndexRef.current !== currentImageIndex) {
      navigationCountRef.current += 1;
      lastNavigatedIndexRef.current = currentImageIndex;
    }
  }, [currentImageIndex]);

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
        }
        img.onload = null;
        img.onerror = null;
      });
    };

    const nextIndex = (currentImageIndex + 1) % images.length;
    const prevIndex = (currentImageIndex - 1 + images.length) % images.length;
    const secondAheadIndex = (currentImageIndex + 2) % images.length;
    const thirdAheadIndex = (currentImageIndex + 3) % images.length;

    preloadByIndex(nextIndex);
    preloadByIndex(prevIndex, 120);
    if (images.length > 2) {
      preloadByIndex(secondAheadIndex, PRELOAD_NEXT_DELAY_MS);
    }
    if (images.length > 3) {
      preloadByIndex(thirdAheadIndex, PRELOAD_THIRD_AHEAD_DELAY_MS);
    }

    if (navigationCountRef.current >= 1 && !hasPreloadedAllRef.current) {
      hasPreloadedAllRef.current = true;
      for (let i = 0; i < images.length; i += 1) {
        preloadByIndex(i);
      }
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
        }
        img.onload = null;
        img.onerror = null;
      };
    },
    [getPreviewUrl, images, imageErrors, markLoaded],
  );

  const preloadAllRemaining = useCallback(() => {
    if (hasPreloadedAllRef.current || images.length <= 1) {
      return;
    }

    hasPreloadedAllRef.current = true;
    const cleanups: Array<() => void> = [];
    for (let index = 0; index < images.length; index += 1) {
      cleanups.push(preloadTarget(index));
    }
    preloadAllRemainingCleanupsRef.current = cleanups;
  }, [images, preloadTarget]);

  const handleImageLoad = (index: number) => {
    const imageUrl = images[index];
    if (!imageUrl || imageUrl === '/placeholder-car.jpg') return;
    markLoaded(index);
    if (index === currentImageIndex) setMainImageLoading(false);
  };

  return {
    showMainImageLoader,
    mainImageLoading,
    mainImageLoadedRef,
    setMainImageLoading,
    isTargetReady,
    preloadTarget,
    preloadAllRemaining,
    handleImageLoad,
  };
}
