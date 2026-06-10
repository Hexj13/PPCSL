'use client';

import type { Listing } from '@/lib/api';
import { sessionStorageRemoveItem } from '@/lib/browser-session-storage';
import { buildMinimalCategorySearchUrl } from '@/lib/search';

import { CitiesProvider } from './CitiesProvider';
import { ListingCardSkeleton } from './ListingCardSkeleton';
import { ListingGridPaginationFooter } from './ListingGridPaginationFooter';
import { VirtualizedListingGrid } from './VirtualizedListingGrid';
import { ListingGridCriticalStyles } from './listing-grid-critical-layout';
import { GRID_RESTORE_STATE_KEY, GRID_STATE_KEY } from './listing-grid-state';

type ListingGridViewProps = {
  gridPlaceholderStyle: { minHeight: number } | undefined;
  showSkeletonOverlay: boolean;
  showContent: boolean;
  error: string | null;
  listings: Listing[];
  hasLoadedWithFilters: boolean;
  widerCategoryHasListings: boolean | null;
  pathname: string;
  searchParamsString: string;
  uniqueListings: Listing[];
  gridVirtualEpoch: number;
  showPartnerPromoBanner: boolean;
  dismissPartnerPromoBanner: () => void;
  loadingMore: boolean;
  appendSkeletonCount: number;
  currentPage: number;
  hasMore: boolean;
  onLoadMore: () => void;
  t: (key: string) => string;
};

export function ListingGridView({
  gridPlaceholderStyle,
  showSkeletonOverlay,
  showContent,
  error,
  listings,
  hasLoadedWithFilters,
  widerCategoryHasListings,
  pathname,
  searchParamsString,
  uniqueListings,
  gridVirtualEpoch,
  showPartnerPromoBanner,
  dismissPartnerPromoBanner,
  loadingMore,
  appendSkeletonCount,
  currentPage,
  hasMore,
  onLoadMore,
  t,
}: ListingGridViewProps) {
  return (
    <>
      <ListingGridCriticalStyles />
      <div data-testid="listing-grid-placeholder" style={gridPlaceholderStyle}>
        {showSkeletonOverlay && (
          <div className="listing-grid-critical-responsive grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
            {Array.from({ length: 8 }).map((_, index) => (
              <ListingCardSkeleton key={`skeleton-${index}`} />
            ))}
          </div>
        )}

        {showContent && (
          <>
            {error && (
              <div className="text-center py-12">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-md mx-auto">
                  <p className="text-red-400 text-lg font-semibold mb-2">{t('common.error')}</p>
                  <p style={{ color: 'rgb(var(--text-secondary-rgb))' }}>{error}</p>
                </div>
              </div>
            )}

            {!error && listings.length === 0 && hasLoadedWithFilters && (
              <div className="text-center py-12" data-testid="listings-empty-state">
                <p className="text-lg mb-6" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                  {t('listings.notFound')}
                </p>
                {widerCategoryHasListings === true && (
                  <div className="flex justify-center">
                    <button
                      onClick={() => {
                        sessionStorageRemoveItem(GRID_STATE_KEY);
                        sessionStorageRemoveItem(GRID_RESTORE_STATE_KEY);
                        sessionStorageRemoveItem('homeScrollTimestamp');
                        sessionStorageRemoveItem('scrollPreserved');

                        if (pathname === '/') {
                          if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('resetFiltersFromListingGrid'));
                          }
                        } else {
                          window.location.href = buildMinimalCategorySearchUrl(
                            new URLSearchParams(searchParamsString),
                          );
                        }
                      }}
                      className="text-primary-900 font-medium text-sm md:text-base hover-only:hover:text-primary-700 active:text-primary-700 hover-only:hover:border-primary-900 active:border-primary-900 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-1.5 px-6 py-3 rounded-lg border-2 border-primary-700 bg-primary-500/10 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base cursor-pointer"
                    >
                      {t('listings.viewAllListings')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {!error && listings.length > 0 && (
              <CitiesProvider>
                <VirtualizedListingGrid
                  key={`${searchParamsString}-${gridVirtualEpoch}`}
                  listings={uniqueListings}
                  showPartnerPromoBanner={showPartnerPromoBanner}
                  onDismissPartnerPromoBanner={dismissPartnerPromoBanner}
                />
                {loadingMore && appendSkeletonCount > 0 && (
                  <div className="listing-grid-critical-responsive grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch mt-6">
                    {Array.from({ length: appendSkeletonCount }).map((_, index) => (
                      <ListingCardSkeleton key={`append-skeleton-${currentPage + 1}-${index}`} />
                    ))}
                  </div>
                )}
                <ListingGridPaginationFooter
                  hasMore={hasMore}
                  loadingMore={loadingMore}
                  onLoadMore={onLoadMore}
                  loadMoreLabel={t('listings.showMore')}
                  noMoreLabel={t('listings.noMoreListings')}
                  showNoMore={!hasMore && uniqueListings.length > 0 && !loadingMore}
                />
              </CitiesProvider>
            )}
          </>
        )}
      </div>
    </>
  );
}
