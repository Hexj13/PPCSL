'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { CopyButton } from '@/components/common/CopyButton';
import { ListingCardTireSpecs } from '@/components/listing/ListingCardBadgesAndSpecs';
import { PriceDisplay } from '@/components/listing/PriceDisplay';
import { TireListingPriceSuffix } from '@/components/listing/TireListingPriceSuffix';
import { useTranslation } from '@/hooks/useTranslation';
import type { Listing } from '@/lib/api';
import {
  formatBodyType,
  formatDriveType,
  formatEngineVolume,
  formatFuel,
  formatMileage,
  getListingDisplayTitle,
  getOptimizedImageUrl,
  getVehicleType,
  isTireListing,
} from '@/lib/utils';

const SPARKLES_EMOJI = '\u2728';

interface ListingManagementCardProps {
  listing: Listing;
  mode: 'admin' | 'my-listings' | 'board';
  onAction?: (_id: string, _action: 'publish' | 'pause' | 'close') => void;
  onCopyId?: (_id: string) => void;
  onPromoteClick?: (_id: string) => void;
}

function ManagementCardVehicleSpecs({
  vehicle,
  t,
}: {
  vehicle: NonNullable<Listing['vehicle']>;
  t: (_key: string) => string;
}) {
  return (
    <div className="text-sm space-y-1.5 mb-3" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
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

function ManagementCardAdminIds({
  listing,
  onCopyId,
}: {
  listing: Listing;
  onCopyId?: (_id: string) => void;
}) {
  return (
    <div className="text-sm space-y-1.5 mb-3" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line no-hardcoded-text/no-hardcoded-text */}
        <span className="font-mono" style={{ color: 'rgb(var(--gray-400-rgb))' }}>
          LISTING ID: {listing.id}
        </span>
        {onCopyId && <CopyButton text={listing.id} iconClassName="w-3.5 h-3.5" />}
      </div>
      {listing.user?.id && (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line no-hardcoded-text/no-hardcoded-text */}
          <span className="font-mono" style={{ color: 'rgb(var(--gray-400-rgb))' }}>
            USER ID: {listing.user.id}
          </span>
          {onCopyId && <CopyButton text={listing.user.id} iconClassName="w-3.5 h-3.5" />}
        </div>
      )}
    </div>
  );
}

function ManagementCardBadges({
  listing,
  newLabel,
  t,
}: {
  listing: Listing;
  newLabel: string;
  t: (_key: string) => string;
}) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-start md:justify-end">
      {listing.is_promoted && (
        <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-base font-semibold bg-white/90 border-2 border-accent text-text-secondary shadow-lg whitespace-nowrap w-fit before:absolute before:inset-0 before:rounded-lg before:bg-accent/10 before:pointer-events-none">
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
      {listing.is_new && !isTireListing(listing) && (
        <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-base font-semibold bg-white/90 border-2 border-newBadge text-text-secondary shadow-lg whitespace-nowrap w-fit before:absolute before:inset-0 before:rounded-lg before:bg-newBadge/10 before:pointer-events-none">
          <span
            className="relative z-10 text-text-secondary"
            style={{ filter: 'grayscale(1) brightness(0.5)' }}
            aria-label={newLabel}
          >
            {SPARKLES_EMOJI}
          </span>
          <span className="relative z-10">{newLabel}</span>
        </span>
      )}
      {listing.urgent && (
        <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-base font-semibold bg-white/90 border-2 border-accentSecondary text-text-secondary shadow-lg whitespace-nowrap w-fit before:absolute before:inset-0 before:rounded-lg before:bg-accentSecondary/10 before:pointer-events-none">
          <span
            className="relative z-10 text-text-secondary"
            style={{ filter: 'grayscale(1) brightness(0.5)' }}
          >
            🔥
          </span>
          <span className="relative z-10">{t('listings.urgent')}</span>
        </span>
      )}
    </div>
  );
}

function getStatusClassName(status: Listing['status']): string {
  if (status === 'Active') return 'text-primary-500 font-bold text-base';
  if (status === 'Paused') return 'text-blue-400 font-bold text-base';
  return 'text-text-secondary font-bold text-base';
}

function getStatusLabel(status: Listing['status'], t: (_key: string) => string): string {
  if (status === 'Active') return t('userListings.active');
  if (status === 'Paused') return t('userListings.paused');
  return t('userListings.closed');
}

function ManagementCardActionBar({
  listing,
  mode,
  onAction,
  onPromoteClick,
  t,
}: {
  listing: Listing;
  mode: 'admin' | 'my-listings' | 'board';
  onAction?: (_id: string, _action: 'publish' | 'pause' | 'close') => void;
  onPromoteClick?: (_id: string) => void;
  t: (_key: string) => string;
}) {
  const status = listing.status;
  const showPromoteMyListings =
    mode === 'my-listings' && status === 'Active' && !listing.is_promoted && !!onPromoteClick;
  const showPromoteAdmin = mode === 'admin' && status !== 'Closed' && !!onPromoteClick;
  const showPublish = status === 'Paused';
  const showPause = status === 'Active';
  const showClose = status !== 'Closed';
  const showEdit = (mode === 'my-listings' && status !== 'Closed') || mode === 'admin';
  const editFrom = mode === 'admin' ? 'admin' : mode === 'my-listings' ? 'my-listings' : null;
  const editHref = editFrom
    ? `/listings/${listing.id}/edit?from=${editFrom}`
    : `/listings/${listing.id}/edit`;

  return (
    <div className="mt-auto pt-3 border-t border-primary-500/20">
      <div className="flex flex-col xl:flex-row xl:justify-between items-start xl:items-center gap-2 lg:gap-3 min-w-0 max-w-full">
        <div className="inline-flex items-center gap-1 sm:gap-1.5 shrink-0">
          <div className="text-base font-semibold text-primary-900">{t('listings.status')}</div>
          <div className={getStatusClassName(status)}>{getStatusLabel(status, t)}</div>
        </div>
        <div
          className={`flex flex-col lg:flex-col xl:flex-row xl:flex-wrap xl:justify-end items-stretch xl:items-center gap-2 w-full lg:w-full lg:shrink-0 lg:max-w-full xl:flex-1 xl:shrink xl:min-w-0 xl:max-w-full${status !== 'Closed' ? ' min-h-[48px]' : ''}`}
        >
          {onAction && (
            <>
              {showPromoteMyListings && (
                <button
                  onClick={() => onPromoteClick?.(listing.id)}
                  className="text-text-secondary font-medium text-base hover-only:hover:text-text-primary transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 md:gap-2.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg border-2 border-accent/40 hover-only:hover:border-accent/60 bg-accent/20 select-none w-full xl:w-auto h-[48px]"
                >
                  <svg
                    className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0"
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
              {showPromoteAdmin && (
                <button
                  onClick={() => onPromoteClick?.(listing.id)}
                  className={`font-medium text-base transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 md:gap-2.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg border-2 select-none w-full xl:w-auto h-[48px] text-text-secondary hover-only:hover:text-text-primary ${
                    listing.is_promoted
                      ? 'bg-[#f069be33] border-[#f069be]/40 hover-only:hover:border-[#f069be]/60'
                      : 'bg-accent/20 border-accent/40 hover-only:hover:border-accent/60'
                  }`}
                >
                  <svg
                    className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0"
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
              {showPublish && (
                <button
                  onClick={() => onAction(listing.id, 'publish')}
                  className="text-text-secondary font-medium text-base hover-only:hover:text-text-primary transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 md:gap-2.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg border-2 border-primary-500/40 hover-only:hover:border-primary-500/60 bg-primary-500/20 select-none w-full xl:w-auto h-[48px]"
                >
                  {t('listings.publishAction')}
                </button>
              )}
              {showPause && (
                <button
                  onClick={() => onAction(listing.id, 'pause')}
                  className="text-text-secondary font-medium text-base hover-only:hover:text-text-primary transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 md:gap-2.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg border-2 border-blue-500/40 hover-only:hover:border-blue-500/60 bg-blue-500/20 select-none w-full xl:w-auto h-[48px]"
                >
                  {t('listings.pauseAction')}
                </button>
              )}
              {showClose && (
                <button
                  onClick={() => onAction(listing.id, 'close')}
                  className="text-text-secondary font-medium text-base hover-only:hover:text-text-primary transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 md:gap-2.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg border-2 border-gray-500/40 hover-only:hover:border-gray-500/60 bg-gray-500/20 select-none w-full xl:w-auto h-[48px]"
                >
                  {t('common.close')}
                </button>
              )}
            </>
          )}
          {showEdit && (
            <Link
              href={editHref}
              className="text-primary-700 font-medium text-base hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 active:text-primary-900 active:border-primary-900 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 md:gap-2.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg border-2 border-primary-700 bg-primary-500/10 select-none w-full xl:w-auto h-[48px]"
              title={t('common.editListing')}
              onClick={(e) => e.stopPropagation()}
            >
              <svg
                className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 text-inherit"
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
              <span className="sm:hidden">{t('common.editListing')}</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
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
  const displayTitle = getListingDisplayTitle(listing, t);
  const vehicleType = getVehicleType(listing);
  const newLabel = vehicleType === 'moto' ? t('listings.newMoto') : t('listings.new');

  const imageUrl =
    listing.images?.length && listing.images[0] ? listing.images[0] : '/placeholder-car.jpg';
  const hasImage = imageUrl !== '/placeholder-car.jpg' && !imageError;
  const optimizedImageUrl = hasImage ? getOptimizedImageUrl(imageUrl, 70, 900) : '';

  const isAdminMode = mode === 'admin';
  const isBoardMode = mode === 'board';

  return (
    <div className="card overflow-visible group">
      <div className="grid grid-cols-1 lg:grid-cols-[450px_1fr] gap-0 lg:gap-6 lg:items-stretch">
        <Link href={`/listings/${listing.id}`} className="shrink-0">
          <div className="relative w-full h-[200px] sm:h-[250px] lg:h-full lg:min-h-[250px] bg-bg-darker overflow-hidden rounded-t-xl lg:rounded-tl-xl lg:rounded-bl-xl lg:rounded-tr-none lg:rounded-br-none">
            {hasImage ? (
              <Image
                src={optimizedImageUrl}
                alt={displayTitle}
                fill
                className="object-cover rounded-t-xl lg:rounded-tl-xl lg:rounded-bl-xl lg:rounded-tr-none lg:rounded-br-none"
                sizes="(max-width: 1024px) 100vw, 450px"
                loading="lazy"
                draggable={false}
                unoptimized={
                  optimizedImageUrl.startsWith('http://') ||
                  optimizedImageUrl.startsWith('https://')
                }
                onError={() => setImageError(true)}
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
                  <h3 className="font-bold text-base md:text-lg text-primary-900 line-clamp-2">
                    {displayTitle}
                  </h3>
                  <svg
                    className="w-5 h-5 opacity-60 lg:group-hover:opacity-100 lg:group-hover:text-primary-600 shrink-0 mt-0.5 transition-all duration-200"
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
              {listing.vehicle && <ManagementCardVehicleSpecs vehicle={listing.vehicle} t={t} />}
              {isTireListing(listing) && (
                <div className="mb-3">
                  <ListingCardTireSpecs listing={listing} t={t} />
                </div>
              )}
              {isAdminMode && <ManagementCardAdminIds listing={listing} onCopyId={onCopyId} />}
            </div>
            <div className="flex flex-col items-start text-left w-full lg:items-end lg:text-right lg:min-w-[140px] lg:w-auto mb-3">
              {listing.price !== undefined ? (
                <div className="mb-3 w-full lg:w-auto">
                  <div className="flex flex-col items-start gap-0.5 lg:items-end">
                    <PriceDisplay
                      price={listing.price}
                      currency={listing.currency ?? listing.defaultCurrencyCode ?? 'EUR'}
                      approxPrice={listing.approxPriceDefaultCurrency}
                      defaultCurrencyCode={listing.defaultCurrencyCode}
                      size="medium"
                      approxPriceBelow
                      priceClassName="text-primary-500"
                      currencyStyle={{ color: 'rgb(var(--text-secondary-rgb))' }}
                    />
                    <TireListingPriceSuffix
                      listing={listing}
                      t={t}
                      className="text-sm font-medium"
                    />
                  </div>
                </div>
              ) : (
                <span className="text-lg sm:text-xl md:text-2xl font-extrabold text-primary-400 mb-3">
                  ••••
                </span>
              )}
              <ManagementCardBadges listing={listing} newLabel={newLabel} t={t} />
            </div>
          </div>
          {!isBoardMode && (
            <ManagementCardActionBar
              listing={listing}
              mode={mode}
              onAction={onAction}
              onPromoteClick={onPromoteClick}
              t={t}
            />
          )}
        </div>
      </div>
    </div>
  );
}
