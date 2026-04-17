'use client';

import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { TrackedNextImage } from '@/components/common/TrackedNextImage';
import {
  bindImageReadiness,
  useListingCardCarouselPreload,
} from '@/components/listing/useListingCardCarouselPreload';
import { getOptimizedImageUrl } from '@/lib/utils';
import { Spinner } from '@/ui';

export const IMAGE_SLIDE_DURATION_MS = 220;

export function ListingCardImageArea({
  showImage,
  imageUrl,
  imageAltTitle,
  priority,
  blurDataURL,
  onError,
  t,
}: {
  showImage: boolean;
  imageUrl: string;
  imageAltTitle: string;
  priority: boolean;
  blurDataURL?: string;
  onError: () => void;
  t: (_key: string, _params?: Record<string, string>) => string;
}) {
  if (showImage) {
    return (
      <TrackedNextImage
        src={imageUrl}
        alt={t('listings.imageAlt', { title: imageAltTitle, index: '1' })}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
        className="object-cover lg:group-hover:scale-105 transition-transform duration-300"
        loading={priority ? undefined : 'lazy'}
        priority={priority}
        draggable={false}
        onError={onError}
        unoptimized
        placeholder={blurDataURL ? 'blur' : undefined}
        blurDataURL={blurDataURL}
      />
    );
  }
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ color: 'rgb(var(--text-secondary-rgb))' }}
    >
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
        />
      </svg>
    </div>
  );
}

type CarouselState =
  | { type: 'idle'; index: number }
  | { type: 'preloading'; fromIndex: number; toIndex: number; direction: 'next' | 'prev' }
  | {
      type: 'animating';
      fromIndex: number;
      toIndex: number;
      direction: 'next' | 'prev';
      phase: 'setup' | 'running';
    };

export interface ListingCardImageCarouselHandle {
  goNext: () => void;
  goPrev: () => void;
  isBusy: () => boolean;
  getIndex: () => number;
}

export const ListingCardImageCarousel = React.forwardRef<
  ListingCardImageCarouselHandle,
  {
    images: string[];
    imageErrors: Set<number>;
    onImageError: (index: number) => void;
    onBusyChange?: (busy: boolean) => void;
    onIndexChange?: (index: number) => void;
    imageAltTitle: string;
    priority: boolean;
    blurDataURL?: string;
    t: (_key: string, _params?: Record<string, string>) => string;
  }
>(function ListingCardImageCarousel(
  {
    images,
    imageErrors,
    onImageError,
    onBusyChange,
    onIndexChange,
    imageAltTitle,
    priority,
    blurDataURL,
    t,
  },
  ref,
) {
  const [state, setState] = useState<CarouselState>({ type: 'idle', index: 0 });
  const loadedRef = useRef<Set<number>>(new Set());
  const preloadingRef = useRef<Set<number>>(new Set());
  const rafRef = useRef<number | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hasPreloadedAllRef = useRef(false);
  const imagesCacheRef = useRef<HTMLImageElement[]>([]);
  const imagesSignature = images.join('\u0001');
  const onIndexChangeRef = useRef(onIndexChange);
  const onBusyChangeRef = useRef(onBusyChange);
  onIndexChangeRef.current = onIndexChange;
  onBusyChangeRef.current = onBusyChange;

  const isBusy = state.type !== 'idle';
  const currentIndex = state.type === 'idle' ? state.index : state.fromIndex;

  useEffect(() => {
    onBusyChangeRef.current?.(isBusy);
  }, [isBusy]);

  const isIdle = state.type === 'idle';
  const idleIndex = isIdle ? state.index : -1;
  useEffect(() => {
    if (isIdle && idleIndex >= 0) {
      onIndexChangeRef.current?.(idleIndex);
    }
  }, [isIdle, idleIndex]);

  useEffect(() => {
    hasPreloadedAllRef.current = false;
    loadedRef.current.clear();
    preloadingRef.current.clear();
    for (const img of imagesCacheRef.current) {
      img.onload = null;
      img.onerror = null;
    }
    imagesCacheRef.current = [];
    if (rafRef.current !== undefined) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = undefined;
    }
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    setState({ type: 'idle', index: 0 });
  }, [imagesSignature]);

  const markLoaded = useCallback((index: number) => {
    loadedRef.current.add(index);
    preloadingRef.current.delete(index);
  }, []);

  const isTargetReady = useCallback(
    (index: number) => {
      const src = images[index];
      if (!src || src === '/placeholder-car.jpg' || imageErrors.has(index)) return true;
      return loadedRef.current.has(index);
    },
    [images, imageErrors],
  );

  const preloadAllRemaining = useCallback(() => {
    if (hasPreloadedAllRef.current || images.length <= 1) return;
    hasPreloadedAllRef.current = true;

    for (let index = 0; index < images.length; index += 1) {
      const src = images[index];
      if (!src || src === '/placeholder-car.jpg' || imageErrors.has(index)) {
        continue;
      }
      if (loadedRef.current.has(index) || preloadingRef.current.has(index)) {
        continue;
      }

      const url = getOptimizedImageUrl(src, 65, 640);
      const img = new window.Image();
      imagesCacheRef.current.push(img);
      preloadingRef.current.add(index);
      const resolveReadiness = bindImageReadiness(
        img,
        () => {
          markLoaded(index);
        },
        () => {
          preloadingRef.current.delete(index);
        },
      );
      img.src = url;
      if (img.complete) {
        resolveReadiness();
      }
    }
  }, [images, imageErrors, markLoaded]);

  const startAnimating = useCallback(
    (
      fromIndex: number,
      toIndex: number,
      direction: 'next' | 'prev',
      markAsLoadedOnCommit = false,
    ) => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
      if (timerRef.current !== undefined) clearTimeout(timerRef.current);

      setState({
        type: 'animating',
        fromIndex,
        toIndex,
        direction,
        phase: 'setup',
      });

      rafRef.current = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setState((s) => (s.type === 'animating' ? { ...s, phase: 'running' as const } : s));
          timerRef.current = setTimeout(() => {
            if (markAsLoadedOnCommit) {
              loadedRef.current.add(toIndex);
            }
            preloadingRef.current.delete(toIndex);
            setState({ type: 'idle', index: toIndex });
            if (timerRef.current !== undefined) {
              clearTimeout(timerRef.current);
              timerRef.current = undefined;
            }
          }, IMAGE_SLIDE_DURATION_MS + 30);
        });
      });
    },
    [],
  );

  const loadTargetThenAnimate = useCallback(
    (fromIndex: number, toIndex: number, direction: 'next' | 'prev') => {
      const src = images[toIndex];
      if (!src || src === '/placeholder-car.jpg' || imageErrors.has(toIndex)) {
        startAnimating(fromIndex, toIndex, direction);
        return;
      }
      if (loadedRef.current.has(toIndex)) {
        startAnimating(fromIndex, toIndex, direction, true);
        return;
      }

      const url = getOptimizedImageUrl(src, 65, 640);
      const img = new window.Image();
      imagesCacheRef.current.push(img);
      preloadingRef.current.add(toIndex);
      const resolveReadiness = bindImageReadiness(
        img,
        () => {
          markLoaded(toIndex);
          startAnimating(fromIndex, toIndex, direction, true);
        },
        () => {
          preloadingRef.current.delete(toIndex);
          startAnimating(fromIndex, toIndex, direction);
        },
      );
      img.src = url;
      if (img.complete) {
        resolveReadiness();
      }
    },
    [images, imageErrors, markLoaded, startAnimating],
  );

  const goNext = useCallback(() => {
    if (state.type !== 'idle') return;
    const fromIndex = state.index;
    const len = images.length;
    if (len <= 1) return;
    if (!hasPreloadedAllRef.current) {
      preloadAllRemaining();
    }
    const toIndex = (fromIndex + 1) % len;
    if (isTargetReady(toIndex)) {
      startAnimating(fromIndex, toIndex, 'next', loadedRef.current.has(toIndex));
    } else {
      setState({ type: 'preloading', fromIndex, toIndex, direction: 'next' });
      loadTargetThenAnimate(fromIndex, toIndex, 'next');
    }
  }, [
    images.length,
    state,
    isTargetReady,
    startAnimating,
    loadTargetThenAnimate,
    preloadAllRemaining,
  ]);

  const goPrev = useCallback(() => {
    if (state.type !== 'idle') return;
    const fromIndex = state.index;
    const len = images.length;
    if (len <= 1) return;
    if (!hasPreloadedAllRef.current) {
      preloadAllRemaining();
    }
    const toIndex = (fromIndex - 1 + len) % len;
    if (isTargetReady(toIndex)) {
      startAnimating(fromIndex, toIndex, 'prev', loadedRef.current.has(toIndex));
    } else {
      setState({ type: 'preloading', fromIndex, toIndex, direction: 'prev' });
      loadTargetThenAnimate(fromIndex, toIndex, 'prev');
    }
  }, [
    images.length,
    state,
    isTargetReady,
    startAnimating,
    loadTargetThenAnimate,
    preloadAllRemaining,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      goNext,
      goPrev,
      isBusy: () => state.type !== 'idle',
      getIndex: () => (state.type === 'idle' ? state.index : state.fromIndex),
    }),
    [goNext, goPrev, state],
  );

  useListingCardCarouselPreload(
    currentIndex,
    images,
    imageErrors,
    markLoaded,
    loadedRef,
    preloadingRef,
    imagesCacheRef,
  );

  useEffect(
    () => () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
      if (timerRef.current !== undefined) clearTimeout(timerRef.current);
    },
    [],
  );

  const errorPlaceholder = React.useMemo(
    () => (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
          />
        </svg>
      </div>
    ),
    [],
  );

  const renderNativeSlide = useCallback(
    (index: number) => {
      const src = images[index];
      if (!src) return null;
      if (imageErrors.has(index)) return errorPlaceholder;
      const imageUrl = src === '/placeholder-car.jpg' ? src : getOptimizedImageUrl(src, 65, 640);
      return (
        <TrackedNextImage
          key={`card-native-${index}`}
          src={imageUrl}
          alt={t('listings.imageAltWithTotal', {
            title: imageAltTitle,
            index: String(index + 1),
            total: String(images.length),
          })}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          draggable={false}
          className="object-cover"
          unoptimized
          onLoad={() => markLoaded(index)}
          onError={() => onImageError(index)}
        />
      );
    },
    [images, imageErrors, imageAltTitle, t, markLoaded, onImageError, errorPlaceholder],
  );

  const renderSlide = useCallback(
    (index: number) => {
      const src = images[index];
      if (!src) return null;
      if (imageErrors.has(index)) return errorPlaceholder;
      const imageUrl = src === '/placeholder-car.jpg' ? src : getOptimizedImageUrl(src, 65, 640);
      if (index !== 0) {
        return renderNativeSlide(index);
      }
      const isFirst = priority && index === 0;
      return (
        <TrackedNextImage
          key={`card-slide-${index}`}
          src={imageUrl}
          alt={t('listings.imageAltWithTotal', {
            title: imageAltTitle,
            index: String(index + 1),
            total: String(images.length),
          })}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          className="object-cover"
          loading={isFirst ? undefined : 'lazy'}
          priority={isFirst}
          draggable={false}
          onLoad={() => {
            markLoaded(index);
          }}
          onError={() => {
            onImageError(index);
          }}
          unoptimized
          placeholder={blurDataURL ? 'blur' : undefined}
          blurDataURL={blurDataURL}
        />
      );
    },
    [
      images,
      imageErrors,
      imageAltTitle,
      priority,
      blurDataURL,
      t,
      markLoaded,
      onImageError,
      errorPlaceholder,
      renderNativeSlide,
    ],
  );

  const slideBase: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
  };

  const visibleIndex = state.type === 'idle' ? state.index : state.fromIndex;
  const isPreloading = state.type === 'preloading';
  const isAnimating = state.type === 'animating';
  const dir = isAnimating ? state.direction : 'next';
  const isRunning = isAnimating && state.phase === 'running';
  const enterFrom = dir === 'next' ? 'translate3d(100%, 0, 0)' : 'translate3d(-100%, 0, 0)';
  const exitTo = dir === 'next' ? 'translate3d(-100%, 0, 0)' : 'translate3d(100%, 0, 0)';

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ isolation: 'isolate' }}>
      {isPreloading && (
        <div className="absolute inset-0 z-[2] flex items-center justify-center bg-black/10 pointer-events-none">
          <Spinner size="sm" inline />
        </div>
      )}
      <div
        style={{
          ...slideBase,
          transform: isAnimating
            ? isRunning
              ? exitTo
              : 'translate3d(0%, 0, 0)'
            : 'translate3d(0%, 0, 0)',
          transition:
            isAnimating && isRunning ? `transform ${IMAGE_SLIDE_DURATION_MS}ms ease-out` : 'none',
          willChange: isAnimating ? 'transform' : 'auto',
        }}
      >
        {renderSlide(isAnimating ? state.fromIndex : visibleIndex)}
      </div>
      {isAnimating && (
        <div
          style={{
            ...slideBase,
            transform: isRunning ? 'translate3d(0%, 0, 0)' : enterFrom,
            transition: isRunning ? `transform ${IMAGE_SLIDE_DURATION_MS}ms ease-out` : 'none',
            willChange: 'transform',
          }}
        >
          {state.toIndex === 0 && priority ? renderSlide(0) : renderNativeSlide(state.toIndex)}
        </div>
      )}
    </div>
  );
});

export {
  ListingCardBadges,
  ListingCardTireSpecs,
  ListingCardVehicleSpecs,
} from './ListingCardBadgesAndSpecs';
