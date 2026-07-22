import { useCallback, useEffect, useRef } from 'react';

import {
  getListingPagePreviewImageUrl,
  isListingPageVideoHeroSlideUrl,
} from '@/app/[locale]/listings/[id]/listing-page-helpers';

interface UseListingImagesProps {
  images: string[];
  currentImageIndex: number;
  imageErrors: Set<number>;
}

const PRELOAD_SECOND_AHEAD_DELAY_MS = 40;
const PRELOAD_THIRD_AHEAD_DELAY_MS = 120;
const PRELOAD_FOURTH_AHEAD_DELAY_MS = 220;
const PRELOAD_FIFTH_AHEAD_DELAY_MS = 340;
const PRELOAD_PREV_DELAY_MS = 180;

type PreviewImageCacheEntry = {
  img: HTMLImageElement;
  promise: Promise<void>;
  status: 'pending' | 'ready' | 'error';
};

const previewImageCache = new Map<string, PreviewImageCacheEntry>();
const PREVIEW_IMAGE_CACHE_MAX_SIZE = 120;

function trimPreviewImageCache(): void {
  if (previewImageCache.size <= PREVIEW_IMAGE_CACHE_MAX_SIZE) return;
  for (const [key, entry] of previewImageCache) {
    if (entry.status === 'pending') continue;
    previewImageCache.delete(key);
    if (previewImageCache.size <= PREVIEW_IMAGE_CACHE_MAX_SIZE) return;
  }
}

function ensurePreviewImageReady(url: string): Promise<void> {
  const cached = previewImageCache.get(url);
  if (cached?.status === 'ready') {
    return Promise.resolve();
  }
  if (cached?.status === 'pending') {
    return cached.promise;
  }
  if (cached?.status === 'error') {
    previewImageCache.delete(url);
  }

  const img = new window.Image();
  const entry: PreviewImageCacheEntry = {
    img,
    status: 'pending',
    promise: Promise.resolve(),
  };

  entry.promise = new Promise<void>((resolve, reject) => {
    const markReady = () => {
      entry.status = 'ready';
      trimPreviewImageCache();
      resolve();
    };
    const markError = () => {
      entry.status = 'error';
      reject();
    };
    const resolveReadiness = () => {
      if (typeof img.decode !== 'function') {
        if (img.complete && img.naturalWidth > 0) {
          markReady();
          return;
        }
        markError();
        return;
      }
      void img
        .decode()
        .then(markReady)
        .catch(() => {
          if (img.complete && img.naturalWidth > 0) {
            markReady();
            return;
          }
          markError();
        });
    };
    img.onload = resolveReadiness;
    img.onerror = markError;
    img.src = url;
    if (img.complete) {
      resolveReadiness();
    }
  });

  previewImageCache.set(url, entry);
  return entry.promise;
}

export function useListingImages({
  images,
  currentImageIndex,
  imageErrors,
}: UseListingImagesProps) {
  const mainImageLoadedRef = useRef<Set<number>>(new Set());
  const heroImageLoadedRef = useRef<Set<number>>(new Set());
  const mainImagePreloadingRef = useRef<Set<number>>(new Set());
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const imagesSignature = images.join('\u0001');

  const getPreviewUrl = useCallback(
    (imageUrl: string) => getListingPagePreviewImageUrl(imageUrl),
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
  }, [imagesSignature]);

  const preloadIndex = useCallback(
    (
      index: number,
      callbacks?: {
        onReady?: () => void;
        onFailure?: () => void;
      },
    ) => {
      const imageUrl = imagesRef.current[index];
      if (!imageUrl || imageUrl === '/placeholder-car.jpg' || imageErrors.has(index)) {
        callbacks?.onReady?.();
        return () => {};
      }
      if (isListingPageVideoHeroSlideUrl(imageUrl)) {
        callbacks?.onReady?.();
        return () => {};
      }
      if (mainImageLoadedRef.current.has(index)) {
        callbacks?.onReady?.();
        return () => {};
      }

      let cancelled = false;
      const previewUrl = getPreviewUrl(imageUrl);
      mainImagePreloadingRef.current.add(index);

      void ensurePreviewImageReady(previewUrl)
        .then(() => {
          if (cancelled) return;
          markLoaded(index);
          callbacks?.onReady?.();
        })
        .catch(() => {
          mainImagePreloadingRef.current.delete(index);
          if (cancelled) return;
          callbacks?.onFailure?.();
        });

      return () => {
        cancelled = true;
        if (!mainImageLoadedRef.current.has(index)) {
          mainImagePreloadingRef.current.delete(index);
        }
      };
    },
    [getPreviewUrl, imageErrors, markLoaded],
  );

  useEffect(() => {
    const galleryImages = imagesRef.current;
    if (galleryImages.length <= 1 || typeof window === 'undefined') return;

    const preloadCleanups: Array<() => void> = [];

    const preloadByIndex = (index: number, delay = 0) => {
      if (mainImageLoadedRef.current.has(index) || mainImagePreloadingRef.current.has(index)) {
        return;
      }

      let preloadTimeout: ReturnType<typeof setTimeout> | null = null;
      let cleanup: (() => void) | null = null;

      const startPreload = () => {
        if (mainImageLoadedRef.current.has(index) || mainImagePreloadingRef.current.has(index)) {
          return;
        }
        cleanup = preloadIndex(index);
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
        cleanup?.();
      });
    };

    const nextIndex = (currentImageIndex + 1) % galleryImages.length;
    const prevIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
    const secondAheadIndex = (currentImageIndex + 2) % galleryImages.length;
    const thirdAheadIndex = (currentImageIndex + 3) % galleryImages.length;
    const fourthAheadIndex = (currentImageIndex + 4) % galleryImages.length;
    const fifthAheadIndex = (currentImageIndex + 5) % galleryImages.length;

    type PreloadJob = { index: number; delay: number };
    const preloadJobs: PreloadJob[] = [];
    const addPreloadJob = (idx: number, delay: number) => {
      const url = galleryImages[idx];
      if (
        !url ||
        url === '/placeholder-car.jpg' ||
        imageErrors.has(idx) ||
        isListingPageVideoHeroSlideUrl(url)
      ) {
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
    if (galleryImages.length > 2) {
      addPreloadJob(secondAheadIndex, PRELOAD_SECOND_AHEAD_DELAY_MS);
    }
    if (galleryImages.length > 3) {
      addPreloadJob(thirdAheadIndex, PRELOAD_THIRD_AHEAD_DELAY_MS);
    }
    if (galleryImages.length > 4) {
      addPreloadJob(fourthAheadIndex, PRELOAD_FOURTH_AHEAD_DELAY_MS);
    }
    if (galleryImages.length > 5) {
      addPreloadJob(fifthAheadIndex, PRELOAD_FIFTH_AHEAD_DELAY_MS);
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
  }, [currentImageIndex, imagesSignature, imageErrors, preloadIndex]);

  const isTargetReady = useCallback(
    (index: number) => {
      const imageUrl = images[index];
      if (!imageUrl || imageUrl === '/placeholder-car.jpg' || imageErrors.has(index)) {
        return true;
      }
      if (isListingPageVideoHeroSlideUrl(imageUrl)) {
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
      if (isListingPageVideoHeroSlideUrl(imageUrl)) {
        return true;
      }
      return heroImageLoadedRef.current.has(index) || mainImageLoadedRef.current.has(index);
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
      if (isListingPageVideoHeroSlideUrl(imageUrl)) {
        callbacks?.onReady?.();
        return () => {};
      }
      if (mainImageLoadedRef.current.has(index)) {
        callbacks?.onReady?.();
        return () => {};
      }
      return preloadIndex(index, callbacks);
    },
    [images, imageErrors, preloadIndex],
  );

  const handleHeroImageLoad = useCallback(
    (index: number) => {
      const imageUrl = images[index];
      if (!imageUrl || imageUrl === '/placeholder-car.jpg') return;
      markLoaded(index);
      heroImageLoadedRef.current.add(index);
    },
    [images, markLoaded],
  );

  return {
    mainImageLoadedRef,
    heroImageLoadedRef,
    isTargetReady,
    isHeroReady,
    preloadTarget,
    handleHeroImageLoad,
  };
}
