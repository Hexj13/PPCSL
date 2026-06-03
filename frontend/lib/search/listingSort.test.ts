import { DEFAULT_LISTING_SORT_KEY, isListingSortKey, resolveListingSortKey } from './listingSort';

describe('listingSort', () => {
  it('resolves valid sortBy and sortOrder to a listing sort key', () => {
    expect(resolveListingSortKey('price', 'ASC')).toBe('price_ASC');
    expect(resolveListingSortKey('created_at', 'DESC')).toBe('created_at_DESC');
  });

  it('falls back to default for unknown combinations', () => {
    expect(resolveListingSortKey('invalid', 'ASC')).toBe(DEFAULT_LISTING_SORT_KEY);
    expect(resolveListingSortKey(null, null)).toBe(DEFAULT_LISTING_SORT_KEY);
  });

  it('validates listing sort keys', () => {
    expect(isListingSortKey('price_ASC')).toBe(true);
    expect(isListingSortKey('not_a_sort')).toBe(false);
  });
});
