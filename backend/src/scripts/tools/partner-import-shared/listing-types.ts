import type {
  BodyType,
  ConditionType,
  Currency,
  FuelType,
  ListingStatus,
  RegistrationType,
  TransmissionType,
} from '../../../common/types';

export interface ParsedPlpItem {
  sourceListingId: string;
  url: string;
  canonicalUrl: string;
  title?: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  currency?: string;
}

export interface ParsedPdpData {
  sourceListingId: string;
  sourceUrl: string;
  canonicalUrl: string;
  sourcePostId?: string;
  title?: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  currency?: Currency;
  description?: string;
  creditAvailable: boolean;
  downPaymentAmount?: number;
  monthlyPayment?: number;
  creditPeriodMonths?: number;
  images: string[];
  trimRaw?: string;
  equipmentOptions: ParsedPdpEquipmentOption[];
  equipmentKeys: string[];
  mileageKm?: number;
  engineVolumeL?: number;
  horsepowerFromPdp?: number;
  fuelRaw?: string;
  gearboxRaw?: string;
  driveTypeRaw?: string;
  bodyRaw?: string;
  colorRaw?: string;
  city?: string;
  doors?: number;
  vin?: string;
  condition?: ConditionType;
  warnings: string[];
}

export interface ParsedPdpEquipmentOption {
  slug?: string;
  label: string;
}

export interface BrandInfo {
  id: string;
  name: string;
  name_normalized?: string | null;
}

export interface ModelInfo {
  id: string;
  name: string;
  name_normalized?: string | null;
  brand_id?: string;
}

export interface MappedVehicleEnums {
  fuel?: FuelType;
  transmission?: TransmissionType;
  bodyType: BodyType;
  driveType?: 'FWD' | 'RWD' | 'AWD';
  color?: string;
}

export interface BuildListingPayloadInput {
  parsed: ParsedPdpData;
  ownerUserId: string;
  status: ListingStatus;
  city: string;
  registrationType: RegistrationType;
  defaultHorsepower: number;
  resolvedBrandId: string;
  resolvedModelId: string;
  mappedEnums: MappedVehicleEnums;
  horsepower: number;
}

export interface ImportFailedItem {
  sourceListingId: string;
  url: string;
  error: string;
}

export interface ImportManualReviewItem {
  sourceListingId: string;
  url: string;
  reason: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  type: string;
  email?: string | null;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

export type RefreshResponse = LoginResponse;

export interface UploadResult {
  url: string;
  path: string;
}

export interface KupitoCreateListingPayload {
  price: number;
  currency?: Currency;
  city: string;
  negotiable?: boolean;
  available_in_credit?: boolean;
  down_payment_amount?: number | null;
  description?: string;
  images: string[];
  status?: ListingStatus;
  condition: ConditionType;
  registration_type: RegistrationType;
  horsepower: number;
  power_kw?: number;
  equipment?: string[];
  assignedUserId: string;
  vin?: string;
  vehicle: {
    brand_id: string;
    model_id: string;
    year: number;
    engine_displ_l?: number;
    mileage_km?: number;
    fuel?: FuelType;
    transmission?: TransmissionType;
    drive_type?: 'FWD' | 'RWD' | 'AWD';
    body_type: BodyType;
    color?: string;
    doors?: number;
  };
}

export interface KupitoListingResponse {
  id: string;
  status: ListingStatus;
}
