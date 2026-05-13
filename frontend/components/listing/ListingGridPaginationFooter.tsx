'use client';

import { LoadMoreButton } from './LoadMoreButton';

interface ListingGridPaginationFooterProps {
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  loadMoreLabel: string;
  noMoreLabel: string;
  showNoMore: boolean;
}

export function ListingGridPaginationFooter({
  hasMore,
  loadingMore,
  onLoadMore,
  loadMoreLabel,
  noMoreLabel,
  showNoMore,
}: ListingGridPaginationFooterProps) {
  return (
    <div className="min-h-[88px]">
      {(hasMore || loadingMore) && (
        <LoadMoreButton onClick={onLoadMore} loading={loadingMore} disabled={loadingMore}>
          {loadMoreLabel}
        </LoadMoreButton>
      )}

      {showNoMore && (
        <div className="flex justify-center pt-8 pb-0">
          <p style={{ color: 'rgb(var(--text-secondary-rgb))' }}>{noMoreLabel}</p>
        </div>
      )}
    </div>
  );
}
