'use client';

import Image from 'next/image';
import Link from 'next/link';

import { Listing } from '@/lib/api';
import {
  formatBodyType,
  formatDriveType,
  formatEngineVolume,
  formatMileage,
  formatPrice,
  formatTransmission,
  getOptimizedImageUrl,
  getCityNameMk,
} from '@/lib/utils';

interface ListingManagementCardProps {
  listing: Listing;
  mode: 'admin' | 'my-listings';
  onAction?: (_id: string, _action: 'publish' | 'pause' | 'close') => void;
  onCopyId?: (_id: string) => void;
}

export function ListingManagementCard({
  listing,
  mode,
  onAction,
  onCopyId,
}: ListingManagementCardProps) {
  const imageUrl =
    listing.images && listing.images.length > 0 && listing.images[0]
      ? listing.images[0]
      : '/placeholder-car.jpg';
  const hasImage = imageUrl && imageUrl !== '/placeholder-car.jpg';
  const optimizedImageUrl = hasImage ? getOptimizedImageUrl(imageUrl, 75, 800) : '';

  const isAdminMode = mode === 'admin';

  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] gap-0 md:gap-6 md:items-stretch">
        <Link href={`/listings/${listing.id}`} className="flex-shrink-0">
          <div className="relative w-full h-[300px] md:h-full md:min-h-[320px] bg-bg-darker overflow-hidden rounded-t-xl md:rounded-l-xl md:rounded-t-none md:rounded-b-none">
            {hasImage ? (
              <Image
                src={optimizedImageUrl}
                alt={listing.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 300px"
                loading="lazy"
                unoptimized={
                  optimizedImageUrl.startsWith('http://') ||
                  optimizedImageUrl.startsWith('https://')
                }
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-200">
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
          </div>
        </Link>
        <div className="flex-1 p-5 flex flex-col">
          <div className="mb-3">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1">
                {isAdminMode && (
                  <>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-mono">ID: {listing.id}</span>
                      {onCopyId && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            onCopyId(listing.id);
                          }}
                          className="p-1 text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded transition-colors"
                          title="Копирај ID"
                        >
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
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                    {listing.user && (
                      <div className="mb-2 text-sm text-gray-300">
                        <span className="text-primary-400">Корисник:</span>{' '}
                        <span className="font-medium">
                          {[
                            listing.user.firstName,
                            listing.user.lastName,
                            listing.user.companyName,
                            listing.user.email,
                            listing.user.phone,
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        </span>
                      </div>
                    )}
                  </>
                )}
                <Link href={`/listings/${listing.id}`}>
                  <h3 className="font-bold text-lg md:text-xl mb-1.5 hover:text-primary-600 transition-colors line-clamp-2">
                    {listing.title}
                  </h3>
                </Link>
              </div>
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
                <span className="text-sm text-gray-200 font-medium">{listing.currency}</span>
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
                    <span className="text-primary-400">Мотор:</span>
                    <span className="ml-2 font-medium text-gray-200">
                      {formatEngineVolume(listing.vehicle.engine_displ_l)} л
                    </span>
                  </div>
                )}
                {listing.vehicle.fuel && (
                  <div>
                    <span className="text-primary-400">Гориво:</span>
                    <span className="ml-2 font-medium text-gray-200">{listing.vehicle.fuel}</span>
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
                {listing.vehicle.transmission && (
                  <div>
                    <span className="text-primary-400">Пренос:</span>
                    <span className="ml-2 font-medium text-gray-200">
                      {formatTransmission(listing.vehicle.transmission)}
                    </span>
                  </div>
                )}
                {listing.vehicle.drive_type && (
                  <div>
                    <span className="text-primary-400">Тип на погон:</span>
                    <span className="ml-2 font-medium text-gray-200">
                      {formatDriveType(listing.vehicle.drive_type)}
                    </span>
                  </div>
                )}
                {listing.vehicle.body_type && (
                  <div>
                    <span className="text-primary-400">Тип на каросерија:</span>
                    <span className="ml-2 font-medium text-gray-200">
                      {formatBodyType(listing.vehicle.body_type)}
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
                {onAction && (
                  <>
                    {listing.status === 'Paused' && (
                      <button
                        onClick={() => onAction(listing.id, 'publish')}
                        className="btn-primary px-3 sm:px-4 py-2 text-xs sm:text-sm"
                      >
                        Објави
                      </button>
                    )}
                    {listing.status === 'Active' && (
                      <button
                        onClick={() => onAction(listing.id, 'pause')}
                        className="btn-yellow px-3 sm:px-4 py-2 text-xs sm:text-sm"
                      >
                        Привремено застани
                      </button>
                    )}
                    {listing.status !== 'Closed' && (
                      <button
                        onClick={() => onAction(listing.id, 'close')}
                        className="btn-secondary px-3 sm:px-4 py-2 text-xs sm:text-sm"
                      >
                        Затвори
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
