'use client';

import Image from 'next/image';
import React from 'react';

import type { Listing } from '@/lib/api';
import { getOptimizedImageUrl } from '@/lib/utils';
import {
  formatBodyType,
  formatDriveType,
  formatEngineVolume,
  formatFuel,
  formatMileage,
} from '@/lib/utils';

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

export function ListingCardImageCarousel({
  images,
  currentImageIndex,
  direction: externalDirection,
  imageErrors,
  onImageError,
  imageAltTitle,
  priority,
  t,
}: {
  images: string[];
  currentImageIndex: number;
  direction?: 'next' | 'prev';
  imageErrors: Set<number>;
  onImageError: (index: number) => void;
  imageAltTitle: string;
  priority: boolean;
  t: (_key: string, _params?: Record<string, string>) => string;
}) {
  const [animState, setAnimState] = React.useState<{
    fromIndex: number;
    toIndex: number;
    direction: 'next' | 'prev';
    phase: 'setup' | 'running';
  } | null>(null);
  const prevIndexRef = React.useRef(currentImageIndex);
  const rafRef = React.useRef<number | undefined>(undefined);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const preloadedRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    const preload = (idx: number) => {
      const src = images[idx];
      if (!src || src === '/placeholder-car.jpg' || imageErrors.has(idx)) return;
      const url = getOptimizedImageUrl(src, 65, 800);
      if (preloadedRef.current.has(url)) return;
      preloadedRef.current.add(url);
      const img = new window.Image();
      img.src = url;
    };
    const next = (currentImageIndex + 1) % images.length;
    const prev = (currentImageIndex - 1 + images.length) % images.length;
    preload(next);
    if (prev !== next) preload(prev);
  }, [currentImageIndex, images, imageErrors]);

  React.useEffect(() => {
    if (images.length <= 1) return;
    const timer = setTimeout(() => {
      const src = images[1];
      if (!src || src === '/placeholder-car.jpg') return;
      const url = getOptimizedImageUrl(src, 65, 800);
      if (!preloadedRef.current.has(url)) {
        preloadedRef.current.add(url);
        const img = new window.Image();
        img.src = url;
      }
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useLayoutEffect(() => {
    const from = prevIndexRef.current;
    const to = currentImageIndex;
    if (from === to) return;
    prevIndexRef.current = to;

    let dir: 'next' | 'prev';
    if (externalDirection) {
      dir = externalDirection;
    } else {
      const len = images.length;
      const fwd = (to - from + len) % len;
      const bwd = (from - to + len) % len;
      dir = fwd <= bwd ? 'next' : 'prev';
    }

    if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    if (timerRef.current !== undefined) clearTimeout(timerRef.current);

    setAnimState({ fromIndex: from, toIndex: to, direction: dir, phase: 'setup' });

    rafRef.current = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimState((s) => (s ? { ...s, phase: 'running' } : null));
        timerRef.current = setTimeout(() => {
          setAnimState(null);
        }, IMAGE_SLIDE_DURATION_MS + 30);
      });
    });
  }, [currentImageIndex, images.length, externalDirection]);

  React.useEffect(
    () => () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
      if (timerRef.current !== undefined) clearTimeout(timerRef.current);
    },
    [],
  );

  const renderSlide = (index: number, eager?: boolean) => {
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
    const isPriority = priority && index === 0;
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
        loading={isPriority ? undefined : eager ? 'eager' : 'lazy'}
        priority={isPriority}
        draggable={false}
        onError={() => onImageError(index)}
        unoptimized={isLocalhostImage && process.env.NODE_ENV === 'development'}
      />
    );
  };

  const isAnimating = animState !== null;
  const dir = animState?.direction ?? 'next';
  const isRunning = animState?.phase === 'running';
  const enterFrom = dir === 'next' ? '100%' : '-100%';
  const exitTo = dir === 'next' ? '-100%' : '100%';

  const slideBase: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
  };

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        style={{
          ...slideBase,
          transform: isAnimating
            ? isRunning
              ? 'translateX(0%)'
              : `translateX(${enterFrom})`
            : 'translateX(0%)',
          transition:
            isAnimating && isRunning ? `transform ${IMAGE_SLIDE_DURATION_MS}ms ease-out` : 'none',
          willChange: isAnimating ? 'transform' : 'auto',
        }}
      >
        {renderSlide(currentImageIndex, isAnimating)}
      </div>
      {isAnimating && (
        <div
          style={{
            ...slideBase,
            transform: isRunning ? `translateX(${exitTo})` : 'translateX(0%)',
            transition: isRunning ? `transform ${IMAGE_SLIDE_DURATION_MS}ms ease-out` : 'none',
            willChange: 'transform',
          }}
        >
          {renderSlide(animState.fromIndex, true)}
        </div>
      )}
    </div>
  );
}

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
      {vehicle.engine_displ_l && (
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
