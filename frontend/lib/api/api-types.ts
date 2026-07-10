import type { Locale } from '../i18n-types';
import type { TireTread } from '../tire-tread';
import type {
  BodyType,
  ConditionType,
  Currency,
  DriveType,
  FuelType,
  ListingStatus,
  RegistrationType,
  TransmissionType,
  UserType,
} from '../types';

export type ListingCategory = 'vehicle' | 'tire';

export type ListingAiQualityScoreCriterionKey =
  | 'dataCompleteness'
  | 'mediaQuality'
  | 'descriptionQuality'
  | 'priceAdequacy'
  | 'safeChoice';

export type ListingAiVehicleScoreCriterionKey =
  | 'mileage'
  | 'equipment'
  | 'reliability'
  | 'liquidity'
  | 'popularity';

export interface ListingAiScoreItem {
  label: string;
  score: number;
  summary: string;
}

export type ListingAiQualityScoreItems = Record<
  ListingAiQualityScoreCriterionKey,
  ListingAiScoreItem
>;

export type ListingAiVehicleScoreItems = Record<
  ListingAiVehicleScoreCriterionKey,
  ListingAiScoreItem
>;

export interface ListingAiQualityScore {
  overallScore: number;
  summary: string;
  items: ListingAiQualityScoreItems;
}

export interface ListingAiVehicleScore {
  overallScore: number;
  summary: string;
  items: ListingAiVehicleScoreItems;
}

export interface ListingAiReportPayload {
  modelContext: string[];
  summary: string;
  strengths: string[];
  weaknesses: string[];
  buyingChecks: string[];
  questionsForSeller: string[];
  redFlags: string[];
  confidence: number;
  disclaimer: string;
  qualityScore?: ListingAiQualityScore;
  vehicleScore?: ListingAiVehicleScore;
}

export type ListingAiReportPostResponse =
  | { status: 'ready'; report: ListingAiReportPayload }
  | { status: 'pending' }
  | { status: 'unavailable'; message: string }
  | { status: 'rate_limited'; message: string };

export interface TireOnListing {
  id: string;
  brand_id: string;
  model_id: string | null;
  brand?: {
    id: string;
    name: string;
    logoUrl?: string | null;
    order?: number;
  };
  model?: {
    id: string;
    brand_id?: string;
    name: string;
    order?: number;
    is_other?: boolean;
  };
  tire_vehicle_type: 'car' | 'truck' | 'moto';
  season: TireTread;
  condition: 'new' | 'used' | 'retreaded';
  width_mm: number;
  aspect_ratio: number;
  diameter_inch: number;
  quantity: number;
  load_index?: string | null;
  speed_index?: string | null;
  dot_year?: number | null;
  tread_depth_mm?: number | null;
  studded?: boolean | null;
  run_flat?: boolean | null;
  reinforced_xl?: boolean | null;
  spare_donut?: boolean | null;
  tubeless?: boolean | null;
  acoustic?: boolean | null;
}

export interface Listing {
  id: string;
  slug?: string | null;
  title: string;
  category?: ListingCategory;
  price?: number;
  currency?: Currency;
  city: string;
  negotiable?: boolean;
  available_in_credit?: boolean;
  down_payment_amount?: number | null;
  status: ListingStatus;
  description?: string;
  description_ro?: string | null;
  description_ru?: string | null;
  images?: string[];
  cover_blur_hash?: string | null;
  image_blur_hashes?: (string | null)[] | null;
  urgent?: boolean;
  is_new?: boolean;
  vin?: string;
  condition?: ConditionType | null;
  registration_type?: RegistrationType | null;
  horsepower?: number | null;
  power_kw?: number;
  views?: number;
  equipment?: string[];
  vehicle?: Vehicle | null;
  tire?: TireOnListing | null;
  user?: User;
  last_updated_at: string;
  last_edited_at?: string;
  last_published_at?: string;
  closed_at?: string;
  is_promoted?: boolean;
  promoted_until?: string | null;
  promoted_started_at?: string | null;
  promoted_paused_at?: string | null;
  created_at: string;
  updated_at: string;
  approxPriceDefaultCurrency?: number | null;
  defaultCurrencyCode?: string;
  partnerReward?: {
    awardedPromotions: number;
    freePromotionBalance: number;
    partnerListingProgress: number;
  };
  has_video?: boolean;
  video?: ListingVideoPayload | null;
}

export interface ListingVideoPayload {
  status: string;
  webmUrl?: string | null;
  mp4Url?: string | null;
  thumbUrl?: string | null;
  durationSec?: number | null;
  error?: string | null;
  jobId?: string | null;
  uploadedAt?: string | null;
}

export interface ListingVideoConstraints {
  maxFileSizeBytes: number;
  maxDurationSec: number;
  partSizeBytes: number;
  allowedContentTypes: string[];
}

export interface ListingVideoUploadInitResponse {
  uploadId: string;
  key: string;
  partCount: number;
  parts: { partNumber: number; url: string }[];
  maxFileSizeBytes: number;
  maxDurationSec: number;
  partSizeBytes: number;
  allowedContentTypes: string[];
}

export interface StagedListingVideoUploadInitResponse extends ListingVideoUploadInitResponse {
  stagedVideoToken: string;
}

export interface StagedListingVideoStatusResponse {
  status: 'pending' | 'processing' | 'published' | 'failed';
  progress: number | null;
  stagedVideoToken: string;
  video?: ListingVideoPayload | null;
}

export interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
  order: number;
  vehicle_types?: ('car' | 'truck' | 'moto')[];
}

export interface VehicleModel {
  id: string;
  name: string;
  brand_id: string;
  order: number;
  vehicle_types?: ('car' | 'truck' | 'moto')[];
  brand?: Brand;
}

export interface Vehicle {
  id: string;
  brand_id: string;
  model_id: string;
  brand?: Brand;
  model?: VehicleModel;
  year: number;
  engine_displ_l?: number;
  mileage_km?: number;
  fuel?: FuelType;
  transmission?: TransmissionType;
  drive_type: DriveType;
  body_type: BodyType;
  color?: string;
  doors?: number;
}

export interface User {
  id: string;
  email: string | null;
  type: UserType;
  phone?: string;
  additionalPhone?: string | null;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  companyWebsiteUrl?: string;
  boardSlug?: string;
  active?: boolean;
  listings?: Listing[];
  listingCountTotal?: number;
  listingCountActive?: number;
  created_at?: string;
  last_login_at?: string | null;
  emailNotifications?: boolean;
  emailNotificationListingRefreshReminders?: boolean;
  emailNotificationWeeklyViewsDigest?: boolean;
  emailNotificationSecurityAlerts?: boolean;
  viber?: boolean;
  whatsapp?: boolean;
  telegram?: boolean;
  preferredLocale?: Locale | null;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  isPlatformPartner?: boolean;
  freePromotionBalance?: number;
  partnerListingProgress?: number;
  hidePartnerPromoBanner?: boolean;
  hasPassword?: boolean;
}

export interface RegisterResponse extends User {
  emailVerificationSent: boolean;
}

export interface UpdateProfileResponse extends User {
  emailVerificationSent?: boolean;
}

export interface AdminUpdateUserProfileResponse {
  user: User;
  emailConfirmationSent: boolean;
}

export interface SearchParams {
  category?: string;
  vehicleType?: 'car' | 'truck' | 'moto';
  tireVehicleType?: 'car' | 'truck' | 'moto';
  tire_brand_ids?: string;
  tire_model_ids?: string;
  tire_widths?: string;
  tire_profiles?: string;
  tire_diameters?: string;
  tire_seasons?: string;
  tire_conditions?: string;
  tire_quantities?: string;
  tire_studded?: boolean;
  tire_run_flat?: boolean;
  tire_reinforced_xl?: boolean;
  tire_spare_donut?: boolean;
  tire_tubeless?: boolean;
  tire_acoustic?: boolean;
  brand_id?: string;
  brand_ids?: string[];
  model_id?: string;
  model_ids?: string[];
  year_gte?: number;
  year_lte?: number;
  price_gte?: number;
  price_lte?: number;
  mileage_gte?: number;
  mileage_lte?: number;
  city?: string;
  cities?: string[];
  fuel?: string;
  fuels?: string[];
  transmission?: string;
  transmissions?: string[];
  body_type?: string;
  body_types?: string[];
  engine_displ_l_gte?: number;
  engine_displ_l_lte?: number;
  color?: string;
  colors?: string[];
  doors?: string[];
  doors_single?: number;
  currency?: Currency;
  title?: string;
  urgent?: boolean;
  is_new?: boolean;
  conditions?: string[];
  registration_types?: string[];
  horsepower_gte?: number;
  horsepower_lte?: number;
  drive_types?: string[];
  seller_type?: 'Individual' | 'Business';
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateTireDtoPayload {
  brand_id: string;
  model_id?: string;
  tire_vehicle_type: 'car' | 'truck' | 'moto';
  season: TireTread;
  condition: 'new' | 'used' | 'retreaded';
  width_mm: number;
  aspect_ratio: number;
  diameter_inch: number;
  quantity: number;
  load_index?: string;
  speed_index?: string;
  studded?: boolean;
  run_flat?: boolean;
  reinforced_xl?: boolean;
  spare_donut?: boolean;
  tubeless?: boolean;
  acoustic?: boolean;
}

export interface CreateListingDto {
  category?: ListingCategory;
  title?: string;
  price: number;
  currency?: Currency;
  city: string;
  negotiable?: boolean;
  available_in_credit?: boolean;
  down_payment_amount?: number;
  description?: string;
  description_ro?: string;
  description_ru?: string;
  images?: string[];
  cover_blur_hash?: string;
  image_blur_hashes?: (string | null)[];
  status?: ListingStatus;
  urgent?: boolean;
  is_new?: boolean;
  vin?: string;
  condition?: ConditionType;
  registration_type?: RegistrationType;
  horsepower?: number;
  power_kw?: number;
  equipment?: string[];
  vehicle?: {
    brand_id: string;
    model_id: string;
    year: number;
    engine_displ_l?: number;
    mileage_km?: number;
    fuel?: FuelType;
    transmission?: TransmissionType;
    drive_type?: DriveType;
    body_type: BodyType;
    color?: string;
    doors?: number;
  };
  tire?: CreateTireDtoPayload;
  assignedUserId?: string;
  stagedVideoToken?: string;
}

export type UpdateListingDto = Omit<
  Partial<CreateListingDto>,
  | 'down_payment_amount'
  | 'vin'
  | 'description'
  | 'description_ro'
  | 'description_ru'
  | 'power_kw'
  | 'equipment'
  | 'vehicle'
  | 'tire'
  | 'status'
  | 'assignedUserId'
  | 'stagedVideoToken'
> & {
  vin?: string | null;
  description?: string | null;
  description_ro?: string | null;
  description_ru?: string | null;
  power_kw?: number | null;
  equipment?: string[] | null;
  vehicle?: Omit<
    Partial<NonNullable<CreateListingDto['vehicle']>>,
    'engine_displ_l' | 'mileage_km' | 'fuel' | 'transmission' | 'drive_type' | 'color' | 'doors'
  > & {
    engine_displ_l?: number | null;
    mileage_km?: number | null;
    fuel?: NonNullable<CreateListingDto['vehicle']>['fuel'] | null;
    transmission?: NonNullable<CreateListingDto['vehicle']>['transmission'] | null;
    drive_type?: NonNullable<CreateListingDto['vehicle']>['drive_type'] | null;
    color?: string | null;
    doors?: number | null;
  };
  tire?: Partial<Omit<CreateTireDtoPayload, 'model_id'>> & {
    model_id?: string | null;
  };
  down_payment_amount?: number | null;
};

export type PopularBodyTypeCar =
  | 'Hatchback'
  | 'Wagon'
  | 'SUV'
  | 'Minivan'
  | 'Sedan'
  | 'Convertible';

export type PopularModelItem = {
  brandId: string;
  brandName: string;
  modelId: string;
  modelName: string;
  listingCount: number;
};

export type PopularStatItem = {
  key: string;
  label: string;
  count: number;
};

export type PopularStatBucket = {
  items: PopularStatItem[];
  otherCount: number;
  total: number;
};

export type PopularListingsData = {
  generatedAt: string;
  modelsByBodyType: Record<PopularBodyTypeCar, PopularModelItem[]>;
  brandListingCounts: Record<string, number>;
  statistics: {
    brands: PopularStatBucket;
    bodyTypes: PopularStatBucket;
    fuels: PopularStatBucket;
  };
};

export * from './api-auth-dtos';
