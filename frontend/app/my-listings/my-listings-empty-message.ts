type StatusFilter = 'All' | 'Active' | 'Paused' | 'Closed';
type PromotedFilter = 'All' | 'Promoted' | 'NotPromoted';

type TFn = (key: string) => string;

export function getMyListingsEmptyMessage(
  t: TFn,
  searchQuery: string,
  statusFilter: StatusFilter,
  promotedFilter: PromotedFilter,
): string {
  if (searchQuery.trim()) {
    return t('myListings.noListingsWithStatus');
  }
  if (statusFilter !== 'All' || promotedFilter !== 'All') {
    return t('myListings.noListingsWithStatus');
  }
  return t('myListings.noListingsYet');
}
