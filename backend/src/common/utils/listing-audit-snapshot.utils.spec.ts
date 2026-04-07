import { Listing } from '../../listings/entities/listing.entity';

import {
  buildListingAuditSnapshot,
  diffListingAuditSnapshots,
  maskVinForLog,
} from './listing-audit-snapshot.utils';

describe('listing-audit-snapshot.utils', () => {
  describe('maskVinForLog', () => {
    it('returns null for empty input', () => {
      expect(maskVinForLog(null)).toBeNull();
      expect(maskVinForLog('')).toBeNull();
    });

    it('masks VIN to last four characters', () => {
      expect(maskVinForLog('WBA3A5G59CNP12345')).toBe('****2345');
    });
  });

  describe('diffListingAuditSnapshots', () => {
    it('returns empty array when snapshots match', () => {
      const s = { price: 1, city: 'x' };
      expect(diffListingAuditSnapshots(s, { ...s })).toEqual([]);
    });

    it('returns sorted field changes', () => {
      const before = { a: 1, b: 2, c: 3 };
      const after = { a: 1, b: 9, c: 3 };
      expect(diffListingAuditSnapshots(before, after)).toEqual([
        { field: 'b', before: 2, after: 9 },
      ]);
    });
  });

  describe('buildListingAuditSnapshot', () => {
    it('maps description to length and preview without raw HTML', () => {
      const listing = {
        category: 'vehicle',
        price: 1000,
        currency: 'EUR',
        city: 'X',
        negotiable: false,
        available_in_credit: false,
        down_payment_amount: null,
        description: '<p>Hello</p>',
        description_ro: null,
        description_ru: null,
        images: null,
        title: 't',
        urgent: false,
        is_new: false,
        vin: null,
        condition: null,
        registration_type: null,
        horsepower: null,
        power_kw: null,
        equipment: null,
        image_blur_hashes: null,
        cover_blur_hash: null,
        tire: null,
        vehicle: {
          brand_id: 'b',
          model_id: 'm',
          year: 2020,
          engine_displ_l: 2,
          mileage_km: 10,
          fuel: 'Petrol',
          transmission: 'Manual',
          drive_type: null,
          body_type: 'Sedan',
          color: 'Black',
          doors: 4,
        },
      } as Listing;
      const snap = buildListingAuditSnapshot(listing);
      expect(snap.description).toEqual({ length: 5, preview: 'Hello' });
    });
  });
});
