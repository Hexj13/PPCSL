import type { PopularListingsData } from '@/lib/api';

import { collectPopularModelIds } from './useSearchFiltersPopularActive';

describe('collectPopularModelIds', () => {
  it('returns empty set for null data', () => {
    expect(collectPopularModelIds(null).size).toBe(0);
  });

  it('collects model ids from all body type groups', () => {
    const data: PopularListingsData = {
      generatedAt: '2026-07-10T00:00:00.000Z',
      modelsByBodyType: {
        Hatchback: [
          {
            brandId: 'b1',
            brandName: 'Toyota',
            modelId: 'm1',
            modelName: 'Yaris',
            listingCount: 5,
          },
        ],
        Wagon: [],
        SUV: [
          {
            brandId: 'b1',
            brandName: 'Toyota',
            modelId: 'm2',
            modelName: 'RAV4',
            listingCount: 8,
          },
        ],
        Minivan: [],
        Sedan: [],
        Convertible: [],
      },
      brandListingCounts: { Toyota: 13 },
      statistics: {
        brands: { items: [], otherCount: 0, total: 0 },
        bodyTypes: { items: [], otherCount: 0, total: 0 },
        fuels: { items: [], otherCount: 0, total: 0 },
      },
    };

    const ids = collectPopularModelIds(data);
    expect(ids.has('m1')).toBe(true);
    expect(ids.has('m2')).toBe(true);
    expect(ids.size).toBe(2);
  });
});
