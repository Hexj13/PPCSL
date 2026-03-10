'use client';

import Link from 'next/link';
import React, { useCallback, useMemo, startTransition } from 'react';

import {
  ListingCardBadges,
  ListingCardImageArea,
  ListingCardImageCarousel,
  type ListingCardImageCarouselHandle,
  ListingCardVehicleSpecs,
} from '@/components/listing/ListingCardParts';
import { PriceDisplay } from '@/components/listing/PriceDisplay';
import { useI18n } from '@/components/providers/I18nProvider';
import { useCities } from '@/hooks/useCities';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import type { Listing } from '@/lib/api';
import { favoritesApi } from '@/lib/api';
import { useAuthStore, useFavoritesStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import {
  formatDateShort,
  formatDateRelative,
  formatViewsCompact,
  getOptimizedImageUrl,
  getCityName,
  getListingDisplayTitle,
  getVehicleType,
} from '@/lib/utils';

interface ListingCardProps {
  listing: Listing;
  forceFavorite?: boolean;
  onRemove?: () => void;
  priority?: boolean;
}

function useListingCardFavorite(
  listing: Listing,
  displayTitle: string,
  forceFavorite: boolean,
  onRemove: (() => void) | undefined,
) {
  const { user } = useAuthStore();
  const { favorites, add: addFavorite, remove: removeFavorite } = useFavoritesStore();
  const storeIsFavorite = useMemo(
    () => forceFavorite || (favorites && favorites.includes(listing.id)),
    [forceFavorite, listing.id, favorites],
  );
  const [localIsFavorite, setLocalIsFavorite] = React.useState(storeIsFavorite);
  const [isToggling, setIsToggling] = React.useState(false);
  const isTogglingRef = React.useRef(false);
  const { t } = useTranslation();

  React.useEffect(() => {
    setLocalIsFavorite(storeIsFavorite);
  }, [storeIsFavorite]);

  const isOwnListing = useMemo(
    () => !!(user && listing.user && user.id === listing.user.id),
    [user, listing.user],
  );

  const handleRemove = useCallback(() => {
    removeFavorite(listing.id);
    onRemove?.();
    favoritesApi
      .remove(listing.id)
      .then(() => {
        analytics.removeFromWishlist(listing.id);
        toast.success(t('listings.removeFromFavorites'));
      })
      .catch(() => {
        setLocalIsFavorite(true);
        addFavorite(listing.id);
        toast.error(t('listings.removeFromFavoritesError'));
      })
      .finally(() => {
        setIsToggling(false);
        isTogglingRef.current = false;
      });
  }, [listing.id, removeFavorite, addFavorite, onRemove, t]);

  const handleAdd = useCallback(() => {
    addFavorite(listing.id);
    favoritesApi
      .add(listing.id)
      .then(() => {
        analytics.addToWishlist(listing.id, { title: displayTitle, price: listing.price });
        toast.success(t('listings.addToFavorites'));
      })
      .catch(() => {
        setLocalIsFavorite(false);
        removeFavorite(listing.id);
        toast.error(t('listings.addToFavoritesError'));
      })
      .finally(() => {
        setIsToggling(false);
        isTogglingRef.current = false;
      });
  }, [listing.id, listing.price, displayTitle, addFavorite, removeFavorite, t]);

  const handleToggleFavorite = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!user) {
        toast.error(t('common.loginRequired'));
        return;
      }
      if (isTogglingRef.current) return;

      const newFavoriteState = !localIsFavorite;
      setIsToggling(true);
      isTogglingRef.current = true;
      setLocalIsFavorite(newFavoriteState);

      startTransition(() => {
        if (localIsFavorite) {
          handleRemove();
          return;
        }
        if (isOwnListing) {
          setLocalIsFavorite(false);
          setIsToggling(false);
          isTogglingRef.current = false;
          return;
        }
        handleAdd();
      });
    },
    [user, localIsFavorite, isOwnListing, t, handleRemove, handleAdd],
  );

  return {
    isFavorite: localIsFavorite,
    isToggling,
    isOwnListing,
    handleToggleFavorite,
  };
}

const RESET_TO_FIRST_DELAY_MS = 10000;
const REWIND_STEP_MS = 400;

function getFavoriteButtonProps(
  favoriteDisabled: boolean,
  isFavorite: boolean,
  isOwnListing: boolean,
) {
  const favoriteButtonClass = favoriteDisabled
    ? 'opacity-30 cursor-not-allowed'
    : isFavorite
      ? 'opacity-100 hover-only:hover:border-primary-400'
      : 'opacity-60 hover-only:hover:opacity-100 hover-only:hover:border-primary-400';
  const favoriteAriaLabel =
    !isFavorite && isOwnListing
      ? 'Не можете да додадете ваше објавување во омилени'
      : isFavorite
        ? 'Отстрани од омилени'
        : 'Додади во омилени';
  return { favoriteButtonClass, favoriteAriaLabel };
}

function CarouselNavButtons({
  disabled,
  onPrev,
  onNext,
  onPrevTouch,
  onNextTouch,
  prevLabel,
  nextLabel,
}: {
  disabled: boolean;
  onPrev: (e: React.MouseEvent) => void;
  onNext: (e: React.MouseEvent) => void;
  onPrevTouch: (e: React.TouchEvent) => void;
  onNextTouch: (e: React.TouchEvent) => void;
  prevLabel: string;
  nextLabel: string;
}) {
  const btnClass = disabled
    ? 'opacity-40 cursor-wait'
    : 'opacity-60 lg:opacity-0 lg:group-hover:opacity-60 hover-only:hover:opacity-100';
  const baseClass =
    'absolute w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center transition-all shadow-lg z-10 text-white touch-manipulation pointer-events-auto';
  return (
    <>
      <button
        type="button"
        onClick={onPrev}
        onTouchStart={onPrevTouch}
        disabled={disabled}
        className={`bottom-3 left-3 ${baseClass} ${btnClass}`}
        aria-label={prevLabel}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={onNext}
        onTouchStart={onNextTouch}
        disabled={disabled}
        className={`bottom-3 right-3 ${baseClass} ${btnClass}`}
        aria-label={nextLabel}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </>
  );
}

function useCardCarouselRewind(
  images: string[],
  carouselIndex: number,
  carouselRef: React.RefObject<ListingCardImageCarouselHandle | null>,
) {
  const resetToFirstTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const rewindIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const clearRewind = useCallback(() => {
    if (resetToFirstTimerRef.current) {
      clearTimeout(resetToFirstTimerRef.current);
      resetToFirstTimerRef.current = null;
    }
    if (rewindIntervalRef.current) {
      clearInterval(rewindIntervalRef.current);
      rewindIntervalRef.current = null;
    }
  }, []);

  React.useEffect(() => () => clearRewind(), [clearRewind]);

  const onMouseLeave = useCallback(() => {
    clearRewind();
    if (images.length <= 1 || carouselIndex === 0) return;
    resetToFirstTimerRef.current = setTimeout(() => {
      resetToFirstTimerRef.current = null;
      rewindIntervalRef.current = setInterval(() => {
        if (carouselRef.current?.isBusy()) return;
        carouselRef.current?.goPrev();
      }, REWIND_STEP_MS);
    }, RESET_TO_FIRST_DELAY_MS);
  }, [images.length, carouselIndex, clearRewind, carouselRef]);

  const onMouseEnter = useCallback(() => {
    clearRewind();
    if (images.length > 1 && typeof window !== 'undefined') {
      const nextIndex = (carouselIndex + 1) % images.length;
      const nextSrc = images[nextIndex];
      if (nextSrc && nextSrc !== '/placeholder-car.jpg') {
        const preloadImg = new window.Image();
        preloadImg.src = getOptimizedImageUrl(nextSrc, 65, 800);
      }
    }
  }, [clearRewind, images, carouselIndex]);
  return { onMouseLeave, onMouseEnter, clearRewind };
}

function ListingCardComponent({
  listing,
  forceFavorite = false,
  onRemove,
  priority = false,
}: ListingCardProps) {
  const { t } = useTranslation();
  const { locale } = useI18n();
  const { cities } = useCities();
  const images = useMemo(
    () => (listing.images?.length ? listing.images : ['/placeholder-car.jpg']),
    [listing.images],
  );
  const vehicleType = getVehicleType(listing);
  const newLabel = vehicleType === 'moto' ? t('listings.newMoto') : t('listings.new');
  const displayTitle = useMemo(() => getListingDisplayTitle(listing, t), [listing, t]);
  const imageAltTitle = useMemo(() => {
    const city = getCityName(listing.city, locale, cities);
    return [displayTitle, city].filter((v) => v && v.trim() !== '').join(' - ');
  }, [displayTitle, listing.city, locale, cities]);

  const { isFavorite, isToggling, isOwnListing, handleToggleFavorite } = useListingCardFavorite(
    listing,
    displayTitle,
    forceFavorite,
    onRemove,
  );

  const [imageErrors, setImageErrors] = React.useState<Set<number>>(() => new Set());
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [isCarouselBusy, setIsCarouselBusy] = React.useState(false);
  const [carouselIndex, setCarouselIndex] = React.useState(0);
  const carouselRef = React.useRef<ListingCardImageCarouselHandle>(null);

  React.useEffect(() => setIsHydrated(true), []);

  const {
    onMouseLeave: handleCardMouseLeave,
    onMouseEnter: handleCardMouseEnter,
    clearRewind,
  } = useCardCarouselRewind(images, carouselIndex, carouselRef);

  const handleCarouselIndexChange = useCallback(
    (index: number) => {
      setCarouselIndex(index);
      if (index === 0) clearRewind();
    },
    [clearRewind],
  );

  const handleCarouselBusyChange = useCallback((busy: boolean) => {
    setIsCarouselBusy(busy);
  }, []);

  const handleClick = useCallback(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/') {
      startTransition(() => {
        sessionStorage.setItem('homeScrollPosition', window.scrollY.toString());
        sessionStorage.setItem('homeScrollTimestamp', Date.now().toString());
      });
    }
  }, []);

  const favoriteDisabled = (!isFavorite && isOwnListing) || isToggling;
  const { favoriteButtonClass, favoriteAriaLabel } = getFavoriteButtonProps(
    favoriteDisabled,
    isFavorite,
    isOwnListing,
  );

  const handlePrevPhoto = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    carouselRef.current?.goPrev();
  }, []);

  const handleNextPhoto = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    carouselRef.current?.goNext();
  }, []);

  const handlePrevPhotoTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    carouselRef.current?.goPrev();
  }, []);

  const handleNextPhotoTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    carouselRef.current?.goNext();
  }, []);

  const cardUrl = `/listings/${listing.id}`;

  const singleImageUrl =
    images[0] && images[0] !== '/placeholder-car.jpg'
      ? getOptimizedImageUrl(images[0], 65, 800)
      : '/placeholder-car.jpg';
  const isLocalhostImage =
    singleImageUrl.startsWith('http://localhost:') ||
    singleImageUrl.startsWith('http://127.0.0.1:');
  const showImage =
    images.length <= 1 &&
    Boolean(singleImageUrl && singleImageUrl !== '/placeholder-car.jpg' && !imageErrors.has(0));

  return (
    <div
      className="card relative overflow-hidden cursor-pointer h-full flex flex-col group"
      onMouseLeave={handleCardMouseLeave}
      onMouseEnter={handleCardMouseEnter}
    >
      <Link
        href={cardUrl}
        prefetch={true}
        onClick={handleClick}
        aria-label={displayTitle}
        className="absolute inset-0 z-0"
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
              onImageError={(index) => setImageErrors((prev) => new Set([...prev, index]))}
              onBusyChange={handleCarouselBusyChange}
              onIndexChange={handleCarouselIndexChange}
              imageAltTitle={imageAltTitle}
              priority={priority}
              t={t}
            />
          ) : (
            <ListingCardImageArea
              showImage={showImage}
              imageUrl={singleImageUrl}
              imageAltTitle={imageAltTitle}
              priority={priority}
              isLocalhostImage={isLocalhostImage}
              onError={() => setImageErrors((prev) => new Set([...prev, 0]))}
              t={t}
            />
          )}
          <ListingCardBadges listing={listing} newLabel={newLabel} t={t} />
          {images.length > 1 && (
            <CarouselNavButtons
              disabled={isCarouselBusy}
              onPrev={handlePrevPhoto}
              onNext={handleNextPhoto}
              onPrevTouch={handlePrevPhotoTouchStart}
              onNextTouch={handleNextPhotoTouchStart}
              prevLabel={t('listings.previousPhoto')}
              nextLabel={t('listings.nextPhoto')}
            />
          )}
          <button
            onClick={handleToggleFavorite}
            disabled={favoriteDisabled}
            className={`absolute top-3 right-3 w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center transition-all shadow-lg z-10 pointer-events-auto ${favoriteButtonClass}`}
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
        </div>
        <div className="p-4 md:p-5 grow flex flex-col">
          <h3 className="font-bold text-base md:text-lg mb-3 line-clamp-2 text-primary-900">
            {displayTitle}
          </h3>
          <div className="flex items-baseline gap-2 mb-3 flex-wrap">
            {listing.price !== undefined ? (
              <PriceDisplay
                price={listing.price}
                currency={listing.currency ?? listing.defaultCurrencyCode ?? 'EUR'}
                approxPrice={listing.approxPriceDefaultCurrency}
                defaultCurrencyCode={listing.defaultCurrencyCode}
                size="small"
                priceClassName="text-primary-500"
                currencyStyle={{ color: 'rgb(var(--text-secondary-rgb))' }}
              />
            ) : (
              <span className="text-xl md:text-2xl font-extrabold text-primary-400">••••</span>
            )}
          </div>
          <div className="grow mb-3">
            {listing.vehicle && <ListingCardVehicleSpecs vehicle={listing.vehicle} t={t} />}
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
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
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
      </div>
    </div>
  );
}

export const ListingCard = React.memo(ListingCardComponent);
