import { defaultCatalogSearchParams } from '@/catalog/catalogSearchParams';
import { hasActiveCatalogFilters } from '@/catalog/hasActiveCatalogFilters';

describe('hasActiveCatalogFilters', () => {
  it('returns false for default vehicle draft', () => {
    expect(hasActiveCatalogFilters(defaultCatalogSearchParams('vehicle'))).toBe(false);
  });

  it('returns true when brand_ids set', () => {
    expect(
      hasActiveCatalogFilters({
        ...defaultCatalogSearchParams('vehicle'),
        brand_ids: ['abc'],
      }),
    ).toBe(true);
  });

  it('returns false when only sort changes from default', () => {
    const draft = { ...defaultCatalogSearchParams('vehicle'), sortBy: 'price' as const };
    expect(hasActiveCatalogFilters(draft)).toBe(false);
  });
});
