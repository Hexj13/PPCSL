import * as constants from '../../common/constants';
import { Listing } from '../entities/listing.entity';
import { Vehicle } from '../entities/vehicle.entity';

import {
  buildListingAiInputSnapshot,
  computeListingAiInputHash,
  isVehicleListingForAiReport,
} from './listing-ai-report-snapshot';

function baseListing(overrides: Partial<Listing> = {}): Listing {
  const vehicle = {
    id: 'v1',
    brand_id: 'b1',
    model_id: 'm1',
    year: 2020,
    mileage_km: 50000,
    fuel: 'Petrol',
    transmission: 'Manual',
    drive_type: 'FWD',
    body_type: 'Sedan',
    brand: { id: 'b1', name: 'TestBrand', order: 1 } as Vehicle['brand'],
    model: { id: 'm1', name: 'TestModel', brand_id: 'b1', order: 1 } as Vehicle['model'],
    engine_displ_l: 2,
    color: 'Black',
    doors: 4,
  } as Vehicle;

  return {
    id: 'listing-1',
    title: 'Car',
    category: constants.ListingCategory.Vehicle,
    price: 10000,
    currency: 'EUR',
    negotiable: false,
    city: 'Chisinau',
    status: 'Active',
    user_id: 'u1',
    vehicle_id: vehicle.id,
    vehicle,
    description: null,
    description_ro: 'RO text',
    description_ru: 'RU text',
    registration_type: 'Local',
    equipment: ['abs', 'esp'],
    condition: 'Good',
    is_new: false,
    last_updated_at: new Date('2025-01-02T00:00:00.000Z'),
    ...overrides,
  } as Listing;
}

describe('listing-ai-report-snapshot', () => {
  it('stable hash for same listing data', () => {
    const a = buildListingAiInputSnapshot(baseListing(), 'ru');
    const b = buildListingAiInputSnapshot(baseListing(), 'ru');
    expect(computeListingAiInputHash(a)).toBe(computeListingAiInputHash(b));
  });

  it('hash changes when price changes', () => {
    const h1 = computeListingAiInputHash(buildListingAiInputSnapshot(baseListing(), 'ro'));
    const h2 = computeListingAiInputHash(
      buildListingAiInputSnapshot(baseListing({ price: 9999 }), 'ro'),
    );
    expect(h1).not.toBe(h2);
  });

  it('equipment order does not change hash', () => {
    const h1 = computeListingAiInputHash(
      buildListingAiInputSnapshot(baseListing({ equipment: ['esp', 'abs'] }), 'ro'),
    );
    const h2 = computeListingAiInputHash(
      buildListingAiInputSnapshot(baseListing({ equipment: ['abs', 'esp'] }), 'ro'),
    );
    expect(h1).toBe(h2);
  });

  it('isVehicleListingForAiReport', () => {
    expect(isVehicleListingForAiReport(baseListing())).toBe(true);
    expect(
      isVehicleListingForAiReport(baseListing({ category: constants.ListingCategory.Tire })),
    ).toBe(false);
  });

  it('includes report schema version and media metadata', () => {
    const snapshot = buildListingAiInputSnapshot(
      baseListing({
        images: ['a.jpg', 'b.jpg'],
        vin: 'WVWZZZ1JZXW000001',
        video: { status: 'published' },
      }),
      'ru',
    );
    expect(snapshot.reportSchemaVersion).toBe(7);
    expect(snapshot.images_count).toBe(2);
    expect(snapshot.has_video).toBe(true);
    expect(snapshot.vin_present).toBe(true);
    expect(snapshot.data_completeness.filled_fields).toContain('description');
    expect(snapshot.data_completeness.filled_fields).toContain('photos');
    expect(snapshot.data_completeness.important_missing_fields).not.toContain('video');
    expect(snapshot.data_completeness.score_hint).toBeGreaterThan(0);
    expect(snapshot.data_completeness.completeness_percent).toBeGreaterThan(0);
  });

  it('tracks missing fields in data completeness', () => {
    const snapshot = buildListingAiInputSnapshot(
      baseListing({
        description: null,
        description_ro: null,
        description_ru: null,
        vin: null,
        images: [],
        registration_type: null,
      }),
      'ru',
    );
    expect(snapshot.data_completeness.missing_fields).toEqual(
      expect.arrayContaining(['description', 'vin', 'photos', 'registration_type']),
    );
    expect(snapshot.data_completeness.important_missing_fields).toEqual(
      expect.arrayContaining(['description', 'photos', 'registration_type']),
    );
    expect(snapshot.data_completeness.optional_missing_fields).toContain('vin');
  });
});
