'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

import { isListingPageVideoHeroSlideUrl } from '@/lib/listing/listing-page-helpers';
import { getOptimizedImageUrl } from '@/lib/utils';

type UseListingPageImageModalLoadingParams = {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
  imageErrors: Set<number>;
  targetImageWidth: number;
  imageQuality: number;
  setVisibleIndex: Dispatch<SetStateAction<number>>;
};

export function useListingPageImageModalLoading({
  isOpen,
  images,
  currentIndex,
  imageErrors,
  targetImageWidth,
  imageQuality,
  setVisibleIndex,
}: UseListingPageImageModalLoadingParams) {
  const modalImageLoadedRef = useRef<Set<string>>(new Set());
  const imagesCacheRef = useRef<HTMLImageElement[]>([]);
  const [hiResRevision, setHiResRevision] = useState(0);

  const markHiResLoaded = useCallback((url: string) => {
    if (!url || modalImageLoadedRef.current.has(url)) {
      return;
    }
    modalImageLoadedRef.current.add(url);
    setHiResRevision((revision) => revision + 1);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const imagesList = images.length > 0 ? images : ['/placeholder-car.jpg'];
    const currentImage = imagesList[currentIndex];

    if (!currentImage || currentImage === '/placeholder-car.jpg' || imageErrors.has(currentIndex)) {
      setVisibleIndex(currentIndex);
      return;
    }

    if (isListingPageVideoHeroSlideUrl(currentImage)) {
      setVisibleIndex(currentIndex);
      return;
    }

    const optimizedUrl = getOptimizedImageUrl(currentImage, imageQuality, targetImageWidth);

    if (modalImageLoadedRef.current.has(optimizedUrl)) {
      setVisibleIndex(currentIndex);
      return;
    }

    const loadStartTime = performance.now();
    const testImg = new window.Image();
    imagesCacheRef.current.push(testImg);
    testImg.src = optimizedUrl;
    const imgIndex = currentIndex;

    if (testImg.complete && testImg.naturalWidth > 0) {
      markHiResLoaded(optimizedUrl);
      setVisibleIndex(currentIndex);
      return;
    }

    testImg.onload = () => {
      const loadTime = performance.now() - loadStartTime;
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console -- dev instrumentation
        console.debug(`[ImageModal] Hi-res ${imgIndex} prewarmed in ${loadTime.toFixed(0)}ms`);
      }
      markHiResLoaded(optimizedUrl);
      if (imgIndex === currentIndex) {
        setVisibleIndex(currentIndex);
      }
    };

    testImg.onerror = () => {};

    return () => {
      testImg.onload = null;
      testImg.onerror = null;
    };
  }, [
    currentIndex,
    imageErrors,
    imageQuality,
    images,
    isOpen,
    markHiResLoaded,
    setVisibleIndex,
    targetImageWidth,
  ]);

  const imagesCacheKey = images.join('|');

  useEffect(() => {
    modalImageLoadedRef.current.clear();
    setHiResRevision(0);
    for (const img of imagesCacheRef.current) {
      img.onload = null;
      img.onerror = null;
    }
    imagesCacheRef.current = [];
  }, [imagesCacheKey]);

  useEffect(() => {
    if (!isOpen || images.length <= 1) return;

    type Connection = {
      effectiveType?: string;
      saveData?: boolean;
    };

    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    const saveData = connection?.saveData === true;
    const slowNetwork = saveData || ['slow-2g', '2g'].includes(connection?.effectiveType ?? '');
    const wide = typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches;

    const n = images.length;
    const nextIndex = (currentIndex + 1) % n;
    const prevIndex = (currentIndex - 1 + n) % n;
    const plus2 = (currentIndex + 2) % n;
    const minus2 = (currentIndex - 2 + n) % n;

    const preloadImages: HTMLImageElement[] = [];
    const preloadTimeouts: Array<ReturnType<typeof setTimeout>> = [];

    const preloadByIndex = (index: number, delay = 0) => {
      const url = images[index];
      if (!url || url === '/placeholder-car.jpg' || imageErrors.has(index)) return;
      if (isListingPageVideoHeroSlideUrl(url)) return;
      const optimizedUrl = getOptimizedImageUrl(url, imageQuality, targetImageWidth);
      if (modalImageLoadedRef.current.has(optimizedUrl)) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console -- dev instrumentation
          console.debug(`[ImageModal] Preload cache hit for index ${index}`);
        }
        return;
      }
      const startPreload = () => {
        const img = new window.Image();
        imagesCacheRef.current.push(img);
        img.onload = () => {
          markHiResLoaded(optimizedUrl);
        };
        img.src = optimizedUrl;
        preloadImages.push(img);
      };

      if (delay > 0) {
        const timeout = setTimeout(startPreload, delay);
        preloadTimeouts.push(timeout);
        return;
      }

      startPreload();
    };

    preloadByIndex(nextIndex, 80);
    preloadByIndex(prevIndex, 200);

    if (wide && !slowNetwork && n > 2) {
      if (plus2 !== nextIndex && plus2 !== prevIndex) {
        preloadByIndex(plus2, 160);
      }
      if (minus2 !== nextIndex && minus2 !== prevIndex) {
        preloadByIndex(minus2, 280);
      }
    }

    return () => {
      for (const timeout of preloadTimeouts) {
        clearTimeout(timeout);
      }
      for (const img of preloadImages) {
        img.onload = null;
      }
    };
  }, [currentIndex, imageErrors, imageQuality, images, isOpen, markHiResLoaded, targetImageWidth]);

  return { modalImageLoadedRef, hiResRevision, markHiResLoaded };
}
