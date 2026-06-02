'use client';

import { CitiesProvider } from '@/components/listing/CitiesProvider';
import { ListingCard } from '@/components/listing/ListingCard';
import { ListingCardSkeleton } from '@/components/listing/ListingCardSkeleton';
import { LoadMoreButton } from '@/components/listing/LoadMoreButton';
import { useTranslation } from '@/hooks/useTranslation';
import type { Listing, PaginationMeta } from '@/lib/api';

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
          {[...Array(4)].map((_, i) => (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
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
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          <p className="mt-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
            {t('common.loading')}
          </p>
        </div>
      )}
      {hasMorePages && !loadingMore && <LoadMoreButton onClick={onLoadMore} />}
      {noMorePages && !loadingMore && (
        <div className="text-center pt-8 pb-0">
          <p style={{ color: 'rgb(var(--text-secondary-rgb))' }}>{t('listings.noMoreListings')}</p>
        </div>
      )}
    </div>
  );
}
