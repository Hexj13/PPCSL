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
      fuel: 'Petrol',
      transmission: 'Automatic',
      drive_type: 'Front',
      engine_displ_l: 2.0,
    },
  };

  const makeCandidate = (
    overrides: Partial<ListingForRanking> & { id: string; user_id: string; price: number },
  ): ListingForRanking => ({
    id: overrides.id,
    user_id: overrides.user_id,
    price: overrides.price,
    currency: overrides.currency ?? 'EUR',
    is_new: overrides.is_new ?? false,
    condition: overrides.condition ?? 'Used',
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

    it('should rank same model outside year window above weaker matches', () => {
      const sameModelOldYear = makeCandidate({
        id: 'same-model-old',
        user_id: 'u1',
        price: 16000,
        vehicle: {
          brand_id: 'brand-1',
          model_id: 'model-1',
          body_type: 'Sedan',
          year: 2010,
          mileage_km: 120000,
        },
      });
      const sameBodyOnly = makeCandidate({
        id: 'same-body',
        user_id: 'u2',
        price: 15500,
        vehicle: {
          brand_id: 'brand-2',
          model_id: 'model-2',
          body_type: 'Sedan',
          year: 2020,
          mileage_km: 48000,
        },
      });

      const result = service.rank(baseCurrent, [sameBodyOnly, sameModelOldYear]);
      expect(result[0].id).toBe('same-model-old');
      expect(result[1].id).toBe('same-body');
    });

    it('should prefer drivetrain and engine matches inside same bucket', () => {
      const strongerSignals = makeCandidate({
        id: 'strong-signals',
        user_id: 'u1',
        price: 16000,
        city: 'Balti',
        vehicle: {
          brand_id: 'brand-1',
          model_id: 'model-1',
          body_type: 'Sedan',
          year: 2020,
          mileage_km: 52000,
          fuel: 'Petrol',
          transmission: 'Automatic',
          drive_type: 'Front',
          engine_displ_l: 2.0,
        },
      });
      const weakerSignals = makeCandidate({
        id: 'weak-signals',
        user_id: 'u2',
        price: 16000,
        city: 'Balti',
        vehicle: {
          brand_id: 'brand-1',
          model_id: 'model-1',
          body_type: 'Sedan',
          year: 2020,
          mileage_km: 48000,
          fuel: 'Diesel',
          transmission: 'Manual',
          drive_type: 'Rear',
          engine_displ_l: 3.0,
        },
      });

      const result = service.rank(baseCurrent, [weakerSignals, strongerSignals]);
      expect(result[0].id).toBe('strong-signals');
      expect(result[1].id).toBe('weak-signals');
    });

    it('should compare price range in normalized default currency', () => {
      const closeInEur = makeCandidate({
        id: 'close-eur',
        user_id: 'u1',
        price: 9000,
        currency: 'EUR',
        vehicle: {
          brand_id: 'brand-2',
          model_id: 'model-2',
          body_type: 'Sedan',
          year: 2020,
          mileage_km: 50000,
        },
      });
      const farInMdl = makeCandidate({
        id: 'far-mdl',
        user_id: 'u2',
        price: 350000,
        currency: 'MDL',
        vehicle: {
          brand_id: 'brand-2',
          model_id: 'model-3',
          body_type: 'Sedan',
          year: 2020,
          mileage_km: 50000,
        },
      });

      const result = service.rank(
        { ...baseCurrent, price: 10000, currency: 'EUR' },
        [farInMdl, closeInEur],
        {
          defaultCurrency: 'EUR',
          rates: { MDL: 20 },
        },
      );
      expect(result[0].id).toBe('close-eur');
      expect(result[1].id).toBe('far-mdl');
    });
  });
});
