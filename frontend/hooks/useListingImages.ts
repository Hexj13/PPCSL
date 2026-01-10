import { useEffect, useRef, useState } from 'react';

import { useLoadingState } from '@/hooks/useLoadingState';
import { getOptimizedImageUrl } from '@/lib/utils';

interface UseListingImagesProps {
  images: string[];
  currentImageIndex: number;
}

export function useListingImages({ images, currentImageIndex }: UseListingImagesProps) {
  const [mainImageLoading, setMainImageLoading] = useState(false);
  const mainImageLoadedRef = useRef<Set<number>>(new Set());
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  const { visible: showMainImageLoader } = useLoadingState({
    isLoading: mainImageLoading,
    minDisplayTime: 1000,
  });

  useEffect(() => {
    if (images.length <= 1) return;

    const nextIndex = (currentImageIndex + 1) % images.length;
    const nextImageUrl = images[nextIndex];

    if (!nextImageUrl || nextImageUrl === '/placeholder-car.jpg' || imageErrors.has(nextIndex)) {
      return;
    }

    const optimizedUrl = getOptimizedImageUrl(nextImageUrl, 75, 1200);
    const img = new window.Image();
    img.src = optimizedUrl;
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

    if (mainImageLoadedRef.current.has(currentImageIndex)) {
      setMainImageLoading(false);
      return;
    }

    const optimizedUrl = getOptimizedImageUrl(currentImage, 75, 1200);
    const testImg = new window.Image();
    testImg.src = optimizedUrl;
    const imgIndex = currentImageIndex;

    if (testImg.complete && testImg.naturalWidth > 0) {
      mainImageLoadedRef.current.add(imgIndex);
      setMainImageLoading(false);
      return;
    }

    setMainImageLoading(true);

    testImg.onload = () => {
      mainImageLoadedRef.current.add(imgIndex);
      if (imgIndex === currentImageIndex) {
        setMainImageLoading(false);
      }
    };

    testImg.onerror = () => {
      if (imgIndex === currentImageIndex) {
        setMainImageLoading(false);
      }
    };

    return () => {
      testImg.onload = null;
      testImg.onerror = null;
    };
  }, [currentImageIndex, images, imageErrors]);

  const handleImageLoad = (index: number) => {
    mainImageLoadedRef.current.add(index);
    if (index === currentImageIndex) {
      setMainImageLoading(false);
    }
  };

  const handleImageError = (index: number) => {
    setImageErrors((prev) => new Set(prev).add(index));
    if (index === currentImageIndex) {
      setMainImageLoading(false);
    }
  };

  return {
    mainImageLoading,
    showMainImageLoader,
    imageErrors,
    setImageErrors,
    mainImageLoadedRef,
    handleImageLoad,
    handleImageError,
  };
}
