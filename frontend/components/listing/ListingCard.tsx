'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useCallback, useMemo, startTransition } from 'react';
import { toast } from 'react-hot-toast';

import { PriceDisplay } from '@/components/listing/PriceDisplay';
import { useI18n } from '@/components/providers/I18nProvider';
import { useCities } from '@/hooks/useCities';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import type { Listing } from '@/lib/api';
import { favoritesApi } from '@/lib/api';
import { useAuthStore, useFavoritesStore } from '@/lib/store';
import {
  formatEngineVolume,
  formatMileage,
  formatDriveType,
  formatBodyType,
  formatFuel,
  formatDateShort,
  formatDateRelative,
  formatViewsCompact,
  getOptimizedImageUrl,
  getCityName,
  getListingDisplayTitle,
  getVehicleType,
} from '@/lib/utils';

const SPARKLES_EMOJI = '\u2728';

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

function ListingCardImageArea({
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

function ListingCardBadges({
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
            className="relative z-10 w-4 h-4 flex-shrink-0"
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
            className="relative z-10 flex-shrink-0 text-text-secondary"
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
            className="relative z-10 flex-shrink-0 text-text-secondary"
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

function ListingCardVehicleSpecs({
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

function ListingCardComponent({
  listing,
  forceFavorite = false,
  onRemove,
  priority = false,
}: ListingCardProps) {
  const { t } = useTranslation();
  const { locale } = useI18n();
  const { cities } = useCities();
  const originalImageUrl = useMemo(
    () => listing.images?.[0] || '/placeholder-car.jpg',
    [listing.images],
  );
  const imageUrl = useMemo(() => {
    if (originalImageUrl === '/placeholder-car.jpg') return originalImageUrl;
    return getOptimizedImageUrl(originalImageUrl, 65, 800);
  }, [originalImageUrl]);
  const isLocalhostImage = useMemo(
    () => imageUrl.startsWith('http://localhost:') || imageUrl.startsWith('http://127.0.0.1:'),
    [imageUrl],
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

  const [imageError, setImageError] = React.useState(false);
  const [isHydrated, setIsHydrated] = React.useState(false);
  React.useEffect(() => setIsHydrated(true), []);

  const handleClick = useCallback(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/') {
      startTransition(() => {
        sessionStorage.setItem('homeScrollPosition', window.scrollY.toString());
        sessionStorage.setItem('homeScrollTimestamp', Date.now().toString());
      });
    }
  }, []);

  const favoriteDisabled = (!isFavorite && isOwnListing) || isToggling;
  const { favoriteButtonClass, favoriteAriaLabel } = useMemo(
    () => ({
      favoriteButtonClass: favoriteDisabled
        ? 'opacity-30 cursor-not-allowed'
        : isFavorite
          ? 'opacity-100 hover:border-primary-400'
          : 'opacity-60 hover:opacity-100 hover:border-primary-400',
      favoriteAriaLabel:
        !isFavorite && isOwnListing
          ? 'Не можете да додадете ваше објавување во омилени'
          : isFavorite
            ? 'Отстрани од омилени'
            : 'Додади во омилени',
    }),
    [favoriteDisabled, isFavorite, isOwnListing],
  );

  const showImage = Boolean(imageUrl && imageUrl !== '/placeholder-car.jpg' && !imageError);

  return (
    <Link href={`/listings/${listing.id}`} prefetch={true} onClick={handleClick}>
      <div className="card overflow-hidden cursor-pointer h-full flex flex-col group">
        <div
          className="relative w-full bg-bg-darker flex-shrink-0 overflow-hidden"
          style={{ aspectRatio: '16/9', minHeight: '240px' }}
        >
          <ListingCardImageArea
            showImage={showImage}
            imageUrl={imageUrl}
            imageAltTitle={imageAltTitle}
            priority={priority}
            isLocalhostImage={isLocalhostImage}
            onError={() => setImageError(true)}
            t={t}
          />
          <ListingCardBadges listing={listing} newLabel={newLabel} t={t} />
          <button
            onClick={handleToggleFavorite}
            disabled={favoriteDisabled}
            className={`absolute top-3 right-3 w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center transition-all shadow-lg z-10 ${favoriteButtonClass}`}
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
        <div className="p-4 md:p-5 flex-grow flex flex-col">
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
          <div className="flex-grow mb-3">
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
    </Link>
  );
}

export const ListingCard = React.memo(ListingCardComponent);
