import type { Listing } from '../../../../listings/entities/listing.entity';
import type { Vehicle } from '../../../../listings/entities/vehicle.entity';
import type { ParsedPdpData } from '../listing-types';
import { PARTNER_SOURCE_CODE_999MD } from '../partner-source-codes';

import { find999DuplicateBeforeCreate } from './user-listing-dedupe-999';

function listingStub(partial: Partial<Listing> & { vehicle: Vehicle }): Listing {
  return partial as Listing;
}

describe('find999DuplicateBeforeCreate', () => {
  const parsed: ParsedPdpData = {
    sourceListingId: 'x',
    sourceUrl: 'https://x',
    canonicalUrl: 'https://x',
    sourceStatus: 'active',
    creditAvailable: false,
    title: 't',
    brand: 'B',
    model: 'M',
    year: 2020,
    mileageKm: 10000,
    price: 5000,
    currency: 'MDL',
    fuelRaw: 'x',
    gearboxRaw: 'x',
    bodyRaw: 'x',
    colorRaw: 'x',
    images: ['a', 'b'],
    equipmentOptions: [],
    equipmentKeys: [],
    warnings: [],
    description: '',
  };

  it('matches partner key first', () => {
    const hit = listingStub({
      id: 'hit-id',
      partner_source_code: PARTNER_SOURCE_CODE_999MD,
      partner_listing_external_key: '99942',
      price: 1,
      currency: 'MDL',
      images: [],
      vehicle: {
        brand_id: 'b-other',
        model_id: 'm-other',
        year: 1999,
        mileage_km: 1,
        fuel: 'Petrol',
        color: 'Black',
        engine_displ_l: 2,
      } as Vehicle,
    });
    const r = find999DuplicateBeforeCreate({
      sourceListingId: '99942',
      listings: [hit],
      parsed,
      resolvedBrandId: 'b1',
      resolvedModelId: 'm1',
      fuel: 'Diesel',
      color: 'White',
      priceTolerancePct: 0,
      photoCountTolerance: 1,
    });
    expect(r.kind).toBe('duplicate');
    if (r.kind === 'duplicate') {
      expect(r.layer).toBe('partner_key');
      expect(r.listing.id).toBe('hit-id');
    }
  });

  it('returns none when no match', () => {
    const r = find999DuplicateBeforeCreate({
      sourceListingId: '99999',
      listings: [],
      parsed,
      resolvedBrandId: 'b1',
      resolvedModelId: 'm1',
      fuel: 'Petrol',
      color: 'Black',
      priceTolerancePct: 0,
      photoCountTolerance: 1,
    });
    expect(r.kind).toBe('none');
  });
});
