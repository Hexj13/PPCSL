import type { ListingSortKey } from '../../lib/search/listingSort';

const LISTING_SORT_KEYS: ListingSortKey[] = [
  'created_at_DESC',
  'created_at_ASC',
  'views_DESC',
  'price_ASC',
  'price_DESC',
  'year_DESC',
  'year_ASC',
];

export function listingSortOptionIndex(sortKey: ListingSortKey): number {
  const index = LISTING_SORT_KEYS.indexOf(sortKey);
  if (index < 0) {
    throw new Error(`Unknown listing sort key: ${sortKey}`);
  }
  return index;
}
