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

  describe('tire rank', () => {
    const baseTireCurrent: CurrentListingForRanking = {
      price: 400,
      currency: 'EUR',
      city: 'Chisinau',
      condition: 'Undamaged',
      tire: {
        brand_id: 'tb1',
        model_id: 'tm1',
        tire_vehicle_type: 'car',
        season: 'summer',
        condition: 'used',
        width_mm: 225,
        aspect_ratio: 45,
        diameter_inch: 17,
        quantity: 4,
        studded: false,
        run_flat: false,
      },
    };

    const makeTireCandidate = (
      overrides: Partial<ListingForRanking> & { id: string; user_id: string; price: number },
    ): ListingForRanking => ({
      id: overrides.id,
      user_id: overrides.user_id,
      price: overrides.price,
      currency: overrides.currency ?? 'EUR',
      is_new: overrides.is_new ?? false,
      condition: overrides.condition ?? 'Undamaged',
      city: overrides.city ?? null,
      is_promoted: overrides.is_promoted ?? false,
      promoted_until: overrides.promoted_until ?? null,
      last_updated_at: overrides.last_updated_at ?? new Date().toISOString(),
      vehicle: null,
      tire: overrides.tire ?? null,
    });

    it('should rank exact tire size and brand+model first', () => {
      const exactMatch = makeTireCandidate({
        id: 'exact',
        user_id: 'u1',
        price: 410,
        tire: {
          brand_id: 'tb1',
          model_id: 'tm1',
          season: 'winter',
          condition: 'new',
          width_mm: 225,
          aspect_ratio: 45,
          diameter_inch: 17,
          quantity: 2,
        },
      });
      const otherSize = makeTireCandidate({
        id: 'other-size',
        user_id: 'u2',
        price: 390,
        tire: {
          brand_id: 'tb1',
          model_id: 'tm1',
          season: 'summer',
          condition: 'used',
          width_mm: 215,
          aspect_ratio: 45,
          diameter_inch: 17,
          quantity: 4,
        },
      });
      const result = service.rank(baseTireCurrent, [otherSize, exactMatch]);
      expect(result[0].id).toBe('exact');
      expect(result[1].id).toBe('other-size');
    });

    it('should prefer promoted tires in the same bucket', () => {
      const promoted = makeTireCandidate({
        id: 'p',
        user_id: 'u1',
        price: 400,
        is_promoted: true,
        promoted_until: new Date(Date.now() + 86400000),
        tire: {
          brand_id: 'tb1',
          model_id: 'tm1',
          season: 'summer',
          condition: 'used',
          width_mm: 225,
          aspect_ratio: 45,
          diameter_inch: 17,
          quantity: 4,
        },
      });
      const plain = makeTireCandidate({
        id: 'n',
        user_id: 'u2',
        price: 400,
        tire: {
          brand_id: 'tb1',
          model_id: 'tm1',
          season: 'summer',
          condition: 'used',
          width_mm: 225,
          aspect_ratio: 45,
          diameter_inch: 17,
          quantity: 4,
        },
      });
      const result = service.rank(baseTireCurrent, [plain, promoted]);
      expect(result[0].id).toBe('p');
      expect(result[1].id).toBe('n');
    });

    it('should prefer same city after promotion within tire bucket', () => {
      const sameCity = makeTireCandidate({
        id: 'c',
        user_id: 'u1',
        price: 400,
        city: 'Chisinau',
        tire: {
          brand_id: 'tb1',
          model_id: 'tm1',
          season: 'summer',
          condition: 'used',
          width_mm: 225,
          aspect_ratio: 45,
          diameter_inch: 17,
          quantity: 4,
        },
      });
      const otherCity = makeTireCandidate({
        id: 'o',
        user_id: 'u2',
        price: 400,
        city: 'Balti',
        tire: {
          brand_id: 'tb1',
          model_id: 'tm1',
          season: 'summer',
          condition: 'used',
          width_mm: 225,
          aspect_ratio: 45,
          diameter_inch: 17,
          quantity: 4,
        },
      });
      const result = service.rank(baseTireCurrent, [otherCity, sameCity]);
      expect(result[0].id).toBe('c');
      expect(result[1].id).toBe('o');
    });

    it('should prefer same tire_vehicle_type when buckets match', () => {
      const truckCurrent: CurrentListingForRanking = {
        ...baseTireCurrent,
        tire: {
          ...baseTireCurrent.tire!,
          tire_vehicle_type: 'truck',
        },
      };
      const carTire = makeTireCandidate({
        id: 'car-tire',
        user_id: 'u1',
        price: 400,
        tire: {
          brand_id: 'tb1',
          model_id: 'tm1',
          tire_vehicle_type: 'car',
          season: 'summer',
          condition: 'used',
          width_mm: 225,
          aspect_ratio: 45,
          diameter_inch: 17,
          quantity: 4,
        },
      });
      const truckTire = makeTireCandidate({
        id: 'truck-tire',
        user_id: 'u2',
        price: 400,
        tire: {
          brand_id: 'tb1',
          model_id: 'tm1',
          tire_vehicle_type: 'truck',
          season: 'summer',
          condition: 'used',
          width_mm: 225,
          aspect_ratio: 45,
          diameter_inch: 17,
          quantity: 4,
        },
      });
      const result = service.rank(truckCurrent, [carTire, truckTire]);
      expect(result[0].id).toBe('truck-tire');
      expect(result[1].id).toBe('car-tire');
    });
  });
});
