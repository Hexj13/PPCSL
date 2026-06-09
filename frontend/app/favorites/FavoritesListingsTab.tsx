'use client';

import { CitiesProvider } from '@/components/listing/CitiesProvider';
import { ListingCard } from '@/components/listing/ListingCard';
import { ListingCardSkeleton } from '@/components/listing/ListingCardSkeleton';
import { ListingGridPaginationFooter } from '@/components/listing/ListingGridPaginationFooter';
import { useTranslation } from '@/hooks/useTranslation';
import type { Listing, PaginationMeta } from '@/lib/api';

const FAVORITES_SKELETON_COUNT = 4;

interface FavoritesListingsTabProps {
  listings: Listing[];
  meta: PaginationMeta | null;
  currentPage: number;
  loadingMore: boolean;
  showSkeleton: boolean;
  onLoadMore: () => void;
  onRemoveListing: (listing: Listing) => void;
}

export function FavoritesListingsTab({
  listings,
  meta,
  currentPage,
  loadingMore,
  showSkeleton,
  onLoadMore,
  onRemoveListing,
}: FavoritesListingsTabProps) {
  const { t } = useTranslation();

  if (showSkeleton) {
    return (
      <div data-testid="favorites-listings-tab">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
          {Array.from({ length: FAVORITES_SKELETON_COUNT }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div data-testid="favorites-listings-tab">
        <div className="text-center py-12" data-testid="favorites-listings-empty">
          <p className="text-text-primary text-lg">{t('favorites.empty')}</p>
        </div>
      </div>
    );
  }

  const hasMorePages = meta && (meta.totalPages ?? 0) > 0 && currentPage < (meta.totalPages ?? 0);
  const noMorePages = meta && (meta.totalPages ?? 0) > 0 && currentPage >= (meta.totalPages ?? 0);

  return (
    <div data-testid="favorites-listings-tab">
      <CitiesProvider>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch pb-6">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              forceFavorite={true}
              onRemove={() => onRemoveListing(listing)}
            />
          ))}
        </div>
      </CitiesProvider>
      {loadingMore && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
          {Array.from({ length: FAVORITES_SKELETON_COUNT }).map((_, index) => (
            <ListingCardSkeleton key={`append-skeleton-${currentPage + 1}-${index}`} />
          ))}
        </div>
      )}
      <ListingGridPaginationFooter
        hasMore={!!hasMorePages}
        loadingMore={loadingMore}
        onLoadMore={onLoadMore}
        loadMoreLabel={t('listings.showMore')}
        noMoreLabel={t('listings.noMoreListings')}
        showNoMore={!!noMorePages && !loadingMore}
      />
    </div>
  );
}
