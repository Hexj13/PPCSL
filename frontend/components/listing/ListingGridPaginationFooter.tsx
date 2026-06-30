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
  const showLoadMore = hasMore || loadingMore;

  if (!showLoadMore && !showNoMore) {
    return null;
  }

  return (
    <div className="pt-6 md:pt-8" data-testid="listing-grid-pagination-footer">
      {showLoadMore && (
        <LoadMoreButton
          onClick={onLoadMore}
          loading={loadingMore}
          disabled={loadingMore}
          wrapperDataTestId="listing-grid-load-more-wrapper"
          withDefaultWrapperSpacing={false}
          dataTestId="listings-load-more"
        >
          {loadMoreLabel}
        </LoadMoreButton>
      )}

      {showNoMore && (
        <div className="flex justify-center" data-testid="listing-grid-no-more-wrapper">
          <p style={{ color: 'rgb(var(--text-secondary-rgb))' }}>{noMoreLabel}</p>
        </div>
      )}
    </div>
  );
}
