'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { Listing } from '@/lib/api';
import { LoadingSpinner } from '@/ui';

interface ListingPageActionsProps {
  listing: Listing;
  isInitialized: boolean;
  isInComparison: boolean;
  isFavorite: boolean;
  isOwnListing: boolean;
  canPromote: boolean;
  showPromoteButton: boolean;
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
  onToggleComparison,
  onToggleFavorite,
  onPromoteClick,
}: ListingPageActionsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      {listing.status !== 'Closed' && (
        <>
          {!isInitialized && listing.user ? (
            <button
              disabled
              className="w-full sm:w-auto sm:max-w-fit px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 bg-primary-500/10 text-primary-300 border border-primary-500/30 cursor-not-allowed opacity-50"
            >
              <LoadingSpinner size="sm" className="border-primary-300 border-t-transparent" />
              <span>{t('common.loading')}</span>
            </button>
          ) : (
            <button
              onClick={onToggleComparison}
              disabled={isInComparison}
              className={`w-full sm:w-auto sm:max-w-fit px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                isInComparison
                  ? 'bg-primary-500/10 text-primary-300 border border-primary-500/30 cursor-not-allowed'
                  : 'btn-secondary'
              }`}
              title={isInComparison ? t('listingDetail.alreadyInComparisonError') : ''}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                />
              </svg>
              {isInComparison ? t('listingDetail.alreadyInComparison') : t('listingDetail.compare')}
            </button>
          )}
        </>
      )}
      {!isInitialized && listing.user ? (
        <button
          disabled
          className="w-full sm:w-auto sm:max-w-fit px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 bg-primary-500/10 text-primary-300 border border-primary-500/30 cursor-not-allowed opacity-50"
        >
          <div className="w-5 h-5 border-2 border-primary-300 border-t-transparent rounded-full animate-spin"></div>
          <span>{t('common.loading')}</span>
        </button>
      ) : (
        <button
          onClick={onToggleFavorite}
          disabled={isOwnListing}
          className={`w-full sm:w-auto sm:max-w-fit px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
            isOwnListing
              ? 'bg-primary-500/10 text-primary-300 border border-primary-500/30 cursor-not-allowed'
              : isFavorite
                ? 'bg-bg-light text-white border-2 border-primary-500/30 hover:bg-primary-500/10 hover:border-primary-500'
                : 'btn-secondary'
          }`}
          title={isOwnListing ? t('listingDetail.cannotAddOwnListing') : ''}
        >
          <svg
            className="w-5 h-5"
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
      {showPromoteButton && canPromote && listing.status === 'Active' && !listing.is_promoted && (
        <button
          onClick={onPromoteClick}
          className="w-full sm:w-auto sm:max-w-fit px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 bg-yellow-500/20 border-2 border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30 hover:border-yellow-500/60"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
          {t('listings.promote')}
        </button>
      )}
    </div>
  );
}
