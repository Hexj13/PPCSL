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
  availability: 'InStock',
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
    interior_color: '',
    doors: '4',
    seats: '',
    country_of_origin: '',
    owners_count: '',
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

    it('clears optional vehicle fields to null when empty on edit', () => {
      const formData: ListingFormData = {
        ...baseFormData,
        vehicle: {
          ...baseFormData.vehicle,
          color: '',
          interior_color: '',
          doors: '',
          seats: '',
          country_of_origin: '',
          owners_count: '',
        },
      };
      const payload = buildListingPayload(formData, 'car');
      const updatePayload = applyEditNullables(payload, formData, 'car');

      expect(updatePayload.vehicle?.color).toBeNull();
      expect(updatePayload.vehicle?.interior_color).toBeNull();
      expect(updatePayload.vehicle?.doors).toBeNull();
      expect(updatePayload.vehicle?.seats).toBeNull();
      expect(updatePayload.vehicle?.country_of_origin).toBeNull();
      expect(updatePayload.vehicle?.owners_count).toBeNull();
    });
  });

  describe('buildListingPayload', () => {
    it('includes availability default and optional vehicle fields when set', () => {
      const formData: ListingFormData = {
        ...baseFormData,
        availability: 'OnOrder',
        vehicle: {
          ...baseFormData.vehicle,
          interior_color: 'beige',
          seats: '5',
          country_of_origin: 'DE',
          owners_count: '2',
        },
      };
      const payload = buildListingPayload(formData, 'car');

      expect(payload.availability).toBe('OnOrder');
      expect(payload.vehicle?.interior_color).toBe('beige');
      expect(payload.vehicle?.seats).toBe(5);
      expect(payload.vehicle?.country_of_origin).toBe('DE');
      expect(payload.vehicle?.owners_count).toBe(2);
    });

    it('omits empty optional vehicle fields on create', () => {
      const payload = buildListingPayload(baseFormData, 'car');
      expect(payload.availability).toBe('InStock');
      expect(payload.vehicle?.interior_color).toBeUndefined();
      expect(payload.vehicle?.seats).toBeUndefined();
      expect(payload.vehicle?.country_of_origin).toBeUndefined();
      expect(payload.vehicle?.owners_count).toBeUndefined();
    });

    it('omits availability when empty', () => {
      const payload = buildListingPayload({ ...baseFormData, availability: '' }, 'car');
      expect(payload.availability).toBeUndefined();
    });
  });
});
