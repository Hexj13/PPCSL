'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { CopyButton } from '@/components/common/CopyButton';
import {
  HEADER_CTA_PROMOTE_SURFACE_CLASSES,
  HEADER_CTA_SURFACE_CLASSES,
} from '@/components/listing/CreateListingButton';
import { ListingCardTireSpecs } from '@/components/listing/ListingCardBadgesAndSpecs';
import { ListingVehicleSpecsCompact } from '@/components/listing/ListingVehicleSpecsCompact';
import { PriceDisplay } from '@/components/listing/PriceDisplay';
import { TireListingPriceSuffix } from '@/components/listing/TireListingPriceSuffix';
import { useI18n } from '@/components/providers/I18nProvider';
import { useTranslation } from '@/hooks/useTranslation';
import type { Listing } from '@/lib/api';
import { setBlurForListing, setIndexForListing } from '@/lib/blur-navigation-cache';
import type { Locale } from '@/lib/i18n-types';
import { localizedHref } from '@/lib/localized-href';
import {
  getListingDisplayTitle,
  getListingHref,
  getOptimizedImageUrl,
  getVehicleType,
  isTireListing,
} from '@/lib/utils';
import { blurhashToDataURL } from '@/lib/utils/blurhash';
import { EditIcon } from '@/ui';

const SPARKLES_EMOJI = '\u2728';

interface ListingManagementCardProps {
  listing: Listing;
  mode: 'admin' | 'my-listings' | 'board';
  onAction?: (_id: string, _action: 'publish' | 'pause' | 'close') => void;
  onCopyId?: (_id: string) => void;
  onPromoteClick?: (_id: string) => void;
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
      {(listing.has_video || listing.video?.status === 'published') && (
        <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-base font-semibold bg-white/90 border-2 border-newBadge text-text-secondary shadow-lg whitespace-nowrap w-fit before:absolute before:inset-0 before:rounded-lg before:bg-newBadge/10 before:pointer-events-none">
          <svg
            className="relative z-10 w-4 h-4 shrink-0"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path d="M8 5v14l11-7L8 5z" />
          </svg>
          <span className="relative z-10">{t('listings.videoBadge')}</span>
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
  locale,
}: {
  listing: Listing;
  mode: 'admin' | 'my-listings' | 'board';
  onAction?: (_id: string, _action: 'publish' | 'pause' | 'close') => void;
  onPromoteClick?: (_id: string) => void;
  t: (_key: string) => string;
  locale: Locale;
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
  const editRest = editFrom
    ? `/listings/${listing.id}/edit?from=${editFrom}`
    : `/listings/${listing.id}/edit`;
  const editHref = localizedHref(editRest, locale);
  const editLinkTestId = mode === 'my-listings' ? `my-listings-edit-link-${listing.id}` : undefined;

  return (
    <div className="mt-auto pt-3 border-t border-primary-500/20">
      <div className="flex flex-col xl:flex-row xl:justify-between items-start xl:items-center gap-2 lg:gap-3 min-w-0 max-w-full">
        <div className="inline-flex items-center gap-1 sm:gap-1.5 shrink-0">
          <div className="text-base font-semibold text-primary-900">{t('listings.status')}</div>
          <div className={getStatusClassName(status)}>{getStatusLabel(status, t)}</div>
        </div>
        <div
          className={`flex flex-col lg:flex-col xl:flex-row xl:flex-wrap xl:justify-end items-stretch xl:items-center gap-2 w-full lg:w-full lg:shrink-0 lg:max-w-full xl:flex-1 xl:shrink xl:min-w-0 xl:max-w-full${status !== 'Closed' ? ' min-h-10' : ''}`}
        >
          {onAction && (
            <>
              {showPromoteMyListings && (
                <button
                  onClick={() => onPromoteClick?.(listing.id)}
                  data-testid={`my-listings-promote-button-${listing.id}`}
                  className={`${HEADER_CTA_PROMOTE_SURFACE_CLASSES} text-sm font-medium gap-2 md:gap-2.5 px-3 md:px-4 py-1.5 md:py-2 w-full xl:w-auto h-10`}
                >
                  <svg
                    className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 relative z-10"
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
                  <span className="relative z-10">{t('listings.promote')}</span>
                </button>
              )}
              {showPromoteAdmin && (
                <button
                  onClick={() => onPromoteClick?.(listing.id)}
                  className={
                    listing.is_promoted
                      ? 'font-medium text-sm transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 md:gap-2.5 px-3 md:px-4 py-1.5 md:py-2 rounded-lg border-2 select-none w-full xl:w-auto h-10 text-text-secondary hover-only:hover:text-text-primary bg-[#f069be33] border-[#f069be]/40 hover-only:hover:border-[#f069be]/60'
                      : `${HEADER_CTA_SURFACE_CLASSES} text-sm font-medium gap-2 md:gap-2.5 px-3 md:px-4 py-1.5 md:py-2 w-full xl:w-auto h-10`
                  }
                >
                  <svg
                    className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 relative z-10"
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
                  <span className="relative z-10">
                    {listing.is_promoted ? t('listings.unpromote') : t('listings.promote')}
                  </span>
                </button>
              )}
              {showPublish && (
                <button
                  onClick={() => onAction(listing.id, 'publish')}
                  data-testid={
                    mode === 'my-listings' ? `my-listings-publish-button-${listing.id}` : undefined
                  }
                  className="text-text-secondary font-medium text-sm hover-only:hover:text-text-primary transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 md:gap-2.5 px-3 md:px-4 py-1.5 md:py-2 rounded-lg border-2 border-primary-500/40 hover-only:hover:border-primary-500/60 bg-primary-500/20 select-none w-full xl:w-auto h-10"
                >
                  {t('listings.publishAction')}
                </button>
              )}
              {showPause && (
                <button
                  onClick={() => onAction(listing.id, 'pause')}
                  className="text-text-secondary font-medium text-sm hover-only:hover:text-text-primary transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 md:gap-2.5 px-3 md:px-4 py-1.5 md:py-2 rounded-lg border-2 border-blue-500/40 hover-only:hover:border-blue-500/60 bg-blue-500/20 select-none w-full xl:w-auto h-10"
                >
                  {t('listings.pauseAction')}
                </button>
              )}
              {showClose && (
                <button
                  onClick={() => onAction(listing.id, 'close')}
                  className="text-text-secondary font-medium text-sm hover-only:hover:text-text-primary transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 md:gap-2.5 px-3 md:px-4 py-1.5 md:py-2 rounded-lg border-2 border-gray-500/40 hover-only:hover:border-gray-500/60 bg-gray-500/20 select-none w-full xl:w-auto h-10"
                >
                  {t('common.close')}
                </button>
              )}
            </>
          )}
          {showEdit && (
            <Link
              href={editHref}
              data-testid={editLinkTestId}
              className="text-primary-700 font-medium text-sm hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 active:text-primary-900 active:border-primary-900 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 md:gap-2.5 px-3 md:px-4 py-1.5 md:py-2 rounded-lg border-2 border-primary-700 bg-primary-500/10 select-none w-full xl:w-auto h-10"
              onClick={(e) => e.stopPropagation()}
            >
              <EditIcon className="w-4 h-4 shrink-0" />
              {t('common.edit')}
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
  const { locale } = useI18n();
  const [imageError, setImageError] = useState(false);
  const displayTitle = getListingDisplayTitle(listing, t);
  const vehicleType = getVehicleType(listing);
  const newLabel = vehicleType === 'moto' ? t('listings.newMoto') : t('listings.new');

  const imageUrl =
    listing.images?.length && listing.images[0] ? listing.images[0] : '/placeholder-car.jpg';
  const hasImage = imageUrl !== '/placeholder-car.jpg' && !imageError;
  const optimizedImageUrl = hasImage ? getOptimizedImageUrl(imageUrl, 70, 900) : '';

  const blurDataURL = useMemo(
    () => (listing.cover_blur_hash ? blurhashToDataURL(listing.cover_blur_hash) : undefined),
    [listing.cover_blur_hash],
  );

  const handleLinkClick = () => {
    if (listing.cover_blur_hash) {
      setBlurForListing(listing.id, listing.cover_blur_hash, listing.images?.[0]);
    }
    setIndexForListing(listing.id, 0);
  };

  const isAdminMode = mode === 'admin';
  const isBoardMode = mode === 'board';
  const myListingsCardTestId =
    mode === 'my-listings' ? `my-listings-card-${listing.id}` : undefined;
  const myListingsCardLinkTestId =
    mode === 'my-listings' ? `my-listings-card-link-${listing.id}` : undefined;

  return (
    <div className="card overflow-visible group" data-testid={myListingsCardTestId}>
      <div className="grid grid-cols-1 lg:grid-cols-[450px_1fr] gap-0 lg:gap-6 lg:items-stretch">
        <Link
          href={getListingHref(listing, locale)}
          className="shrink-0"
          data-testid={myListingsCardLinkTestId}
          onClick={handleLinkClick}
        >
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
                placeholder={blurDataURL ? 'blur' : undefined}
                blurDataURL={blurDataURL}
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
              <Link
                href={getListingHref(listing, locale)}
                className="mb-3 block group"
                onClick={handleLinkClick}
              >
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
              {listing.vehicle && (
                <ListingVehicleSpecsCompact vehicle={listing.vehicle} t={t} variant="management" />
              )}
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
              locale={locale}
            />
          )}
        </div>
      </div>
    </div>
  );
}
