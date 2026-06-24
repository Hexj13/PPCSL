import { Currency } from '@/lib/constants';

import type { ListingFormData } from './listingFormTypes';
import {
  applyEditNullables,
  buildListingPayload,
  stripCreateOnlyListingFields,
} from './submitHelpers';

const baseFormData: ListingFormData = {
  price: '10000',
  currency: Currency.EUR,
  city: 'Chișinău',
  negotiable: false,
  available_in_credit: false,
  down_payment_amount: '',
  description_ro: 'Test description',
  description_ru: '',
  status: 'Active',
  images: [
    'http://localhost:4000/uploads/image1.webp',
    'http://localhost:4000/uploads/image2.webp',
  ],
  cover_blur_hash: '',
  image_blur_hashes: [],
  urgent: false,
  is_new: false,
  vin: '1HGBH41JXMN109186',
  condition: 'Undamaged',
  registration_type: 'Local',
  horsepower: '150',
  power_kw: '',
  equipment: [],
  assignedUserId: 'user-2',
  vehicle: {
    brand_id: 'brand-1',
    model_id: 'model-1',
    year: '2020',
    engine_displ_l: '2.0',
    mileage_km: '50000',
    fuel: 'Petrol',
    transmission: 'Manual',
    drive_type: 'FWD',
    body_type: 'Sedan',
    color: 'black',
    doors: '4',
  },
};

describe('submitHelpers', () => {
  describe('stripCreateOnlyListingFields', () => {
    it('removes create-only fields from update payload', () => {
      const payload = {
        price: 10000,
        city: 'Chișinău',
        status: 'Active',
        assignedUserId: 'user-2',
        stagedVideoToken: 'token-1',
      };

      const updatePayload = stripCreateOnlyListingFields(payload);

      expect(updatePayload).toEqual({
        price: 10000,
        city: 'Chișinău',
      });
    });
  });

  describe('applyEditNullables', () => {
    it('strips create-only fields from vehicle edit payload', () => {
      const payload = buildListingPayload(baseFormData, 'car');
      const updatePayload = applyEditNullables(payload, baseFormData, 'car');

      expect(updatePayload).not.toHaveProperty('status');
      expect(updatePayload).not.toHaveProperty('assignedUserId');
      expect(updatePayload).not.toHaveProperty('stagedVideoToken');
      expect(updatePayload.price).toBe(10000);
      expect(updatePayload.vehicle?.brand_id).toBe('brand-1');
    });
  });
});
