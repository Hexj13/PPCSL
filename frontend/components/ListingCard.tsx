'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useCallback, useMemo, startTransition } from 'react';
import { toast } from 'react-hot-toast';

import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import { Listing, favoritesApi } from '@/lib/api';
import { useAuthStore, useFavoritesStore } from '@/lib/store';
import {
  formatPrice,
  formatEngineVolume,
  formatMileage,
  formatDriveType,
  formatBodyType,
  formatDateShort,
  getOptimizedImageUrl,
  getCityNameMk,
} from '@/lib/utils';

interface ListingCardProps {
  listing: Listing;
  forceFavorite?: boolean;
  onRemove?: () => void;
  priority?: boolean;
}

function ListingCardComponent({
  listing,
  forceFavorite = false,
  onRemove,
  priority = false,
}: ListingCardProps) {
  const { t } = useTranslation();
  const originalImageUrl = useMemo(
    () => listing.images?.[0] || '/placeholder-car.jpg',
    [listing.images]
  );
  const imageUrl = useMemo(() => {
    if (originalImageUrl === '/placeholder-car.jpg') {
      return originalImageUrl;
    }
    return getOptimizedImageUrl(originalImageUrl, 65, 800);
  }, [originalImageUrl]);
  const isLocalhostImage = useMemo(
    () => imageUrl.startsWith('http://localhost:') || imageUrl.startsWith('http://127.0.0.1:'),
    [imageUrl]
  );
  const vehicle = listing.vehicle;
  const { user } = useAuthStore();
  const { favorites, add: addFavorite, remove: removeFavorite } = useFavoritesStore();
  const storeIsFavorite = useMemo(
    () => forceFavorite || (favorites && favorites.includes(listing.id)),
    [forceFavorite, listing.id, favorites]
  );
  const [localIsFavorite, setLocalIsFavorite] = React.useState(storeIsFavorite);
  const [isToggling, setIsToggling] = React.useState(false);
  const isTogglingRef = React.useRef(false);
  const isFavorite = localIsFavorite;

  React.useEffect(() => {
    setLocalIsFavorite(storeIsFavorite);
  }, [storeIsFavorite]);

  const isOwnListing = useMemo(
    () => !!(user && listing.user && user.id === listing.user.id),
    [user, listing.user]
  );
  const [imageError, setImageError] = React.useState(false);
  const imageAltTitle = useMemo(() => {
    const brandName = vehicle?.brand?.name;
    const modelName = vehicle?.model?.name;
    const year = vehicle?.year ? String(vehicle.year) : null;
    const city = getCityNameMk(listing.city);

    const details = [brandName, modelName, year].filter(Boolean).join(' ').trim();
    return [listing.title, details, city].filter((v) => v && v.trim() !== '').join(' - ');
  }, [listing.title, listing.city, vehicle?.brand?.name, vehicle?.model?.name, vehicle?.year]);

  const handleToggleFavorite = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!user) {
        toast.error(t('common.loginRequired'));
        return;
      }

      if (isTogglingRef.current) {
        return;
      }

      const newFavoriteState = !isFavorite;
      setIsToggling(true);
      isTogglingRef.current = true;
      setLocalIsFavorite(newFavoriteState);

      startTransition(() => {
        if (isFavorite) {
          removeFavorite(listing.id);
          if (onRemove) {
            onRemove();
          }
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
          return;
        }

        if (isOwnListing) {
          setLocalIsFavorite(false);
          setIsToggling(false);
          isTogglingRef.current = false;
          return;
        }

        addFavorite(listing.id);
        favoritesApi
          .add(listing.id)
          .then(() => {
            analytics.addToWishlist(listing.id, {
              title: listing.title,
              price: listing.price,
            });
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
      });
    },
    [
      user,
      isFavorite,
      isOwnListing,
      listing.id,
      listing.title,
      listing.price,
      removeFavorite,
      addFavorite,
      onRemove,
      t,
    ]
  );

  const handleClick = useCallback(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/') {
      startTransition(() => {
        sessionStorage.setItem('homeScrollPosition', window.scrollY.toString());
        sessionStorage.setItem('homeScrollTimestamp', Date.now().toString());
      });
    }
  }, []);

  return (
    <Link href={`/listings/${listing.id}`} onClick={handleClick}>
      <div className="card overflow-hidden cursor-pointer h-full flex flex-col group">
        <div
          className="relative w-full bg-bg-darker flex-shrink-0 overflow-hidden"
          style={{ aspectRatio: '16/9', minHeight: '240px' }}
        >
          {imageUrl && imageUrl !== '/placeholder-car.jpg' && !imageError ? (
            <Image
              src={imageUrl}
              alt={t('listings.imageAlt', { title: imageAltTitle, index: '1' })}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              loading={priority ? undefined : 'lazy'}
              priority={priority}
              onError={() => {
                setImageError(true);
              }}
              unoptimized={isLocalhostImage && process.env.NODE_ENV === 'development'}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                />
              </svg>
            </div>
          )}
          <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
            {listing.is_new && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold bg-bg-light border-2 border-primary-500 text-primary-400 shadow-lg">
                {/* eslint-disable-next-line no-hardcoded-text/no-hardcoded-text */}
                <span>✨</span>
                <span>{t('listings.new')}</span>
              </span>
            )}
            {listing.urgent && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold bg-bg-light border-2 border-primary-500 text-primary-400 shadow-lg">
                <span>🔥</span>
                <span>{t('listings.urgent')}</span>
              </span>
            )}
          </div>
          <button
            onClick={handleToggleFavorite}
            disabled={(!isFavorite && isOwnListing) || isToggling}
            className={`absolute top-3 right-3 w-10 h-10 rounded-full bg-green-600 flex items-center justify-center transition-all shadow-lg z-10 ${
              (!isFavorite && isOwnListing) || isToggling
                ? 'opacity-30 cursor-not-allowed'
                : isFavorite
                  ? 'opacity-100 hover:bg-green-700'
                  : 'opacity-60 hover:opacity-100 hover:bg-green-700'
            }`}
            aria-label={
              !isFavorite && isOwnListing
                ? 'Не можете да додадете ваше објавување во омилени'
                : isFavorite
                  ? 'Отстрани од омилени'
                  : 'Додади во омилени'
            }
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
          <h3 className="font-bold text-base md:text-lg mb-3 line-clamp-2 text-white group-hover:text-primary-600 transition-colors">
            {listing.title}
          </h3>
          <div className="flex items-baseline gap-2 mb-3">
            {listing.price !== undefined ? (
              <>
                <span className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
                  {formatPrice(listing.price, listing.currency)}
                </span>
                <span className="text-xs md:text-sm text-gray-300 font-medium">
                  {listing.currency}
                </span>
              </>
            ) : (
              <span className="text-xl md:text-2xl font-extrabold text-primary-400">••••</span>
            )}
          </div>
          <div className="flex-grow mb-3">
            {vehicle && (
              <div className="text-sm text-gray-300 space-y-1.5">
                {vehicle.engine_displ_l && (
                  <div>
                    {t('userListings.engine')}: {formatEngineVolume(vehicle.engine_displ_l)}{' '}
                    {t('listings.liters')}
                  </div>
                )}
                {vehicle.fuel && (
                  <div>
                    {t('userListings.fuel')}: {vehicle.fuel}
                  </div>
                )}
                {vehicle.mileage_km && (
                  <div>
                    {t('userListings.mileage')}: {formatMileage(vehicle.mileage_km)}{' '}
                    {t('listings.km')}
                  </div>
                )}
                {vehicle.drive_type && (
                  <div>
                    {t('userListings.driveType')}: {formatDriveType(vehicle.drive_type)}
                  </div>
                )}
                {vehicle.body_type && (
                  <div>
                    {t('userListings.bodyType')}: {formatBodyType(vehicle.body_type)}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-between items-center text-sm text-gray-300 font-medium mt-auto pt-3 border-t border-primary-500/20">
            <span>{getCityNameMk(listing.city)}</span>
            <div className="flex items-center gap-3">
              {listing.views !== undefined && listing.views > 0 && (
                <span className="flex items-center gap-1 text-xs">
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
                  {listing.views}
                </span>
              )}
              <span>{formatDateShort(listing.last_updated_at)}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export const ListingCard = React.memo(ListingCardComponent);
