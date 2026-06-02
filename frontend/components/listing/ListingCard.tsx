'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useRef, startTransition } from 'react';

import { prewarmListingPageHeroImage } from '@/lib/listing/listing-page-helpers';
import {
  ListingCardBadges,
  ListingCardImageArea,
  ListingCardImageCarousel,
  type ListingCardImageCarouselHandle,
  ListingCardTireSpecs,
  ListingCardVehicleSpecs,
} from '@/components/listing/ListingCardParts';
import { ListingClosedStatusBadge } from '@/components/listing/ListingClosedStatusBadge';
import { ListingPhotoCarouselNavButtons } from '@/components/listing/ListingPhotoCarouselNavButtons';
import { PriceDisplay } from '@/components/listing/PriceDisplay';
import { TireListingPriceSuffix } from '@/components/listing/TireListingPriceSuffix';
import { useI18n } from '@/components/providers/I18nProvider';
import { useListingGridCities } from '@/components/listing/CitiesProvider';
import {
  getCompareButtonClassName,
  useListingCardComparison,
} from '@/hooks/useListingCardComparison';
import { getFavoriteButtonClassName, useListingCardFavorite } from '@/hooks/useListingCardFavorite';
import { useListingCardImageError } from '@/hooks/useListingCardImageError';
import { useTranslation } from '@/hooks/useTranslation';
import type { Listing } from '@/lib/api';
import { setBlurForListing, setIndexForListing } from '@/lib/blur-navigation-cache';
import { decodeBlurhashOffMain, getDecodedBlurhashFromCache } from '@/lib/blurhash-worker-client';
import { CARD_EXIT_ANIMATION_MS } from '@/lib/constants';
import { observeElementVisibility } from '@/lib/intersection-observer-registry';
import { preserveHomeScrollPosition } from '@/lib/preserve-home-scroll';
import { stripLocalePrefixFromPathname } from '@/lib/url-locale';
import {
  formatDateShort,
  formatDateRelative,
  formatViewsCompact,
  getOptimizedImageUrl,
  getCityName,
  getListingDisplayTitle,
  getListingHref,
  getVehicleType,
  isTireListing,
} from '@/lib/utils';

interface ListingCardProps {
  listing: Listing;
  forceFavorite?: boolean;
  onRemove?: () => void;
  priority?: boolean;
  linkPrefetch?: boolean;
}

const RESET_TO_FIRST_DELAY_MS = 10000;
const REWIND_STEP_MS = 400;

function ListingCardBody({
  listing,
  displayTitle,
  locale,
  cities,
  isHydrated,
  t,
}: {
  listing: Listing;
  displayTitle: string;
  locale: string;
  cities: ReturnType<typeof useListingGridCities>['cities'];
  isHydrated: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const tireCard = isTireListing(listing);
  return (
    <div className="p-4 md:p-5 grow flex flex-col">
      <h3 className="font-bold text-base md:text-lg mb-3 line-clamp-2 text-primary-900">
        {displayTitle}
      </h3>
      <div className="flex items-baseline justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-baseline gap-2 flex-wrap min-w-0">
          {listing.price !== undefined ? (
            <>
              <PriceDisplay
                price={listing.price}
                currency={listing.currency ?? listing.defaultCurrencyCode ?? 'EUR'}
                approxPrice={listing.approxPriceDefaultCurrency}
                defaultCurrencyCode={listing.defaultCurrencyCode}
                size="small"
                priceClassName="text-primary-500"
                currencyStyle={{ color: 'rgb(var(--text-secondary-rgb))' }}
              />
              <TireListingPriceSuffix
                listing={listing}
                t={t}
                className="text-xs md:text-sm font-medium shrink-0"
              />
            </>
          ) : (
            <span className="text-xl md:text-2xl font-extrabold text-primary-400">••••</span>
          )}
        </div>
        {listing.status === 'Closed' && (
          <ListingClosedStatusBadge label={t('listingDetail.closed')} className="shrink-0" />
        )}
      </div>
      <div className="grow mb-3">
        {tireCard ? (
          <ListingCardTireSpecs listing={listing} t={t} />
        ) : (
          listing.vehicle && <ListingCardVehicleSpecs vehicle={listing.vehicle} t={t} />
        )}
      </div>
      <div
        className="flex justify-between items-center gap-2 text-sm font-medium mt-auto pt-3 border-t border-primary-500/20"
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        <span className="min-w-0 truncate">{getCityName(listing.city, locale, cities)}</span>
        <div className="flex items-center gap-3 shrink-0">
          {listing.views !== undefined && listing.views > 0 && (
            <>
              <span className="flex items-center gap-1 text-sm shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                {formatViewsCompact(listing.views)}
              </span>
              <span className="h-4 w-px bg-primary-500/20 shrink-0" />
            </>
          )}
          <span suppressHydrationWarning>
            {isHydrated
              ? formatDateRelative(listing.last_updated_at, t, locale)
              : formatDateShort(listing.last_updated_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

function useCardCarouselRewind(
  images: string[],
  carouselIndex: number,
  carouselRef: React.RefObject<ListingCardImageCarouselHandle | null>,
  cardRef: React.RefObject<HTMLDivElement | null>,
) {
  const resetToFirstTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const rewindIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const [isMobileOrTablet, setIsMobileOrTablet] = React.useState(false);
  const [isAutoRewinding, setIsAutoRewinding] = React.useState(false);

  const clearRewind = useCallback(() => {
    if (resetToFirstTimerRef.current) {
      clearTimeout(resetToFirstTimerRef.current);
      resetToFirstTimerRef.current = null;
    }
    if (rewindIntervalRef.current) {
      clearInterval(rewindIntervalRef.current);
      rewindIntervalRef.current = null;
    }
    setIsAutoRewinding(false);
  }, []);

  React.useEffect(() => () => clearRewind(), [clearRewind]);

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(max-width: 1024px)');
    const update = (event?: MediaQueryListEvent) => {
      setIsMobileOrTablet(event ? event.matches : mql.matches);
    };
    update();
    mql.addEventListener('change', update);
    return () => {
      mql.removeEventListener('change', update);
    };
  }, []);

  const startRewindTimer = useCallback(
    (restart: boolean) => {
      if (restart) {
        clearRewind();
      }
      if (images.length <= 1 || carouselIndex === 0) return;
      if (
        resetToFirstTimerRef.current ||
        rewindIntervalRef.current ||
        (isAutoRewinding && !restart)
      ) {
        return;
      }
      resetToFirstTimerRef.current = setTimeout(() => {
        resetToFirstTimerRef.current = null;
        setIsAutoRewinding(true);
        rewindIntervalRef.current = setInterval(() => {
          carouselRef.current?.goPrev();
        }, REWIND_STEP_MS);
      }, RESET_TO_FIRST_DELAY_MS);
    },
    [images.length, carouselIndex, clearRewind, carouselRef, isAutoRewinding],
  );

  const onMouseLeave = useCallback(() => {
    if (isMobileOrTablet) return;
    startRewindTimer(true);
  }, [isMobileOrTablet, startRewindTimer]);

  const onMouseEnter = useCallback(() => {
    if (!isMobileOrTablet) {
      clearRewind();
    }
    if (images.length > 1 && typeof window !== 'undefined') {
      const nextIndex = (carouselIndex + 1) % images.length;
      const nextSrc = images[nextIndex];
      if (nextSrc && nextSrc !== '/placeholder-car.jpg') {
        const preloadImg = new window.Image();
        preloadImg.src = getOptimizedImageUrl(nextSrc, 65, 640);
      }
    }
  }, [clearRewind, images, carouselIndex, isMobileOrTablet]);

  React.useEffect(() => {
    if (!isMobileOrTablet) return;
    const node = cardRef.current;
    if (!node) return;
    return observeElementVisibility(node, (isIntersecting) => {
      if (!isIntersecting) {
        startRewindTimer(false);
      }
    });
  }, [isMobileOrTablet, cardRef, startRewindTimer]);

  return { onMouseLeave, onMouseEnter, clearRewind, isAutoRewinding };
}

function cardFavoriteExitMotionClass(
  isHydrated: boolean,
  isRemovingFromFavorites: boolean,
): string {
  if (!isHydrated || !isRemovingFromFavorites) return '';
  return 'transition-[opacity,transform] ease-out opacity-0 scale-[0.97]';
}

function cardFavoriteExitMotionStyle(
  isHydrated: boolean,
  isRemovingFromFavorites: boolean,
): { transitionDuration: string } | undefined {
  if (!isHydrated || !isRemovingFromFavorites) return undefined;
  return { transitionDuration: `${CARD_EXIT_ANIMATION_MS}ms` };
}

function listingCardNewLabelText(
  listing: Listing,
  vehicleType: 'car' | 'truck' | 'moto',
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (isTireListing(listing)) return '';
  if (vehicleType === 'moto') return t('listings.newMoto');
  return t('listings.new');
}

function listingCardFavoriteAriaLabelText(
  isFavorite: boolean,
  isOwnListing: boolean,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (isFavorite) return t('listings.favoriteRemoveAria');
  if (isOwnListing) return t('listings.favoriteOwnListingAria');
  return t('listings.favoriteAddAria');
}

function ListingCardComponent({
  listing,
  forceFavorite = false,
  onRemove,
  priority = false,
  linkPrefetch = false,
}: ListingCardProps) {
  const { t } = useTranslation();
  const { locale } = useI18n();
  const { cities } = useListingGridCities();
  const images = useMemo(
    () => (listing.images?.length ? listing.images : ['/placeholder-car.jpg']),
    [listing.images],
  );
  const vehicleType = getVehicleType(listing);
  const newLabel = listingCardNewLabelText(listing, vehicleType, t);
  const displayTitle = useMemo(() => getListingDisplayTitle(listing, t), [listing, t]);
  const imageAltTitle = useMemo(() => {
    const city = getCityName(listing.city, locale, cities);
    return [displayTitle, city].filter((v) => v && v.trim() !== '').join(' - ');
  }, [displayTitle, listing.city, locale, cities]);

  const { isFavorite, isToggling, isOwnListing, handleToggleFavorite, isRemovingFromFavorites } =
    useListingCardFavorite(listing, displayTitle, forceFavorite, onRemove);

  const { isInComparison, handleToggleComparison } = useListingCardComparison(
    listing,
    displayTitle,
  );
  const showCompareButton = listing.status !== 'Closed';
  const compareButtonClass = getCompareButtonClassName(isInComparison);
  const compareAriaLabel = isInComparison
    ? t('listings.compareRemoveFromComparisonAria')
    : t('listings.compareAddToComparisonAria');

  const [imageErrors, setImageErrors] = React.useState<Set<number>>(() => new Set());
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [carouselIndex, setCarouselIndex] = React.useState(0);
  const [suppressBadgeHoverExpand, setSuppressBadgeHoverExpand] = React.useState(false);
  const carouselRef = React.useRef<ListingCardImageCarouselHandle>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const navigationPreparedRef = useRef(false);

  React.useEffect(() => setIsHydrated(true), []);
  React.useEffect(() => {
    navigationPreparedRef.current = false;
  }, [listing.id]);

  const {
    onMouseLeave: handleCardMouseLeave,
    onMouseEnter: handleCardMouseEnter,
    clearRewind,
    isAutoRewinding,
  } = useCardCarouselRewind(images, carouselIndex, carouselRef, cardRef);

  const handleCarouselIndexChange = useCallback(
    (index: number) => {
      setCarouselIndex(index);
      if (index === 0) clearRewind();
      if (images.length > 1 && index !== 0) {
        setSuppressBadgeHoverExpand(true);
      }
    },
    [clearRewind, images.length],
  );

  const handleCardMouseLeaveCombined = useCallback(() => {
    setSuppressBadgeHoverExpand(false);
    handleCardMouseLeave();
  }, [handleCardMouseLeave]);

  const prepareListingNavigation = useCallback(() => {
    if (navigationPreparedRef.current) {
      return;
    }
    navigationPreparedRef.current = true;

    if (listing.cover_blur_hash) {
      setBlurForListing(listing.id, listing.cover_blur_hash, images[0]);
    }
    const fromHome =
      typeof window !== 'undefined' &&
      stripLocalePrefixFromPathname(window.location.pathname).restPath === '/';
    const galleryIndex = fromHome ? 0 : (carouselRef.current?.getIndex() ?? carouselIndex);
    setIndexForListing(listing.id, galleryIndex);
    prewarmListingPageHeroImage(listing.id, images[galleryIndex] ?? images[0]);
    if (fromHome) {
      startTransition(() => {
        preserveHomeScrollPosition(listing.id);
      });
    }
  }, [listing.id, listing.cover_blur_hash, images, carouselIndex]);

  const handleClick = useCallback(() => {
    prepareListingNavigation();
  }, [prepareListingNavigation]);

  const handleLinkPointerDown = useCallback(() => {
    prepareListingNavigation();
  }, [prepareListingNavigation]);

  const favoriteDisabled = isToggling;
  const favoriteButtonClass = getFavoriteButtonClassName(isToggling, isFavorite);
  const favoriteAriaLabel = listingCardFavoriteAriaLabelText(isFavorite, isOwnListing, t);

  const goCarouselPrev = useCallback(() => {
    if (isAutoRewinding) return;
    clearRewind();
    carouselRef.current?.goPrev();
  }, [isAutoRewinding, clearRewind]);

  const goCarouselNext = useCallback(() => {
    if (isAutoRewinding) return;
    clearRewind();
    carouselRef.current?.goNext();
  }, [isAutoRewinding, clearRewind]);

  const handlePrevPhoto = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      goCarouselPrev();
    },
    [goCarouselPrev],
  );

  const handleNextPhoto = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      goCarouselNext();
    },
    [goCarouselNext],
  );

  const cardUrl = getListingHref(listing, locale);

  const singleImageUrl =
    images[0] && images[0] !== '/placeholder-car.jpg'
      ? getOptimizedImageUrl(images[0], 65, 640)
      : '/placeholder-car.jpg';
  const showImage =
    images.length <= 1 &&
    Boolean(singleImageUrl && singleImageUrl !== '/placeholder-car.jpg' && !imageErrors.has(0));

  const [resolvedBlurDataURL, setResolvedBlurDataURL] = React.useState<string | undefined>(() => {
    const ch = listing.cover_blur_hash;
    return typeof ch === 'string' && ch.length >= 6 ? getDecodedBlurhashFromCache(ch) : undefined;
  });
  const [resolvedImageBlurDataURLs, setResolvedImageBlurDataURLs] = React.useState<
    (string | undefined)[]
  >(() => {
    const ch = listing.cover_blur_hash;
    const hs = listing.image_blur_hashes ?? [];
    const coverCached =
      typeof ch === 'string' && ch.length >= 6 ? getDecodedBlurhashFromCache(ch) : undefined;
    return images.map((_, i) => {
      const h = hs[i];
      if (typeof h === 'string' && h.length >= 6) {
        return getDecodedBlurhashFromCache(h) ?? coverCached;
      }
      return coverCached;
    });
  });

  useEffect(() => {
    let cancelled = false;
    const coverHash = listing.cover_blur_hash;
    const hashes = listing.image_blur_hashes ?? [];
    const seedCover =
      typeof coverHash === 'string' && coverHash.length >= 6
        ? getDecodedBlurhashFromCache(coverHash)
        : undefined;
    setResolvedBlurDataURL(seedCover);
    setResolvedImageBlurDataURLs(
      images.map((_, i) => {
        const h = hashes[i];
        if (typeof h === 'string' && h.length >= 6) {
          return getDecodedBlurhashFromCache(h) ?? seedCover;
        }
        return seedCover;
      }),
    );

    const needed = new Set<string>();
    if (typeof coverHash === 'string' && coverHash.length >= 6) {
      needed.add(coverHash);
    }
    for (const h of hashes) {
      if (typeof h === 'string' && h.length >= 6) {
        needed.add(h);
      }
    }

    const run = async () => {
      const decoded = new Map<string, string | undefined>();
      await Promise.all(
        [...needed].map(async (h) => {
          const url = await decodeBlurhashOffMain(h);
          if (!cancelled) {
            decoded.set(h, url);
          }
        }),
      );
      if (cancelled) return;
      const coverDataUrl =
        typeof coverHash === 'string' && coverHash.length >= 6 ? decoded.get(coverHash) : undefined;
      setResolvedBlurDataURL(coverDataUrl);
      setResolvedImageBlurDataURLs(
        images.map((_, i) => {
          const h = hashes[i];
          if (typeof h === 'string' && h.length >= 6) {
            return decoded.get(h) ?? coverDataUrl;
          }
          return coverDataUrl;
        }),
      );
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [listing.cover_blur_hash, listing.image_blur_hashes, images]);

  const handleImageError = useListingCardImageError(
    listing.id,
    images,
    imageErrors,
    setImageErrors,
  );

  const compareTopClassName = useMemo(() => {
    if (isFavorite) return 'top-14';
    if (isInComparison) return 'top-14 lg:top-3 lg:group-hover:top-14';
    return 'top-14';
  }, [isFavorite, isInComparison]);

  return (
    <div
      ref={cardRef}
      data-testid={`listing-card-${listing.id}`}
      className={[
        'card relative overflow-hidden cursor-pointer h-full flex flex-col group',
        cardFavoriteExitMotionClass(isHydrated, isRemovingFromFavorites),
      ]
        .filter(Boolean)
        .join(' ')}
      style={cardFavoriteExitMotionStyle(isHydrated, isRemovingFromFavorites)}
      onMouseLeave={handleCardMouseLeaveCombined}
      onMouseEnter={handleCardMouseEnter}
    >
      <Link
        href={cardUrl}
        prefetch={linkPrefetch}
        onClick={handleClick}
        onPointerDown={handleLinkPointerDown}
        aria-label={displayTitle}
        className="absolute inset-0 z-0"
        data-testid={`listing-card-link-${listing.id}`}
      />
      <div className="relative z-[1] flex h-full flex-col pointer-events-none">
        <div
          className="relative w-full bg-bg-darker shrink-0 overflow-hidden"
          style={{ aspectRatio: '16/9', minHeight: '240px' }}
        >
          {images.length > 1 ? (
            <ListingCardImageCarousel
              ref={carouselRef}
              images={images}
              imageErrors={imageErrors}
              onImageError={handleImageError}
              onIndexChange={handleCarouselIndexChange}
              imageAltTitle={imageAltTitle}
              priority={priority}
              blurDataURLs={resolvedImageBlurDataURLs}
              t={t}
            />
          ) : (
            <ListingCardImageArea
              showImage={showImage}
              imageUrl={singleImageUrl}
              imageAltTitle={imageAltTitle}
              priority={priority}
              blurDataURL={resolvedBlurDataURL}
              onError={() => handleImageError(0)}
              t={t}
            />
          )}
          <ListingCardBadges
            listing={listing}
            newLabel={newLabel}
            t={t}
            carouselBrowsingCompact={images.length > 1 && carouselIndex !== 0}
            allowCollapsedBadgesHoverExpand={!suppressBadgeHoverExpand}
          />
          {images.length > 1 && (
            <ListingPhotoCarouselNavButtons
              variant="card"
              disabled={isAutoRewinding}
              onPrev={handlePrevPhoto}
              onNext={handleNextPhoto}
              prevLabel={t('listings.previousPhoto')}
              nextLabel={t('listings.nextPhoto')}
            />
          )}
          <button
            onClick={handleToggleFavorite}
            disabled={favoriteDisabled}
            className={`absolute top-3 right-3 z-10 box-border flex h-10 w-10 items-center justify-center rounded-full border-2 border-transparent bg-primary-500 shadow-lg transition-[opacity,border-color] duration-300 ease-out pointer-events-auto ${favoriteButtonClass}`}
            aria-label={favoriteAriaLabel}
          >
            <svg
              className={`w-6 h-6 ${isFavorite ? 'text-red-400' : 'text-white'}`}
              fill={isFavorite ? 'currentColor' : 'none'}
              stroke={isFavorite ? 'white' : 'currentColor'}
              strokeWidth={isFavorite ? 1.5 : 2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
          {showCompareButton && (
            <button
              type="button"
              onClick={handleToggleComparison}
              className={`absolute right-3 z-10 box-border flex h-10 w-10 items-center justify-center rounded-full border-2 border-transparent bg-primary-500 shadow-lg transition-[top,opacity,border-color] duration-300 ease-out pointer-events-auto ${compareTopClassName} ${compareButtonClass}`}
              aria-label={compareAriaLabel}
            >
              <svg
                className={`w-6 h-6 ${isInComparison ? 'text-red-400' : 'text-white'}`}
                fill={isInComparison ? 'currentColor' : 'none'}
                stroke={isInComparison ? 'white' : 'currentColor'}
                strokeWidth={isInComparison ? 1.5 : 2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                />
              </svg>
            </button>
          )}
        </div>
        <ListingCardBody
          listing={listing}
          displayTitle={displayTitle}
          locale={locale}
          cities={cities}
          isHydrated={isHydrated}
          t={t}
        />
      </div>
    </div>
  );
}

export const ListingCard = React.memo(ListingCardComponent);
