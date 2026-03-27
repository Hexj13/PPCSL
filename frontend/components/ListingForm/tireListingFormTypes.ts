import type { TireTread } from '@/lib/tire-tread';
import type { Currency, ListingStatus } from '@/lib/types';

export type TireSeason = TireTread;
export type TireCondition = 'new' | 'used' | 'retreaded';

export interface TireListingFormData {
  tire_vehicle_type: 'car' | 'truck' | 'moto';
  brand_id: string;
  model_id: string;
  season: TireSeason;
  condition: TireCondition;
  width_mm: string;
  aspect_ratio: string;
  diameter_inch: string;
  quantity: string;
  load_index: string;
  speed_index: string;
  studded: boolean;
  run_flat: boolean;
  reinforced_xl: boolean;
  spare_donut: boolean;
  tubeless: boolean;
  acoustic: boolean;
  price: string;
  currency: Currency;
  city: string;
  negotiable: boolean;
  description: string;
  status: ListingStatus;
  images: string[];
  cover_blur_hash: string;
  image_blur_hashes: (string | null)[];
  urgent: boolean;
  assignedUserId: string;
}
