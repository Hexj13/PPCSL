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
  sourceStatus: 'active' | 'closed';
  sourceStatusReason?: string;
  sourcePostId?: string;
  title?: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  currency?: Currency;
  description?: string;
  description_ro?: string;
  description_ru?: string;
  creditAvailable: boolean;
  downPaymentAmount?: number;
  monthlyPayment?: number;
  creditPeriodMonths?: number;
  images: string[];
  videoUrl?: string;
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

export type RegistryImportState =
  | 'discovered'
  | 'pdp_parsed'
  | 'created'
  | 'updated'
  | 'closed'
  | 'failed'
  | 'skipped'
  | 'manual_review'
  | 'duplicate_skipped';

export type SourceStatus = 'active' | 'missing_candidate' | 'closed';

export type SourceCloseReason =
  | 'plp_missing_candidate'
  | 'pdp_closed_template'
  | 'pdp_http_404'
  | 'pdp_http_410'
  | 'graphql_advert_null'
  | 'graphql_is_expired'
  | 'graphql_ad_state_removed'
  | 'graphql_ad_state_blocked'
  | 'graphql_ad_state_need_pay'
  | 'graphql_ad_state_hidden'
  | 'graphql_ad_state_draft'
  | 'graphql_ad_state_pre_moderation'
  | 'graphql_ad_state_unspecified';

export type SourceCloseOutcome = 'listing_closed' | 'source_only';

export interface BaseRegistryItem<TSource extends string> {
  source: TSource;
  sourceListingId: string;
  sourcePostId?: string;
  url: string;
  canonicalUrl: string;
  sourceStatus?: SourceStatus;
  title?: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  currency?: string;
  parsedData?: ParsedPdpData;
  state: RegistryImportState;
  kupitoListingId?: string;
  ownerUserId?: string;
  createdStatus?: ListingStatus;
  imageCount?: number;
  imageFailures?: number;
  error?: string;
  warnings?: string[];
  retryCount?: number;
  lastSeenAt?: string;
  lastImportedAt?: string;
  missingSince?: string;
  missingCount?: number;
  closedAt?: string;
  closeReason?: SourceCloseReason;
  closeOutcome?: SourceCloseOutcome;
  discoveredAt: string;
  updatedAt: string;
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

export type PartnerImportVehicleType = 'car' | 'truck' | 'moto';

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
  vehicleType?: PartnerImportVehicleType;
  imageBlurHashes?: (string | null)[];
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
  blurhash?: string | null;
}

export interface KupitoCreateListingPayload {
  price: number;
  currency?: Currency;
  partner_source_code?: string;
  partner_listing_external_key?: string;
  partner_listing_canonical_url?: string;
  city: string;
  negotiable?: boolean;
  available_in_credit?: boolean;
  down_payment_amount?: number | null;
  description?: string;
  description_ro?: string;
  description_ru?: string;
  images: string[];
  image_blur_hashes?: (string | null)[];
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
