'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { Listing } from '@/lib/api';
import {
  formatBodyType,
  formatDriveType,
  formatEngineVolume,
  formatMileage,
  formatPrice,
  getOptimizedImageUrl,
} from '@/lib/utils';

interface ListingManagementCardProps {
  listing: Listing;
  mode: 'admin' | 'my-listings';
  onAction?: (_id: string, _action: 'publish' | 'pause' | 'close') => void;
  onCopyId?: (_id: string) => void;
  onPromoteClick?: (_id: string) => void;
}

export function ListingManagementCard({
  listing,
  mode,
  onAction,
  onCopyId,
  onPromoteClick,
}: ListingManagementCardProps) {
  const { t } = useTranslation();
  const [imageError, setImageError] = useState(false);

  const imageUrl =
    listing.images && listing.images.length > 0 && listing.images[0]
      ? listing.images[0]
      : '/placeholder-car.jpg';
  const hasImage = imageUrl && imageUrl !== '/placeholder-car.jpg' && !imageError;
  const optimizedImageUrl = hasImage ? getOptimizedImageUrl(imageUrl, 70, 900) : '';

  const isAdminMode = mode === 'admin';

  return (
    <div
      className={`card overflow-visible ${listing.is_promoted ? 'border-2' : ''}`}
      style={listing.is_promoted ? { borderColor: '#6eeb9c87' } : undefined}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[450px_1fr] gap-0 lg:gap-6 lg:items-stretch">
        <Link href={`/listings/${listing.id}`} className="flex-shrink-0">
          <div className="relative w-full h-[200px] sm:h-[250px] lg:h-full lg:min-h-[250px] bg-bg-darker overflow-hidden rounded-t-xl lg:rounded-tl-xl lg:rounded-bl-xl lg:rounded-tr-none lg:rounded-br-none">
            {hasImage ? (
              <Image
                src={optimizedImageUrl}
                alt={listing.title}
                fill
                className="object-cover rounded-t-xl lg:rounded-tl-xl lg:rounded-bl-xl lg:rounded-tr-none lg:rounded-br-none"
                sizes="(max-width: 1024px) 100vw, 450px"
                loading="lazy"
                unoptimized={
                  optimizedImageUrl.startsWith('http://') ||
                  optimizedImageUrl.startsWith('https://')
                }
                onError={() => {
                  setImageError(true);
                }}
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
        <div className="flex-1 p-4 sm:p-5 flex flex-col min-w-0">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 lg:gap-6">
            <div className="flex-1 min-w-0">
              <Link href={`/listings/${listing.id}`} className="mb-3 block group">
                <div className="flex items-start gap-1.5">
                  <h3 className="font-bold text-base md:text-lg lg:group-hover:text-primary-600 transition-colors line-clamp-2">
                    {listing.title}
                  </h3>
                  <svg
                    className="w-5 h-5 opacity-60 lg:group-hover:opacity-100 lg:group-hover:text-primary-600 flex-shrink-0 mt-0.5 transition-all duration-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </div>
              </Link>
              {listing.vehicle && (
                <div className="text-sm space-y-1.5 mb-3" style={{ color: 'rgb(243, 243, 243)' }}>
                  {listing.vehicle.engine_displ_l && (
                    <div>
                      {t('userListings.engine')}:{' '}
                      {formatEngineVolume(listing.vehicle.engine_displ_l)} {t('listings.liters')}
                    </div>
                  )}
                  {listing.vehicle.fuel && (
                    <div>
                      {t('userListings.fuel')}: {listing.vehicle.fuel}
                    </div>
                  )}
                  {listing.vehicle.mileage_km && (
                    <div>
                      {t('userListings.mileage')}: {formatMileage(listing.vehicle.mileage_km)}{' '}
                      {t('listings.km')}
                    </div>
                  )}
                  {listing.vehicle.drive_type && (
                    <div>
                      {t('userListings.driveType')}: {formatDriveType(listing.vehicle.drive_type)}
                    </div>
                  )}
                  {listing.vehicle.body_type && (
                    <div>
                      {t('userListings.bodyType')}: {formatBodyType(listing.vehicle.body_type)}
                    </div>
                  )}
                </div>
              )}
              {isAdminMode && (
                <div className="text-sm space-y-1.5 mb-3" style={{ color: 'rgb(243, 243, 243)' }}>
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line no-hardcoded-text/no-hardcoded-text */}
                    <span className="text-gray-400 font-mono">LISTING ID: {listing.id}</span>
                    {onCopyId && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          onCopyId(listing.id);
                        }}
                        className="p-1 text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded transition-colors"
                        title={t('common.copyId')}
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
                  {listing.user && listing.user.id && (
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line no-hardcoded-text/no-hardcoded-text */}
                      <span className="text-gray-400 font-mono">USER ID: {listing.user.id}</span>
                      {onCopyId && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            if (listing.user?.id) {
                              onCopyId(listing.user.id);
                            }
                          }}
                          className="p-1 text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded transition-colors"
                          title={t('common.copyId')}
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
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col items-start text-left w-full lg:items-end lg:text-right lg:min-w-[140px] lg:w-auto mb-3">
              {listing.price !== undefined ? (
                <span className="text-lg sm:text-xl md:text-2xl font-extrabold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent leading-snug whitespace-nowrap mb-3">
                  {formatPrice(listing.price, listing.currency)} {listing.currency}
                </span>
              ) : (
                <span className="text-lg sm:text-xl md:text-2xl font-extrabold text-primary-400 mb-3">
                  ••••
                </span>
              )}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-start md:justify-end">
                {listing.is_promoted && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold bg-bg-light border-2 border-yellow-500 text-yellow-400 shadow-lg whitespace-nowrap w-fit">
                    <svg
                      className="w-4 h-4 flex-shrink-0"
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
                    <span>{t('listings.promoted')}</span>
                  </span>
                )}
                {listing.is_new && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold bg-bg-light border-2 border-primary-500 text-primary-400 shadow-lg whitespace-nowrap w-fit">
                    {/* eslint-disable-next-line no-hardcoded-text/no-hardcoded-text */}
                    <span>✨</span>
                    <span>{t('listings.new')}</span>
                  </span>
                )}
                {listing.urgent && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold bg-bg-light border-2 border-primary-500 text-primary-400 shadow-lg whitespace-nowrap w-fit">
                    <span>🔥</span>
                    <span>{t('listings.urgent')}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-auto pt-3 border-t border-primary-500/20">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 lg:gap-3">
              <div className="inline-flex items-center gap-1 sm:gap-1.5">
                <div className="text-xs sm:text-sm font-semibold text-gray-200">
                  {t('listings.status')}
                </div>
                <div
                  className={
                    listing.status === 'Active'
                      ? 'text-primary-400 font-bold text-xs sm:text-sm'
                      : listing.status === 'Paused'
                        ? 'text-blue-400 font-bold text-xs sm:text-sm'
                        : 'text-gray-200 font-bold text-xs sm:text-sm'
                  }
                >
                  {listing.status === 'Active'
                    ? t('userListings.active')
                    : listing.status === 'Paused'
                      ? t('userListings.paused')
                      : t('userListings.closed')}
                </div>
              </div>
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 w-full lg:w-auto min-h-[48px] lg:min-h-[52px]">
                {onAction && (
                  <>
                    {mode === 'my-listings' &&
                      listing.status === 'Active' &&
                      !listing.is_promoted &&
                      onPromoteClick && (
                        <button
                          onClick={() => onPromoteClick(listing.id)}
                          className="px-3 md:px-4 py-2.5 sm:py-2 text-xs sm:text-sm bg-yellow-500/20 border-2 border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30 hover:border-yellow-500/60 rounded-lg font-semibold transition-colors h-12 lg:h-[52px] flex items-center justify-center gap-2 w-full lg:w-auto"
                        >
                          <svg
                            className="w-4 h-4"
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
                          <span>{t('listings.promote')}</span>
                        </button>
                      )}
                    {mode === 'admin' && listing.status !== 'Closed' && onPromoteClick && (
                      <button
                        onClick={() => onPromoteClick(listing.id)}
                        className={`px-3 md:px-4 py-2.5 sm:py-2 text-xs sm:text-sm border-2 rounded-lg font-semibold transition-colors h-12 lg:h-[52px] flex items-center justify-center gap-2 w-full lg:w-auto ${
                          listing.is_promoted
                            ? 'bg-[#f069be33] border-[#f069be]/40 hover:bg-[#f069be44] hover:border-[#f069be]/60'
                            : 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30 hover:border-yellow-500/60'
                        }`}
                        style={listing.is_promoted ? { color: 'rgb(255 99 198)' } : undefined}
                      >
                        <svg
                          className="w-4 h-4"
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
                        <span>
                          {listing.is_promoted ? t('listings.unpromote') : t('listings.promote')}
                        </span>
                      </button>
                    )}
                    {listing.status === 'Paused' && (
                      <button
                        onClick={() => onAction(listing.id, 'publish')}
                        className="px-3 md:px-4 py-2.5 sm:py-2 text-xs sm:text-sm bg-primary-500/20 border-2 border-primary-500/40 text-primary-300 hover:bg-primary-500/30 hover:border-primary-500/60 rounded-lg font-semibold transition-colors h-12 lg:h-[52px] flex items-center justify-center w-full lg:w-auto"
                      >
                        {t('listings.publishAction')}
                      </button>
                    )}
                    {listing.status === 'Active' && (
                      <button
                        onClick={() => onAction(listing.id, 'pause')}
                        className="px-3 md:px-4 py-2.5 sm:py-2 text-xs sm:text-sm bg-blue-500/20 border-2 border-blue-500/40 text-blue-300 hover:bg-blue-500/30 hover:border-blue-500/60 rounded-lg font-semibold transition-colors h-12 lg:h-[52px] flex items-center justify-center w-full lg:w-auto"
                      >
                        {t('listings.pauseAction')}
                      </button>
                    )}
                    {listing.status !== 'Closed' && (
                      <button
                        onClick={() => onAction(listing.id, 'close')}
                        className="px-3 md:px-4 py-2.5 sm:py-2 text-xs sm:text-sm bg-gray-500/20 border-2 border-gray-500/40 text-gray-300 hover:bg-gray-500/30 hover:border-gray-500/60 rounded-lg font-semibold transition-colors h-12 lg:h-[52px] flex items-center justify-center w-full lg:w-auto"
                      >
                        {t('common.close')}
                      </button>
                    )}
                  </>
                )}
                {mode === 'my-listings' && listing.status !== 'Closed' && (
                  <Link
                    href={`/listings/${listing.id}/edit`}
                    className="bg-bg-dark/95 backdrop-blur-sm px-3 md:px-4 py-2.5 sm:py-2 rounded-lg border-2 border-primary-500/30 text-primary-400 hover:text-primary-300 hover:border-primary-500/50 transition-colors duration-200 inline-flex items-center justify-center h-12 lg:h-[52px] w-full lg:w-auto"
                    title={t('common.editListing')}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    <span className="ml-1.5 sm:hidden">{t('common.editListing')}</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
