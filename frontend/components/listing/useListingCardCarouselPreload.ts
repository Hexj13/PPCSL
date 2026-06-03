'use client';

import { useEffect, type MutableRefObject } from 'react';

import { applyListingCardResponsivePreload } from '@/components/listing/listing-card-image';

export function bindImageReadiness(
  img: HTMLImageElement,
  onReady: () => void,
  onFailure: () => void,
) {
  let settled = false;

  const handleReady = () => {
    if (settled) return;
    settled = true;
    onReady();
  };

  const handleFailure = () => {
    if (settled) return;
    settled = true;
    onFailure();
  };

  const resolveReadiness = () => {
    if (typeof img.decode === 'function') {
      void img
        .decode()
        .then(handleReady)
        .catch(() => {
          if (img.complete && img.naturalWidth > 0) {
            handleReady();
            return;
          }
          handleFailure();
        });
      return;
    }

    if (img.complete && img.naturalWidth > 0) {
      handleReady();
      return;
    }

    handleFailure();
  };

  img.onload = resolveReadiness;
  img.onerror = handleFailure;

  return resolveReadiness;
}

export function useListingCardCarouselPreload(
  currentIndex: number,
  images: string[],
  imageErrors: Set<number>,
  markLoaded: (index: number) => void,
  loadedRef: MutableRefObject<Set<number>>,
  preloadingRef: MutableRefObject<Set<number>>,
  imagesCacheRef: MutableRefObject<HTMLImageElement[]>,
) {
  useEffect(() => {
    const next = (currentIndex + 1) % images.length;
    const prev = (currentIndex - 1 + images.length) % images.length;

    const preloadIndex = (index: number) => {
      if (!images[index] || images[index] === '/placeholder-car.jpg' || imageErrors.has(index)) {
        return;
      }
      if (loadedRef.current.has(index) || preloadingRef.current.has(index)) {
        return;
      }
      const img = new window.Image();
      imagesCacheRef.current.push(img);
      preloadingRef.current.add(index);
      const resolveReadiness = bindImageReadiness(
        img,
        () => markLoaded(index),
        () => {
          preloadingRef.current.delete(index);
        },
      );
      applyListingCardResponsivePreload(img, images[index]);
      if (img.complete) {
        resolveReadiness();
      }
    };

    preloadIndex(next);
    if (prev !== next) {
      preloadIndex(prev);
    }
  }, [currentIndex, images, imageErrors, markLoaded, loadedRef, preloadingRef, imagesCacheRef]);
}
