import type { ConditionType, Currency, ListingStatus, RegistrationType } from '@/lib/types';

export interface ListingFormData {
  price: string;
  currency: Currency;
  city: string;
  negotiable: boolean;
  available_in_credit: boolean;
  down_payment_amount: string;
  description: string;
  status: ListingStatus;
  images: string[];
  cover_blur_hash: string;
  image_blur_hashes: (string | null)[];
  urgent: boolean;
  is_new: boolean;
  vin: string;
  condition: ConditionType;
  registration_type: RegistrationType;
  horsepower: string;
  power_kw: string;
  equipment: string[];
  vehicle: {
    brand_id: string;
    model_id: string;
    year: string;
    engine_displ_l: string;
    mileage_km: string;
    fuel: string;
    transmission: string;
    drive_type: string;
    body_type: string;
    color: string;
    doors: string;
  };
  assignedUserId: string;
}

export type ListingFormImageFields = Pick<
  ListingFormData,
  'images' | 'cover_blur_hash' | 'image_blur_hashes'
>;
