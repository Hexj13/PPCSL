'use client';

import { useEffect } from 'react';

import { getOptimizedImageUrl } from '@/lib/utils';

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
  loadedRef: React.MutableRefObject<Set<number>>,
  preloadingRef: React.MutableRefObject<Set<number>>,
  imagesCacheRef: React.MutableRefObject<HTMLImageElement[]>,
) {
  useEffect(() => {
    const next = (currentIndex + 1) % images.length;
    const prev = (currentIndex - 1 + images.length) % images.length;
    if (images[next] && images[next] !== '/placeholder-car.jpg' && !imageErrors.has(next)) {
      if (!loadedRef.current.has(next) && !preloadingRef.current.has(next)) {
        const url = getOptimizedImageUrl(images[next], 65, 800);
        const img = new window.Image();
        imagesCacheRef.current.push(img);
        preloadingRef.current.add(next);
        const resolveReadiness = bindImageReadiness(
          img,
          () => markLoaded(next),
          () => preloadingRef.current.delete(next),
        );
        img.src = url;
        if (img.complete) {
          resolveReadiness();
        }
      }
    }
    if (
      prev !== next &&
      images[prev] &&
      images[prev] !== '/placeholder-car.jpg' &&
      !imageErrors.has(prev)
    ) {
      if (!loadedRef.current.has(prev) && !preloadingRef.current.has(prev)) {
        const url = getOptimizedImageUrl(images[prev], 65, 800);
        const img = new window.Image();
        imagesCacheRef.current.push(img);
        preloadingRef.current.add(prev);
        const resolveReadiness = bindImageReadiness(
          img,
          () => markLoaded(prev),
          () => preloadingRef.current.delete(prev),
        );
        img.src = url;
        if (img.complete) {
          resolveReadiness();
        }
      }
    }
  }, [currentIndex, images, imageErrors, markLoaded, loadedRef, preloadingRef, imagesCacheRef]);

  useEffect(() => {
    if (images.length <= 1) return;
    const t = setTimeout(() => {
      const idx = 1;
      if (
        images[idx] &&
        images[idx] !== '/placeholder-car.jpg' &&
        !loadedRef.current.has(idx) &&
        !preloadingRef.current.has(idx)
      ) {
        const url = getOptimizedImageUrl(images[idx], 65, 800);
        const img = new window.Image();
        imagesCacheRef.current.push(img);
        preloadingRef.current.add(idx);
        const resolveReadiness = bindImageReadiness(
          img,
          () => markLoaded(idx),
          () => preloadingRef.current.delete(idx),
        );
        img.src = url;
        if (img.complete) {
          resolveReadiness();
        }
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [images, markLoaded, loadedRef, preloadingRef, imagesCacheRef]);
}
