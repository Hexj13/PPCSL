'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

import { listingsApi, Listing } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import {
  formatPrice,
  formatEngineVolume,
  formatMileage,
  formatTransmission,
  formatBodyType,
  getOptimizedImageUrl,
  getCityNameMk,
} from '@/lib/utils';

export default function MyListingsPage() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;

    if (!user) {
      router.push('/login');
      return;
    }

    listingsApi
      .getMy()
      .then((res) => {
        setListings(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    const lastRefreshKey = `lastRefreshDate_${user.id}`;
    const lastRefreshStr = localStorage.getItem(lastRefreshKey);
    if (lastRefreshStr) {
      const lastRefresh = parseInt(lastRefreshStr, 10);
      const now = Date.now();
      const twoDays = 48 * 60 * 60 * 1000;
      const timePassed = now - lastRefresh;

      if (timePassed < twoDays) {
        const remaining = twoDays - timePassed;
        setTimeUntilRefresh(remaining);
      }
    }
  }, [user, isInitialized, router]);

  useEffect(() => {
    if (timeUntilRefresh === null || timeUntilRefresh <= 0) return;

    const interval = setInterval(() => {
      setTimeUntilRefresh((prev) => {
        if (prev === null || prev <= 1000) {
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeUntilRefresh]);

  const handleAction = async (id: string, action: 'publish' | 'pause' | 'close') => {
    try {
      switch (action) {
        case 'publish':
          await listingsApi.publish(id);
          toast.success('Објавата е објавена');
          break;
        case 'pause':
          await listingsApi.pause(id);
          toast.success('Објавата е привремено застарена');
          break;
        case 'close':
          await listingsApi.close(id);
          toast.success('Објавата е затворена');
          break;
      }
      const res = await listingsApi.getMy();
      setListings(res.data);
    } catch {}
  };

  const handleRefreshDates = async () => {
    if (timeUntilRefresh !== null && timeUntilRefresh > 0) {
      toast.error('Можете да ја користите оваа функција на секои 48 часа');
      return;
    }

    setIsRefreshing(true);
    try {
      const res = await listingsApi.refreshDates();
      toast.success(`Датите се ажурирани за ${res.data.updated} објави`);

      const lastRefreshKey = `lastRefreshDate_${user?.id}`;
      localStorage.setItem(lastRefreshKey, Date.now().toString());
      setTimeUntilRefresh(48 * 60 * 60 * 1000);

      const listingsRes = await listingsApi.getMy();
      setListings(listingsRes.data);
    } catch {
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatTimeRemaining = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isInitialized) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-300">Вчитување...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-300">Вчитување...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
          Мои објави
        </h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={handleRefreshDates}
            disabled={isRefreshing || (timeUntilRefresh !== null && timeUntilRefresh > 0)}
            className="w-full sm:w-auto btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            {isRefreshing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Ажурирање...
              </>
            ) : timeUntilRefresh !== null && timeUntilRefresh > 0 ? (
              <>Обнови дата ({formatTimeRemaining(timeUntilRefresh)})</>
            ) : (
              'Обнови дата'
            )}
          </button>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-300 text-lg mb-4">Сè уште немате објави</p>
          <a href="/listings/new" className="btn-primary inline-block">
            Креирај објава
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => {
            const imageUrl =
              listing.images && listing.images.length > 0 && listing.images[0]
                ? listing.images[0]
                : '/placeholder-car.jpg';
            const hasImage = imageUrl && imageUrl !== '/placeholder-car.jpg';

            return (
              <div key={listing.id} className="card overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] gap-0 md:gap-6 md:items-stretch">
                  <Link href={`/listings/${listing.id}`} className="flex-shrink-0">
                    <div className="relative w-full h-[300px] md:h-full md:min-h-[320px] bg-bg-darker">
                      {hasImage ? (
                        <Image
                          src={getOptimizedImageUrl(imageUrl, 65, 600)}
                          alt={listing.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 300px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-200">
                          <svg
                            className="w-16 h-16"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 p-5 flex flex-col">
                    <div className="mb-3">
                      <div className="flex items-start justify-between gap-4">
                        <Link href={`/listings/${listing.id}`} className="flex-1">
                          <h3 className="font-bold text-lg md:text-xl mb-1.5 hover:text-primary-600 transition-colors line-clamp-2">
                            {listing.title}
                          </h3>
                        </Link>
                        <div className="bg-bg-dark/95 backdrop-blur-sm px-2 py-2 rounded-lg border border-primary-500/30 inline-flex items-center gap-1.5 flex-shrink-0">
                          <div className="text-xs font-semibold text-gray-200">Статус:</div>
                          <div
                            className={
                              listing.status === 'Active'
                                ? 'text-green-400 font-bold text-sm'
                                : listing.status === 'Paused'
                                  ? 'text-yellow-400 font-bold text-sm'
                                  : 'text-gray-200 font-bold text-sm'
                            }
                          >
                            {listing.status === 'Active'
                              ? 'Активна'
                              : listing.status === 'Paused'
                                ? 'Привремено застарена'
                                : 'Затворена'}
                          </div>
                        </div>
                      </div>
                      <div className="mb-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
                            {formatPrice(listing.price, listing.currency)}
                          </span>
                          <span className="text-sm text-gray-200 font-medium">
                            {listing.currency}
                          </span>
                        </div>
                        {listing.urgent && (
                          <div className="mt-1.5">
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold bg-primary-500/20 border border-primary-500/40 text-primary-300 shadow-sm">
                              <span>🔥</span>
                              <span>Итно</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {listing.vehicle && (
                      <div className="mb-3 flex-1">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2.5 text-sm">
                          {listing.vehicle.engine_displ_l && (
                            <div>
                              <span className="text-primary-400">Мотор (л):</span>
                              <span className="ml-2 font-medium text-gray-200">
                                {formatEngineVolume(listing.vehicle.engine_displ_l)}
                              </span>
                            </div>
                          )}
                          {listing.vehicle.mileage_km && (
                            <div>
                              <span className="text-primary-400">Поминување:</span>
                              <span className="ml-2 font-medium text-gray-200">
                                {formatMileage(listing.vehicle.mileage_km)} км
                              </span>
                            </div>
                          )}
                          {listing.vehicle.fuel && (
                            <div>
                              <span className="text-primary-400">Гориво:</span>
                              <span className="ml-2 font-medium text-gray-200">
                                {listing.vehicle.fuel}
                              </span>
                            </div>
                          )}
                          {listing.vehicle.transmission && (
                            <div>
                              <span className="text-primary-400">Пренос:</span>
                              <span className="ml-2 font-medium text-gray-200">
                                {formatTransmission(listing.vehicle.transmission)}
                              </span>
                            </div>
                          )}
                          {listing.vehicle.body_type && (
                            <div>
                              <span className="text-primary-400">Тип:</span>
                              <span className="ml-2 font-medium text-gray-200">
                                {formatBodyType(listing.vehicle.body_type)}
                              </span>
                            </div>
                          )}
                          {listing.vehicle.color && (
                            <div>
                              <span className="text-primary-400">Боја:</span>
                              <span className="ml-2 font-medium text-gray-200">
                                {listing.vehicle.color}
                              </span>
                            </div>
                          )}
                          {listing.vehicle.doors && (
                            <div>
                              <span className="text-primary-400">Врати:</span>
                              <span className="ml-2 font-medium text-gray-200">
                                {listing.vehicle.doors}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="mt-auto pt-3 border-t border-primary-500/20">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="text-sm text-gray-200 font-medium">{getCityNameMk(listing.city)}</div>
                        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
                          {listing.status === 'Paused' && (
                            <button
                              onClick={() => handleAction(listing.id, 'publish')}
                              className="btn-primary px-3 sm:px-4 py-2 text-xs sm:text-sm"
                            >
                              Објави
                            </button>
                          )}
                          {listing.status === 'Active' && (
                            <button
                              onClick={() => handleAction(listing.id, 'pause')}
                              className="btn-yellow px-3 sm:px-4 py-2 text-xs sm:text-sm"
                            >
                              Привремено застани
                            </button>
                          )}
                          {listing.status !== 'Closed' && (
                            <button
                              onClick={() => handleAction(listing.id, 'close')}
                              className="btn-secondary px-3 sm:px-4 py-2 text-xs sm:text-sm"
                            >
                              Затвори
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
