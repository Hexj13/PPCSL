import { GetPopularListingsUseCase } from './get-popular-listings.use-case';
import { LISTING_CACHE } from '../ports/listing-cache.port';
import { LISTING_REPOSITORY } from '../ports/listing.repository.port';
import type { PopularListingsData } from '../../domain/popular-listings.types';

describe('GetPopularListingsUseCase', () => {
  const emptyAggregates = {
    modelsByBodyType: {
      Hatchback: [],
      Wagon: [],
      SUV: [],
      Minivan: [],
      Sedan: [],
      Convertible: [],
    },
    brandListingCounts: {},
    statistics: {
      brands: {
        items: [
          { key: 'b1', label: 'Toyota', count: 10 },
          { key: 'b2', label: 'BMW', count: 8 },
          { key: 'b3', label: 'Audi', count: 6 },
          { key: 'b4', label: 'VW', count: 4 },
          { key: 'b5', label: 'Ford', count: 3 },
          { key: 'b6', label: 'Opel', count: 2 },
        ],
        otherCount: 0,
        total: 33,
      },
      bodyTypes: { items: [], otherCount: 0, total: 0 },
      fuels: { items: [], otherCount: 0, total: 0 },
    },
  };

  const cached: PopularListingsData = {
    generatedAt: '2026-07-09T01:00:00.000Z',
    ...emptyAggregates,
  };

  let listingRepo: { getPopularListingsAggregates: jest.Mock };
  let listingCache: {
    getPopularListings: jest.Mock;
    setPopularListings: jest.Mock;
  };
  let useCase: GetPopularListingsUseCase;

  beforeEach(() => {
    listingRepo = {
      getPopularListingsAggregates: jest.fn().mockResolvedValue(emptyAggregates),
    };
    listingCache = {
      getPopularListings: jest.fn().mockResolvedValue(null),
      setPopularListings: jest.fn().mockResolvedValue(undefined),
    };
    useCase = new GetPopularListingsUseCase(listingRepo as never, listingCache as never);
  });

  it('returns cached data on cache hit', async () => {
    listingCache.getPopularListings.mockResolvedValue(cached);

    const result = await useCase.execute();

    expect(result).toEqual(cached);
    expect(listingRepo.getPopularListingsAggregates).not.toHaveBeenCalled();
    expect(listingCache.setPopularListings).not.toHaveBeenCalled();
  });

  it('computes and caches data on cache miss', async () => {
    const result = await useCase.execute();

    expect(listingRepo.getPopularListingsAggregates).toHaveBeenCalled();
    expect(listingCache.setPopularListings).toHaveBeenCalledWith(
      expect.objectContaining({
        modelsByBodyType: emptyAggregates.modelsByBodyType,
        brandListingCounts: emptyAggregates.brandListingCounts,
        statistics: emptyAggregates.statistics,
        generatedAt: expect.any(String),
      }),
    );
    expect(result.statistics.brands.items).toHaveLength(6);
  });

  it('force refresh bypasses cache read and recomputes', async () => {
    listingCache.getPopularListings.mockResolvedValue(cached);

    const result = await useCase.execute({ forceRefresh: true });

    expect(listingCache.getPopularListings).not.toHaveBeenCalled();
    expect(listingRepo.getPopularListingsAggregates).toHaveBeenCalled();
    expect(listingCache.setPopularListings).toHaveBeenCalled();
    expect(result.generatedAt).not.toEqual(cached.generatedAt);
  });
});
