'use client';

import { HEADER_CTA_PROMOTE_SURFACE_CLASSES } from '@/components/listing/CreateListingButton';
import { useTranslation } from '@/hooks/useTranslation';
import type { Listing } from '@/lib/api';
import { LoadingSpinner } from '@/ui';

interface ListingPageActionsProps {
  listing: Listing;
  isInitialized: boolean;
  isInComparison: boolean;
  isFavorite: boolean;
  isOwnListing: boolean;
  canPromote: boolean;
  showPromoteButton: boolean;
  showCompare?: boolean;
  onToggleComparison: () => void;
  onToggleFavorite: () => void;
  onPromoteClick: () => void;
}

export function ListingPageActions({
  listing,
  isInitialized,
  isInComparison,
  isFavorite,
  isOwnListing,
  canPromote,
  showPromoteButton,
  showCompare = true,
  onToggleComparison,
  onToggleFavorite,
  onPromoteClick,
}: ListingPageActionsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-col gap-3">
      {showPromoteButton && canPromote && listing.status === 'Active' && !listing.is_promoted && (
        <button
          onClick={onPromoteClick}
          className={`${HEADER_CTA_PROMOTE_SURFACE_CLASSES} w-full sm:w-auto sm:max-w-fit h-12 py-2 sm:h-auto sm:min-h-0 sm:py-2 md:py-2.5 px-6 text-base font-medium gap-2`}
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
      {!isInitialized && listing.user ? (
        <button
          disabled
          className="w-full sm:w-auto sm:max-w-fit h-12 py-2 sm:h-auto sm:min-h-0 sm:py-3.5 md:py-2.5 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 bg-primary-500/10 text-primary-300 border border-primary-500/30 cursor-not-allowed opacity-50 text-base"
        >
          <div className="w-3.5 h-3.5 md:w-4 md:h-4 border-2 border-primary-300 border-t-transparent rounded-full animate-spin"></div>
          <span>{t('common.loading')}</span>
        </button>
      ) : (
        <button
          onClick={onToggleFavorite}
          className="w-full sm:w-auto sm:max-w-fit h-12 py-2 sm:h-auto sm:min-h-0 sm:py-3.5 md:py-2.5 px-8 text-base rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 active:text-primary-900 active:border-primary-900 border-2 border-primary-700 bg-primary-500/10 select-none"
        >
          <svg
            className="w-3.5 h-3.5 md:w-4 md:h-4"
            fill={isFavorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          {isOwnListing
            ? t('listingDetail.yourListing')
            : isFavorite
              ? t('listingDetail.removeFromFavorites')
              : t('listingDetail.addToFavorites')}
        </button>
      )}
      {listing.status !== 'Closed' && showCompare && (
        <>
          {!isInitialized && listing.user ? (
            <button
              disabled
              className="w-full sm:w-auto sm:max-w-fit h-12 py-2 sm:h-auto sm:min-h-0 sm:py-3.5 md:py-2.5 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 bg-primary-500/10 text-primary-300 border border-primary-500/30 cursor-not-allowed opacity-50 text-base"
            >
              <LoadingSpinner size="sm" />
              <span>{t('common.loading')}</span>
            </button>
          ) : (
            <button
              onClick={onToggleComparison}
              className="w-full sm:w-auto sm:max-w-fit h-12 py-2 sm:h-auto sm:min-h-0 sm:py-3.5 md:py-2.5 px-8 text-base rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 active:text-primary-900 active:border-primary-900 border-2 border-primary-700 bg-primary-500/10 select-none"
            >
              <svg
                className="w-3.5 h-3.5 md:w-4 md:h-4"
                fill={isInComparison ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                />
              </svg>
              {isInComparison ? t('common.removeFromComparison') : t('listingDetail.compare')}
            </button>
          )}
        </>
      )}
    </div>
  );
}
