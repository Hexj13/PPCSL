import { useEffect, useRef, useState } from 'react';

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
const PRELOAD_THIRD_AHEAD_DELAY_MS = 450;

export function useListingImages({
  images,
  currentImageIndex,
  imageErrors,
}: UseListingImagesProps) {
  const [mainImageLoading, setMainImageLoading] = useState(false);
  const mainImageLoadedRef = useRef<Set<string>>(new Set());
  const navigationCountRef = useRef(0);
  const lastNavigatedIndexRef = useRef(currentImageIndex);
  const hasPreloadedAllRef = useRef(false);
  const imagesCacheRef = useRef<HTMLImageElement[]>([]);
  const imagesSignature = images.join('\u0001');

  const { visible: showMainImageLoader } = useLoadingState({
    isLoading: mainImageLoading,
    minDisplayTime: 1000,
  });

  useEffect(() => {
    mainImageLoadedRef.current.clear();
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

    const preloadImages: HTMLImageElement[] = [];
    const preloadTimeouts: Array<ReturnType<typeof setTimeout>> = [];

    const preloadByIndex = (index: number, delay = 0) => {
      const imageUrl = images[index];
      if (!imageUrl || imageUrl === '/placeholder-car.jpg' || imageErrors.has(index)) {
        return;
      }

      const optimizedUrl = getOptimizedImageUrl(
        imageUrl,
        PREVIEW_IMAGE_QUALITY,
        PREVIEW_IMAGE_WIDTH,
      );
      if (mainImageLoadedRef.current.has(optimizedUrl)) {
        return;
      }

      const startPreload = () => {
        const img = new window.Image();
        imagesCacheRef.current.push(img);
        preloadImages.push(img);
        img.onload = () => {
          mainImageLoadedRef.current.add(optimizedUrl);
        };
        img.src = optimizedUrl;
      };

      if (delay > 0) {
        const timeout = setTimeout(startPreload, delay);
        preloadTimeouts.push(timeout);
        return;
      }

      startPreload();
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
      for (const timeout of preloadTimeouts) {
        clearTimeout(timeout);
      }
      for (const img of preloadImages) {
        img.onload = null;
      }
    };
  }, [currentImageIndex, images, imageErrors]);

  useEffect(() => {
    if (images.length <= 1) {
      setMainImageLoading(false);
      mainImageLoadedRef.current.clear();
      return;
    }

    const currentImage = images[currentImageIndex];

    if (
      !currentImage ||
      currentImage === '/placeholder-car.jpg' ||
      imageErrors.has(currentImageIndex)
    ) {
      setMainImageLoading(false);
      return;
    }

    const optimizedUrl = getOptimizedImageUrl(
      currentImage,
      PREVIEW_IMAGE_QUALITY,
      PREVIEW_IMAGE_WIDTH,
    );

    if (mainImageLoadedRef.current.has(optimizedUrl)) {
      setMainImageLoading(false);
      return;
    }

    const testImg = new window.Image();
    testImg.src = optimizedUrl;
    const imageIndex = currentImageIndex;

    if (testImg.complete && testImg.naturalWidth > 0) {
      mainImageLoadedRef.current.add(optimizedUrl);
      setMainImageLoading(false);
      return;
    }

    setMainImageLoading(true);

    testImg.onload = () => {
      mainImageLoadedRef.current.add(optimizedUrl);
      if (imageIndex === currentImageIndex) {
        setMainImageLoading(false);
      }
    };

    testImg.onerror = () => {
      if (imageIndex === currentImageIndex) {
        setMainImageLoading(false);
      }
    };

    return () => {
      testImg.onload = null;
      testImg.onerror = null;
    };
  }, [currentImageIndex, images, imageErrors]);

  const handleImageLoad = (index: number) => {
    const imageUrl = images[index];
    if (!imageUrl || imageUrl === '/placeholder-car.jpg') return;
    const optimizedUrl = getOptimizedImageUrl(imageUrl, PREVIEW_IMAGE_QUALITY, PREVIEW_IMAGE_WIDTH);
    mainImageLoadedRef.current.add(optimizedUrl);
    if (index === currentImageIndex) {
      setMainImageLoading(false);
    }
  };

  return {
    mainImageLoading,
    showMainImageLoader,
    mainImageLoadedRef,
    handleImageLoad,
  };
}
