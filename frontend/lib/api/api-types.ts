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

export interface Listing {
  id: string;
  title: string;
  price?: number;
  currency?: Currency;
  city: string;
  negotiable?: boolean;
  available_in_credit?: boolean;
  down_payment_amount?: number | null;
  status: ListingStatus;
  description?: string;
  images?: string[];
  urgent?: boolean;
  is_new?: boolean;
  vin?: string;
  condition: ConditionType;
  registration_type: RegistrationType;
  horsepower: number;
  power_kw?: number;
  views?: number;
  equipment?: string[];
  vehicle?: Vehicle;
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
  email: string;
  type: UserType;
  phone?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  companyWebsiteUrl?: string;
  boardSlug?: string;
  active?: boolean;
  listings?: Listing[];
  created_at?: string;
  emailNotifications?: boolean;
  viber?: boolean;
  whatsapp?: boolean;
  telegram?: boolean;
  phoneVerified?: boolean;
  emailVerified?: boolean;
}

export interface SearchParams {
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
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateListingDto {
  title?: string;
  price: number;
  currency?: Currency;
  city: string;
  negotiable?: boolean;
  available_in_credit?: boolean;
  down_payment_amount?: number;
  description?: string;
  images?: string[];
  status?: ListingStatus;
  urgent?: boolean;
  is_new?: boolean;
  vin?: string;
  condition: ConditionType;
  registration_type: RegistrationType;
  horsepower: number;
  power_kw?: number;
  equipment?: string[];
  vehicle: {
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
  assignedUserId?: string;
}

export type UpdateListingDto = Omit<
  Partial<CreateListingDto>,
  'down_payment_amount' | 'vin' | 'description' | 'power_kw' | 'equipment' | 'vehicle'
> & {
  vin?: string | null;
  description?: string | null;
  power_kw?: number | null;
  equipment?: string[] | null;
  vehicle?: Omit<
    Partial<CreateListingDto['vehicle']>,
    'engine_displ_l' | 'mileage_km' | 'fuel' | 'transmission' | 'drive_type' | 'color' | 'doors'
  > & {
    engine_displ_l?: number | null;
    mileage_km?: number | null;
    fuel?: CreateListingDto['vehicle']['fuel'] | null;
    transmission?: CreateListingDto['vehicle']['transmission'] | null;
    drive_type?: CreateListingDto['vehicle']['drive_type'] | null;
    color?: string | null;
    doors?: number | null;
  };
  down_payment_amount?: number | null;
};

export interface RegisterDto {
  email?: string;
  password: string;
  type: Extract<UserType, 'Individual' | 'Business'>;
  phone: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  termsAccepted: boolean;
  emailNotifications?: boolean;
}

export interface LoginDto {
  login: string;
  password: string;
}

export interface PaginationMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  last_listing_refresh_at?: string | null;
  refreshCooldownMs?: number;
}

export interface PromotionHistory {
  id: string;
  listing_id: string;
  user_id: string;
  listing_title: string;
  started_at: string;
  ended_at: string | null;
  days: number;
  created_at: string;
  listing_status?: ListingStatus;
}

export interface AdminStats {
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  listings: {
    total: number;
    active: number;
    paused: number;
    closed: number;
  };
}

export interface BoardInfo {
  userId: string;
  displayName: string;
  boardSlug: string;
}

export interface VerifySmsDto {
  code: string;
  phone: string;
}

export interface VerifyEmailDto {
  token: string;
}

export interface SendSmsDto {
  phone: string;
}

export interface RequestPasswordResetDto {
  phone: string;
}

export interface VerifyResetCodeDto {
  phone: string;
  code: string;
}

export interface ResetPasswordDto {
  phone: string;
  code: string;
  newPassword: string;
}

export interface UpdateProfileDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  companyWebsiteUrl?: string;
  emailNotifications?: boolean;
  viber?: boolean;
  whatsapp?: boolean;
  telegram?: boolean;
}

export interface ChangePhoneRequestDto {
  phone: string;
}

export interface ChangePhoneVerifyDto {
  phone: string;
  code: string;
}

export interface RefreshTokenDto {
  refresh_token: string;
}

export interface FavoriteItem {
  listing: Listing;
}

export interface City {
  name: string;
  nameEn: string;
  nameRu?: string;
}

export interface SavedFilter {
  id: string;
  user_id: string;
  name: string;
  filters: Record<string, unknown>;
  created_at: string;
}
