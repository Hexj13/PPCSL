import {
  CurrentListingForRanking,
  ListingForRanking,
  SimilarListingsRankingService,
} from './similar-ranking.service';

describe('SimilarListingsRankingService', () => {
  let service: SimilarListingsRankingService;

  beforeEach(() => {
    service = new SimilarListingsRankingService();
  });

  const baseCurrent: CurrentListingForRanking = {
    price: 15000,
    city: 'Chisinau',
    vehicle: {
      brand_id: 'brand-1',
      model_id: 'model-1',
      body_type: 'Sedan',
      year: 2020,
      mileage_km: 50000,
    },
  };

  const makeCandidate = (
    overrides: Partial<ListingForRanking> & { id: string; user_id: string; price: number },
  ): ListingForRanking => ({
    id: overrides.id,
    user_id: overrides.user_id,
    price: overrides.price,
    city: overrides.city ?? null,
    is_promoted: overrides.is_promoted ?? false,
    promoted_until: overrides.promoted_until ?? null,
    last_updated_at: overrides.last_updated_at ?? new Date().toISOString(),
    vehicle: overrides.vehicle ?? null,
  });

  describe('rank', () => {
    it('should put same brand+model+year in bucket 1 first', () => {
      const same = makeCandidate({
        id: '1',
        user_id: 'u1',
        price: 14000,
        vehicle: {
          brand_id: 'brand-1',
          model_id: 'model-1',
          body_type: 'Sedan',
          year: 2020,
          mileage_km: 48000,
        },
      });
      const other = makeCandidate({
        id: '2',
        user_id: 'u2',
        price: 10000,
        vehicle: {
          brand_id: 'brand-2',
          model_id: 'model-2',
          body_type: 'Sedan',
          year: 2019,
          mileage_km: 60000,
        },
      });
      const result = service.rank(baseCurrent, [other, same]);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    it('should prefer promoted listings after same bucket', () => {
      const promoted = makeCandidate({
        id: '1',
        user_id: 'u1',
        price: 16000,
        is_promoted: true,
        promoted_until: new Date(Date.now() + 86400000),
        vehicle: {
          brand_id: 'brand-1',
          model_id: 'model-1',
          body_type: 'Sedan',
          year: 2020,
          mileage_km: 50000,
        },
      });
      const notPromoted = makeCandidate({
        id: '2',
        user_id: 'u2',
        price: 15500,
        vehicle: {
          brand_id: 'brand-1',
          model_id: 'model-1',
          body_type: 'Sedan',
          year: 2020,
          mileage_km: 52000,
        },
      });
      const result = service.rank(baseCurrent, [notPromoted, promoted]);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    it('should prefer same city after promotion', () => {
      const sameCity = makeCandidate({
        id: '1',
        user_id: 'u1',
        price: 16000,
        city: 'Chisinau',
        vehicle: {
          brand_id: 'brand-1',
          model_id: 'model-1',
          body_type: 'Sedan',
          year: 2020,
          mileage_km: 50000,
        },
      });
      const otherCity = makeCandidate({
        id: '2',
        user_id: 'u2',
        price: 16000,
        city: 'Balti',
        vehicle: {
          brand_id: 'brand-1',
          model_id: 'model-1',
          body_type: 'Sedan',
          year: 2020,
          mileage_km: 50000,
        },
      });
      const result = service.rank(baseCurrent, [otherCity, sameCity]);
      expect(result[0].city).toBe('Chisinau');
      expect(result[1].city).toBe('Balti');
    });
  });

  describe('diversifyBySeller', () => {
    it('should limit listings per seller', () => {
      const listings: ListingForRanking[] = [
        makeCandidate({ id: '1', user_id: 'u1', price: 1000 }),
        makeCandidate({ id: '2', user_id: 'u1', price: 2000 }),
        makeCandidate({ id: '3', user_id: 'u1', price: 3000 }),
        makeCandidate({ id: '4', user_id: 'u2', price: 4000 }),
      ];
      const result = service.diversifyBySeller(listings, 2);
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.id)).toEqual(['1', '2', '4']);
    });

    it('should stop at 8 items', () => {
      const listings = Array.from({ length: 10 }, (_, i) =>
        makeCandidate({ id: `id-${i}`, user_id: `u${i}`, price: 1000 + i }),
      );
      const result = service.diversifyBySeller(listings, 10);
      expect(result).toHaveLength(8);
    });
  });
});
