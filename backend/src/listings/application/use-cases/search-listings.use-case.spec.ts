import { Test, TestingModule } from '@nestjs/testing';

import { ExchangeRatesService } from '../../../exchange-rates/exchange-rates.service';
import { Listing } from '../../entities/listing.entity';
import { LISTING_CACHE } from '../ports/listing-cache.port';
import { LISTING_REPOSITORY } from '../ports/listing.repository.port';

import { MetricsService } from '../../../common/metrics/metrics.service';
import { ListingPublicViewMapper } from '../mappers/listing-public-view.mapper';

import { SearchListingsUseCase } from './search-listings.use-case';

describe('SearchListingsUseCase', () => {
  let useCase: SearchListingsUseCase;
  let listingRepo: { search: jest.Mock };
  let listingCache: {
    getSearchResults: jest.Mock;
    setSearchResults: jest.Mock;
    getSearchCount: jest.Mock;
    setSearchCount: jest.Mock;
  };
  let exchangeRatesService: {
    enrichListingsWithApproxPrice: jest.Mock;
    getAllRatesMap: jest.Mock;
  };

  beforeEach(async () => {
    listingRepo = { search: jest.fn() };
    listingCache = {
      getSearchResults: jest.fn().mockResolvedValue(null),
      setSearchResults: jest.fn().mockResolvedValue(undefined),
      getSearchCount: jest.fn().mockResolvedValue(null),
      setSearchCount: jest.fn().mockResolvedValue(undefined),
    };
    exchangeRatesService = {
      enrichListingsWithApproxPrice: jest.fn().mockImplementation(async (listings: Listing[]) =>
        listings.map((listing) => ({
          ...listing,
          approxPriceDefaultCurrency: listing.price,
          defaultCurrencyCode: 'EUR',
        })),
      ),
      getAllRatesMap: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchListingsUseCase,
        ListingPublicViewMapper,
        { provide: LISTING_REPOSITORY, useValue: listingRepo },
        { provide: LISTING_CACHE, useValue: listingCache },
        { provide: ExchangeRatesService, useValue: exchangeRatesService },
        {
          provide: MetricsService,
          useValue: { incrementCacheHit: jest.fn(), incrementCacheMiss: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(SearchListingsUseCase);
  });

  it('returns cached search results when cache hits', async () => {
    const cachedListing = { id: 'listing-1', price: 1000, currency: 'EUR' } as Listing;
    listingCache.getSearchResults.mockResolvedValue({
      data: [cachedListing],
      total: 1,
      nextCursor: 'cached-cursor',
    });

    const result = await useCase.execute({ page: 1, limit: 20 });

    expect(listingRepo.search).not.toHaveBeenCalled();
    expect(result.meta.total).toBe(1);
    expect(result.meta.nextCursor).toBe('cached-cursor');
    expect(result.data[0]).toMatchObject({ approxPriceDefaultCurrency: 1000 });
  });

  it('returns cached search results without nextCursor for legacy payloads', async () => {
    const cachedListing = { id: 'listing-1', price: 1000, currency: 'EUR' } as Listing;
    listingCache.getSearchResults.mockResolvedValue({ data: [cachedListing], total: 1 });

    const result = await useCase.execute({ page: 1, limit: 20 });

    expect(result.meta.nextCursor).toBeUndefined();
  });

  it('queries repository and stores masked results in cache on miss', async () => {
    const listing = {
      id: 'listing-2',
      price: 2000,
      currency: 'EUR',
      status: 'Active',
      images: ['a', 'b', 'c', 'd', 'e', 'f'],
      user: { phone: '+37360123456', email: 'seller@example.com' },
    } as Listing;
    listingRepo.search.mockResolvedValue({
      data: [listing],
      total: 1,
      nextCursor: 'repo-cursor',
    });

    const result = await useCase.execute({ page: 1, limit: 20, sortBy: 'created_at' });

    expect(listingCache.setSearchResults).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 }),
      expect.objectContaining({ nextCursor: 'repo-cursor', total: 1 }),
    );
    expect(result.data).toHaveLength(1);
    expect(result.data[0].images).toHaveLength(5);
    expect(result.meta.total).toBe(1);
    expect(result.meta.nextCursor).toBe('repo-cursor');
  });
});
