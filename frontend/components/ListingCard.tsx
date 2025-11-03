'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Listing, favoritesApi } from '@/lib/api';
import { useAuthStore, useFavoritesStore } from '@/lib/store';
import {
  formatPrice,
  formatEngineVolume,
  formatMileage,
  formatBodyType,
  formatDateShort,
} from '@/lib/utils';
import toast from 'react-hot-toast';

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const imageUrl = listing.images?.[0] || '/placeholder-car.jpg';
  const vehicle = listing.vehicle;
  const { user } = useAuthStore();
  const { check: checkFavorite, add: addFavorite, remove: removeFavorite } = useFavoritesStore();
  const [isFavorite, setIsFavorite] = useState(false);
  const isOwnListing = user && listing.user && user.id === listing.user.id;

  useEffect(() => {
    if (user) {
      favoritesApi
        .check(listing.id)
        .then((res) => {
          setIsFavorite(res.data.isFavorite);
        })
        .catch(() => {
          setIsFavorite(checkFavorite(listing.id));
        });
    } else {
      setIsFavorite(checkFavorite(listing.id));
    }
  }, [listing.id, user, checkFavorite]);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOwnListing) {
      return;
    }

    if (!user) {
      toast.error('Потребно е да се најавите');
      return;
    }

    try {
      if (isFavorite) {
        await favoritesApi.remove(listing.id);
        removeFavorite(listing.id);
        setIsFavorite(false);
        toast.success('Отстрането од омилени');
      } else {
        await favoritesApi.add(listing.id);
        addFavorite(listing.id);
        setIsFavorite(true);
        toast.success('Додадено во омилени');
      }
    } catch {}
  };

  return (
    <Link href={`/listings/${listing.id}`}>
      <div className="card overflow-hidden cursor-pointer h-full flex flex-col group">
        <div
          className="relative w-full bg-bg-darker flex-shrink-0 overflow-hidden"
          style={{ aspectRatio: '16/9', minHeight: '240px' }}
        >
          {imageUrl && imageUrl !== '/placeholder-car.jpg' ? (
            <Image
              src={imageUrl}
              alt={listing.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
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
          {listing.urgent && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs md:text-sm font-semibold bg-primary-700/80 border border-primary-500/70 text-primary-100 shadow-sm z-10">
              <span>🔥</span>
              <span>Итно</span>
            </span>
          )}
          <button
            onClick={handleToggleFavorite}
            disabled={isOwnListing}
            className={`absolute top-3 right-3 w-10 h-10 rounded-full bg-green-600 flex items-center justify-center transition-all shadow-lg z-10 ${
              isOwnListing
                ? 'opacity-30 cursor-not-allowed'
                : isFavorite
                  ? 'opacity-100 hover:bg-green-700'
                  : 'opacity-60 hover:opacity-100 hover:bg-green-700'
            }`}
            aria-label={
              isOwnListing
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
            <span className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
              {formatPrice(listing.price, listing.currency)}
            </span>
            <span className="text-xs md:text-sm text-gray-300 font-medium">{listing.currency}</span>
          </div>
          <div className="flex-grow mb-3">
            {vehicle && (
              <div className="text-sm text-gray-300 space-y-1.5">
                {vehicle.engine_displ_l && (
                  <div>Мотор (л): {formatEngineVolume(vehicle.engine_displ_l)}</div>
                )}
                {vehicle.mileage_km && (
                  <div>Поминување: {formatMileage(vehicle.mileage_km)} км</div>
                )}
                {vehicle.fuel && <div>Гориво: {vehicle.fuel}</div>}
                {vehicle.body_type && (
                  <div>Тип на каросерија: {formatBodyType(vehicle.body_type)}</div>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-between items-center text-sm text-gray-300 font-medium mt-auto pt-3 border-t border-primary-500/20">
            <span>{listing.city}</span>
            <span>{formatDateShort(listing.created_at)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
