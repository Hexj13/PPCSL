import type { Locale } from '../i18n-types';
import type { ListingStatus, UserType } from '../types';

import type { Listing, User } from './api-types';

export interface RegisterDto {
  email?: string;
  password: string;
  type: Extract<UserType, 'Individual' | 'Business'>;
  phone: string;
  smsVerificationCode?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  termsAccepted: boolean;
  emailNotifications?: boolean;
  viber?: boolean;
  whatsapp?: boolean;
  telegram?: boolean;
}

export interface LoginDto {
  login: string;
  password: string;
}

export interface ChangePasswordDto {
  currentPassword?: string;
  newPassword: string;
}

export interface MyListingsStatusCounts {
  Active: number;
  Paused: number;
  Closed: number;
  Promoted: number;
}

export interface PaginationMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  activeTotal?: number;
  inactiveTotal?: number;
  totalAll?: number;
  last_listing_refresh_at?: string | null;
  refreshCooldownMs?: number;
}

export interface PaginatedResponse<T, M extends PaginationMeta = PaginationMeta> {
  data: T[];
  meta: M;
}

export interface PromotionHistory {
  id: string;
  listing_id: string;
  user_id: string;
  listing_title: string;
  started_at: string;
  ended_at: string | null;
  days: number | null;
  created_at: string;
  listing_status?: ListingStatus;
  promotion_source?: 'duration' | 'partner_balance' | 'admin_unlimited';
}

export interface PromotionAccessStatus {
  access: 'disabled' | 'admin' | 'all';
  enabled: boolean;
  isAdmin: boolean;
  canPromote: boolean;
  isPartner: boolean;
  freePromotionBalance: number;
  partnerListingProgress: number;
  listingsUntilNextFreePromotion: number | null;
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
  isPlatformPartner: boolean;
}

export interface VerifySmsDto {
  code: string;
  phone: string;
}

export interface VerifyEmailDto {
  token: string;
}

export interface ResendEmailVerificationDto {
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
  phone?: string;
  additionalPhone?: string | null;
  emailNotifications?: boolean;
  emailNotificationListingRefreshReminders?: boolean;
  emailNotificationWeeklyViewsDigest?: boolean;
  emailNotificationSecurityAlerts?: boolean;
  viber?: boolean;
  whatsapp?: boolean;
  telegram?: boolean;
  preferredLocale?: Locale;
  type?: 'Individual' | 'Business';
}

export interface ChangePhoneRequestDto {
  phone: string;
}

export interface ChangeEmailRequestDto {
  newEmail: string;
}

export interface ChangeEmailConfirmDto {
  token: string;
}

export interface ChangePhoneVerifyDto {
  phone: string;
  code: string;
}

export interface RefreshTokenDto {
  refresh_token?: string;
}

export interface LoginResponse {
  user: User;
}

export interface GoogleSignInDto {
  idToken: string;
  type?: 'Individual' | 'Business';
  termsAccepted?: boolean;
}

export interface GoogleSignInResponse extends LoginResponse {
  requiresPhoneVerification: boolean;
  isNewUser: boolean;
}

export interface TelegramSignInDto {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
  type?: 'Individual' | 'Business';
  termsAccepted?: boolean;
}

export interface TelegramSignInResponse extends LoginResponse {
  requiresPhoneVerification: boolean;
  isNewUser: boolean;
}

export interface DevTelegramSignInDto {
  type?: 'Individual' | 'Business';
  termsAccepted?: boolean;
}

export interface VerifyPhoneDto {
  code: string;
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
