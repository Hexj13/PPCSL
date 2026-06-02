'use client';

import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { TrackedNextImage } from '@/components/common/TrackedNextImage';
import { useListingCardCarouselPreload } from '@/components/listing/useListingCardCarouselPreload';
import { getOptimizedImageUrl } from '@/lib/utils';

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

export interface ListingCardImageCarouselHandle {
  goNext: () => void;
  goPrev: () => void;
  isBusy: () => boolean;
  getIndex: () => number;
}

type ListingCardCarouselSlotId = 'primary' | 'secondary';

type ListingCardCarouselState = {
  confirmedSlot: ListingCardCarouselSlotId;
  pendingSlot: ListingCardCarouselSlotId | null;
  slotIndices: Record<ListingCardCarouselSlotId, number | null>;
};

function createListingCardCarouselState(index = 0): ListingCardCarouselState {
  return {
    confirmedSlot: 'primary',
    pendingSlot: null,
    slotIndices: {
      primary: index,
      secondary: null,
    },
  };
}

function getConfirmedCardCarouselIndex(state: ListingCardCarouselState): number {
  return state.slotIndices[state.confirmedSlot] ?? 0;
}

function getIdleCardCarouselSlot(state: ListingCardCarouselState): ListingCardCarouselSlotId {
  return state.confirmedSlot === 'primary' ? 'secondary' : 'primary';
}

export const ListingCardImageCarousel = React.forwardRef<
  ListingCardImageCarouselHandle,
  {
    images: string[];
    imageErrors: Set<number>;
    onImageError: (index: number) => void;
    onIndexChange?: (index: number) => void;
    imageAltTitle: string;
    priority: boolean;
    blurDataURLs?: (string | undefined)[];
    t: (_key: string, _params?: Record<string, string>) => string;
  }
>(function ListingCardImageCarousel(
  { images, imageErrors, onImageError, onIndexChange, imageAltTitle, priority, blurDataURLs, t },
  ref,
) {
  const [state, setState] = useState(() => createListingCardCarouselState(0));
  const stateRef = useRef(state);
  const loadedRef = useRef<Set<number>>(new Set());
  const preloadingRef = useRef<Set<number>>(new Set());
  const imagesCacheRef = useRef<HTMLImageElement[]>([]);
  const imagesSignature = images.join('\u0001');
  const onIndexChangeRef = useRef(onIndexChange);
  onIndexChangeRef.current = onIndexChange;
  stateRef.current = state;
  const confirmedIndex = getConfirmedCardCarouselIndex(state);

  useEffect(() => {
    onIndexChangeRef.current?.(confirmedIndex);
  }, [confirmedIndex]);

  const markLoaded = useCallback((idx: number) => {
    loadedRef.current.add(idx);
    preloadingRef.current.delete(idx);
  }, []);

  useEffect(() => {
    loadedRef.current.clear();
    preloadingRef.current.clear();
    for (const img of imagesCacheRef.current) {
      img.onload = null;
      img.onerror = null;
    }
    imagesCacheRef.current = [];
    const nextState = createListingCardCarouselState(0);
    stateRef.current = nextState;
    setState(nextState);
  }, [imagesSignature]);

  const len = images.length;
  const promotePendingSlot = useCallback((slotId: ListingCardCarouselSlotId, idx: number) => {
    const snapshot = stateRef.current;
    if (snapshot.pendingSlot !== slotId || snapshot.slotIndices[slotId] !== idx) return;
    const nextState: ListingCardCarouselState = {
      ...snapshot,
      confirmedSlot: slotId,
      pendingSlot: null,
    };
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  const navigateTo = useCallback(
    (targetIndex: number) => {
      if (len <= 1) return;
      const snapshot = stateRef.current;
      if (snapshot.pendingSlot !== null) return;
      const currentIndex = getConfirmedCardCarouselIndex(snapshot);
      if (currentIndex === targetIndex) return;

      const targetSrc = images[targetIndex];
      const nextSlot = getIdleCardCarouselSlot(snapshot);
      const nextState: ListingCardCarouselState = {
        ...snapshot,
        pendingSlot: nextSlot,
        slotIndices: {
          ...snapshot.slotIndices,
          [nextSlot]: targetIndex,
        },
      };
      stateRef.current = nextState;
      setState(nextState);

      if (!targetSrc || targetSrc === '/placeholder-car.jpg') {
        requestAnimationFrame(() => promotePendingSlot(nextSlot, targetIndex));
      } else if (imageErrors.has(targetIndex)) {
        requestAnimationFrame(() => promotePendingSlot(nextSlot, targetIndex));
      }
    },
    [imageErrors, images, len, promotePendingSlot],
  );

  const goNext = useCallback(() => {
    const currentIndex = getConfirmedCardCarouselIndex(stateRef.current);
    navigateTo((currentIndex + 1) % len);
  }, [len, navigateTo]);

  const goPrev = useCallback(() => {
    const currentIndex = getConfirmedCardCarouselIndex(stateRef.current);
    navigateTo((currentIndex - 1 + len) % len);
  }, [len, navigateTo]);

  useImperativeHandle(
    ref,
    () => ({
      goNext,
      goPrev,
      isBusy: () => stateRef.current.pendingSlot !== null,
      getIndex: () => getConfirmedCardCarouselIndex(stateRef.current),
    }),
    [goNext, goPrev],
  );

  useListingCardCarouselPreload(
    confirmedIndex,
    images,
    imageErrors,
    markLoaded,
    loadedRef,
    preloadingRef,
    imagesCacheRef,
  );

  const errorPlaceholder = React.useMemo(
    () => (
      <div
        className="w-full h-full flex items-center justify-center bg-bg-darker"
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

  const slideBlur = useCallback((idx: number) => blurDataURLs?.[idx], [blurDataURLs]);

  const renderSlide = useCallback(
    (idx: number, slotId: ListingCardCarouselSlotId, isPending: boolean) => {
      const src = images[idx];
      if (!src) return null;
      if (imageErrors.has(idx)) return errorPlaceholder;
      const imageUrl = src === '/placeholder-car.jpg' ? src : getOptimizedImageUrl(src, 65);
      const isFirst = priority && idx === 0;
      const b = slideBlur(idx);
      const shouldUseBlurPlaceholder = Boolean(b) && !isPending && !loadedRef.current.has(idx);
      return (
        <TrackedNextImage
          key={`card-slide-${slotId}-${idx}`}
          src={imageUrl}
          alt={t('listings.imageAltWithTotal', {
            title: imageAltTitle,
            index: String(idx + 1),
            total: String(images.length),
          })}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          className="object-cover"
          loading={isFirst ? undefined : 'lazy'}
          priority={isFirst}
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget;
            const finish = () => {
              markLoaded(idx);
              if (isPending) {
                promotePendingSlot(slotId, idx);
              }
            };
            if (img && typeof img.decode === 'function') {
              img.decode().then(finish).catch(finish);
            } else {
              finish();
            }
          }}
          onError={() => {
            onImageError(idx);
            if (isPending) {
              promotePendingSlot(slotId, idx);
            }
          }}
          placeholder={shouldUseBlurPlaceholder ? 'blur' : undefined}
          blurDataURL={shouldUseBlurPlaceholder ? b : undefined}
        />
      );
    },
    [
      images,
      imageErrors,
      imageAltTitle,
      priority,
      t,
      markLoaded,
      onImageError,
      errorPlaceholder,
      promotePendingSlot,
      slideBlur,
    ],
  );

  useEffect(() => {
    const pendingSlot = state.pendingSlot;
    if (!pendingSlot) return;
    const pendingIndex = state.slotIndices[pendingSlot];
    if (pendingIndex === null || !loadedRef.current.has(pendingIndex)) return;
    const frame = requestAnimationFrame(() => promotePendingSlot(pendingSlot, pendingIndex));
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [promotePendingSlot, state]);

  const renderLayer = (slotId: ListingCardCarouselSlotId) => {
    const slotIndex = state.slotIndices[slotId];
    if (slotIndex === null) return null;
    const isConfirmed = slotId === state.confirmedSlot;
    const isPending = slotId === state.pendingSlot;
    return (
      <div
        key={slotId}
        data-testid={isConfirmed ? 'carousel-layer-confirmed' : 'carousel-layer-pending'}
        className="absolute inset-0 overflow-hidden"
        style={{
          zIndex: isConfirmed ? 1 : 0,
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        {renderSlide(slotIndex, slotId, isPending)}
      </div>
    );
  };

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ isolation: 'isolate' }}>
      {renderLayer('primary')}
      {renderLayer('secondary')}
    </div>
  );
});

export {
  ListingCardBadges,
  ListingCardTireSpecs,
  ListingCardVehicleSpecs,
} from './ListingCardBadgesAndSpecs';
