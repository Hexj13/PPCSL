'use client';

import Image from 'next/image';
import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import type { Listing } from '@/lib/api';
import { getOptimizedImageUrl } from '@/lib/utils';
import {
  formatBodyType,
  formatDriveType,
  formatEngineVolume,
  formatFuel,
  formatMileage,
} from '@/lib/utils';
import { Spinner } from '@/ui';

export const IMAGE_SLIDE_DURATION_MS = 220;

const SPARKLES_EMOJI = '\u2728';

export function ListingCardImageArea({
  showImage,
  imageUrl,
  imageAltTitle,
  priority,
  isLocalhostImage,
  onError,
  t,
}: {
  showImage: boolean;
  imageUrl: string;
  imageAltTitle: string;
  priority: boolean;
  isLocalhostImage: boolean;
  onError: () => void;
  t: (_key: string, _params?: Record<string, string>) => string;
}) {
  if (showImage) {
    return (
      <Image
        src={imageUrl}
        alt={t('listings.imageAlt', { title: imageAltTitle, index: '1' })}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
        className="object-cover lg:group-hover:scale-105 transition-transform duration-300"
        loading={priority ? undefined : 'lazy'}
        priority={priority}
        draggable={false}
        onError={onError}
        unoptimized={isLocalhostImage && process.env.NODE_ENV === 'development'}
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
    t: (_key: string, _params?: Record<string, string>) => string;
  }
>(function ListingCardImageCarousel(
  { images, imageErrors, onImageError, onBusyChange, onIndexChange, imageAltTitle, priority, t },
  ref,
) {
  const [state, setState] = useState<CarouselState>({ type: 'idle', index: 0 });
  const loadedRef = useRef<Set<number>>(new Set());
  const preloadingRef = useRef<Set<number>>(new Set());
  const rafRef = useRef<number | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
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

  const startAnimating = useCallback(
    (fromIndex: number, toIndex: number, direction: 'next' | 'prev') => {
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
        startAnimating(fromIndex, toIndex, direction);
        return;
      }

      const url = getOptimizedImageUrl(src, 65, 800);
      const img = new window.Image();
      preloadingRef.current.add(toIndex);
      img.src = url;

      if (img.complete && img.naturalWidth > 0) {
        markLoaded(toIndex);
        startAnimating(fromIndex, toIndex, direction);
        return;
      }

      img.onload = () => {
        markLoaded(toIndex);
        startAnimating(fromIndex, toIndex, direction);
      };
      img.onerror = () => {
        preloadingRef.current.delete(toIndex);
        startAnimating(fromIndex, toIndex, direction);
      };
    },
    [images, imageErrors, markLoaded, startAnimating],
  );

  const goNext = useCallback(() => {
    if (state.type !== 'idle') return;
    const fromIndex = state.index;
    const len = images.length;
    if (len <= 1) return;
    const toIndex = (fromIndex + 1) % len;
    if (isTargetReady(toIndex)) {
      startAnimating(fromIndex, toIndex, 'next');
    } else {
      setState({ type: 'preloading', fromIndex, toIndex, direction: 'next' });
      loadTargetThenAnimate(fromIndex, toIndex, 'next');
    }
  }, [images.length, state, isTargetReady, startAnimating, loadTargetThenAnimate]);

  const goPrev = useCallback(() => {
    if (state.type !== 'idle') return;
    const fromIndex = state.index;
    const len = images.length;
    if (len <= 1) return;
    const toIndex = (fromIndex - 1 + len) % len;
    if (isTargetReady(toIndex)) {
      startAnimating(fromIndex, toIndex, 'prev');
    } else {
      setState({ type: 'preloading', fromIndex, toIndex, direction: 'prev' });
      loadTargetThenAnimate(fromIndex, toIndex, 'prev');
    }
  }, [images.length, state, isTargetReady, startAnimating, loadTargetThenAnimate]);

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

  useEffect(() => {
    const next = (currentIndex + 1) % images.length;
    const prev = (currentIndex - 1 + images.length) % images.length;
    if (images[next] && images[next] !== '/placeholder-car.jpg' && !imageErrors.has(next)) {
      if (!loadedRef.current.has(next) && !preloadingRef.current.has(next)) {
        const url = getOptimizedImageUrl(images[next], 65, 800);
        const img = new window.Image();
        preloadingRef.current.add(next);
        img.src = url;
        img.onload = () => markLoaded(next);
        img.onerror = () => preloadingRef.current.delete(next);
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
        preloadingRef.current.add(prev);
        img.src = url;
        img.onload = () => markLoaded(prev);
        img.onerror = () => preloadingRef.current.delete(prev);
      }
    }
  }, [currentIndex, images, imageErrors, markLoaded]);

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
        preloadingRef.current.add(idx);
        img.src = url;
        img.onload = () => markLoaded(idx);
        img.onerror = () => preloadingRef.current.delete(idx);
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [images, markLoaded]);

  useEffect(
    () => () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
      if (timerRef.current !== undefined) clearTimeout(timerRef.current);
    },
    [],
  );

  const renderSlide = useCallback(
    (index: number, eager?: boolean) => {
      const src = images[index];
      if (!src) return null;
      if (imageErrors.has(index)) {
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
      const imageUrl = src === '/placeholder-car.jpg' ? src : getOptimizedImageUrl(src, 65, 800);
      const isLocalhostImage =
        imageUrl.startsWith('http://localhost:') || imageUrl.startsWith('http://127.0.0.1:');
      return (
        <Image
          key={`card-slide-${index}`}
          src={imageUrl}
          alt={t('listings.imageAltWithTotal', {
            title: imageAltTitle,
            index: String(index + 1),
            total: String(images.length),
          })}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          className="object-cover lg:group-hover:scale-105 transition-transform duration-300"
          loading={priority && index === 0 ? undefined : eager ? 'eager' : 'lazy'}
          priority={priority && index === 0}
          draggable={false}
          onLoad={() => markLoaded(index)}
          onError={() => onImageError(index)}
          unoptimized={isLocalhostImage && process.env.NODE_ENV === 'development'}
        />
      );
    },
    [images, imageErrors, imageAltTitle, priority, t, markLoaded, onImageError],
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
  const enterFrom = dir === 'next' ? '100%' : '-100%';
  const exitTo = dir === 'next' ? '-100%' : '100%';

  return (
    <div className="absolute inset-0 overflow-hidden">
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
              ? `translateX(${exitTo})`
              : 'translateX(0%)'
            : 'translateX(0%)',
          transition:
            isAnimating && isRunning ? `transform ${IMAGE_SLIDE_DURATION_MS}ms ease-out` : 'none',
          willChange: isAnimating ? 'transform' : 'auto',
        }}
      >
        {renderSlide(isAnimating ? state.fromIndex : visibleIndex, isAnimating)}
      </div>
      {isAnimating && (
        <div
          style={{
            ...slideBase,
            transform: isRunning ? 'translateX(0%)' : `translateX(${enterFrom})`,
            transition: isRunning ? `transform ${IMAGE_SLIDE_DURATION_MS}ms ease-out` : 'none',
            willChange: 'transform',
          }}
        >
          {renderSlide(state.toIndex, true)}
        </div>
      )}
    </div>
  );
});

export function ListingCardBadges({
  listing,
  newLabel,
  t,
}: {
  listing: Listing;
  newLabel: string;
  t: (_key: string) => string;
}) {
  const compact = !!(listing.is_promoted && listing.is_new && listing.urgent);
  const badgeCollapseClass = compact
    ? 'px-3 py-1.5 gap-1.5 lg:px-1.5 lg:py-1.5 lg:gap-0 lg:group-hover:px-3 lg:group-hover:gap-1.5'
    : 'px-3 py-1.5 gap-1.5';
  const labelCollapseClass = compact
    ? 'w-auto opacity-100 lg:w-0 lg:opacity-0 lg:overflow-hidden lg:group-hover:w-auto lg:group-hover:opacity-100'
    : 'w-auto opacity-100';

  return (
    <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
      {listing.is_promoted && (
        <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold bg-white/90 border-2 border-accent text-text-secondary shadow-lg whitespace-nowrap w-fit before:absolute before:inset-0 before:rounded-lg before:bg-accent/10 before:pointer-events-none">
          <svg
            className="relative z-10 w-4 h-4 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
          <span className="relative z-10">{t('listings.promoted')}</span>
        </span>
      )}
      {listing.is_new && (
        <span
          className={`relative inline-flex items-center overflow-hidden rounded-lg text-xs md:text-sm font-semibold bg-white/90 border-2 border-newBadge text-text-secondary shadow-lg whitespace-nowrap transition-all duration-300 w-fit before:absolute before:inset-0 before:rounded-lg before:bg-newBadge/10 before:pointer-events-none ${badgeCollapseClass}`}
        >
          <span
            className="relative z-10 shrink-0 text-text-secondary"
            style={{ filter: 'grayscale(1) brightness(0.5)' }}
            aria-label={newLabel}
          >
            {SPARKLES_EMOJI}
          </span>
          <span className={`relative z-10 transition-all duration-300 ${labelCollapseClass}`}>
            {newLabel}
          </span>
        </span>
      )}
      {listing.urgent && (
        <span
          className={`relative inline-flex items-center overflow-hidden rounded-lg text-xs md:text-sm font-semibold bg-white/90 border-2 border-accentSecondary text-text-secondary shadow-lg whitespace-nowrap transition-all duration-300 w-fit before:absolute before:inset-0 before:rounded-lg before:bg-accentSecondary/10 before:pointer-events-none ${badgeCollapseClass}`}
        >
          <span
            className="relative z-10 shrink-0 text-text-secondary"
            style={{ filter: 'grayscale(1) brightness(0.5)' }}
          >
            🔥
          </span>
          <span className={`relative z-10 transition-all duration-300 ${labelCollapseClass}`}>
            {t('listings.urgent')}
          </span>
        </span>
      )}
    </div>
  );
}

export function ListingCardVehicleSpecs({
  vehicle,
  t,
}: {
  vehicle: NonNullable<Listing['vehicle']>;
  t: (_key: string) => string;
}) {
  return (
    <div className="text-sm space-y-1.5" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
      {vehicle.engine_displ_l != null && (
        <div>
          {t('userListings.engine')}: {formatEngineVolume(vehicle.engine_displ_l)}{' '}
          {t('listings.liters')}
        </div>
      )}
      {vehicle.fuel && (
        <div>
          {t('userListings.fuel')}: {formatFuel(vehicle.fuel, t)}
        </div>
      )}
      {vehicle.mileage_km !== null && vehicle.mileage_km !== undefined && (
        <div>
          {t('userListings.mileage')}: {formatMileage(vehicle.mileage_km)} {t('listings.km')}
        </div>
      )}
      {vehicle.drive_type && (
        <div>
          {t('userListings.driveType')}: {formatDriveType(vehicle.drive_type, t)}
        </div>
      )}
      {vehicle.body_type && (
        <div>
          {t('userListings.bodyType')}: {formatBodyType(vehicle.body_type, t)}
        </div>
      )}
    </div>
  );
}
