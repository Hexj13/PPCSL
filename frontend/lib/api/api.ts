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

import { adminBrandsModelsApi } from './admin-brands-models';
import { api } from './api-client';

export { api };

export interface Listing {
  id: string;
  title: string;
  price?: number;
  currency?: Currency;
  city: string;
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

export type UpdateListingDto = Omit<Partial<CreateListingDto>, 'down_payment_amount'> & {
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

export type {
  AdminBrand,
  AdminModel,
  CreateBrandPayload,
  UpdateBrandPayload,
  CreateModelPayload,
  UpdateModelPayload,
} from './admin-brands-models';

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

export const listingsApi = {
  getAll: (params?: SearchParams) =>
    api.get<{ data: Listing[]; meta: PaginationMeta }>('/api/listings', { params }),
  getOne: (id: string) => {
    const config: { params?: Record<string, unknown>; headers?: Record<string, string> } = {};
    if (process.env.NODE_ENV === 'development') {
      config.params = { _t: Date.now() };
      config.headers = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      };
    } else {
      config.headers = {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      };
    }
    return api.get<Listing>(`/api/listings/${id}`, config);
  },
  getUserActiveListings: (userId: string) =>
    api.get<Listing[]>(`/api/listings/user/${userId}/active`),
  getByVin: (vin: string, excludeId?: string) =>
    api.get<Listing[]>(`/api/listings/vin/${vin}`, { params: excludeId ? { excludeId } : {} }),
  create: (data: CreateListingDto) => api.post<Listing>('/api/listings', data),
  update: (id: string, data: UpdateListingDto) => api.patch<Listing>(`/api/listings/${id}`, data),
  publish: (id: string) => api.post(`/api/listings/${id}/publish`),
  pause: (id: string) => api.post(`/api/listings/${id}/pause`),
  close: (id: string) => api.post<Listing>(`/api/listings/${id}/close`),
  getMy: (page: number = 1, limit: number = 20, status?: string, promoted?: boolean) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    if (status) {
      params.set('status', status);
    }
    if (promoted !== undefined) {
      params.set('promoted', String(promoted));
    }
    const query = params.toString();
    return api.get<{ data: Listing[]; meta: PaginationMeta }>(`/api/listings/my?${query}`);
  },
  refreshDates: () => api.post<{ updated: number }>('/api/listings/refresh-dates'),
  togglePromotion: (id: string, isPromoted: boolean, days: number) =>
    api.patch(`/api/listings/${id}/promote`, { is_promoted: isPromoted, days }),
  getPromotionHistory: (page: number = 1, limit: number = 50) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    return api.get<{
      data: PromotionHistory[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`/api/listings/promotion-history?${params.toString()}`);
  },
  hasPromotionHistory: () =>
    api.get<{ hasHistory: boolean }>('/api/listings/promotion-history/check'),
  getPromotionAccess: () =>
    api.get<{
      access: 'disabled' | 'admin' | 'all';
      enabled: boolean;
      isAdmin: boolean;
      canPromote: boolean;
    }>('/api/listings/promotion-access'),
  getSimilar: (id: string, limit: number = 4, offset: number = 0) => {
    const params = new URLSearchParams();
    params.set('limit', limit.toString());
    params.set('offset', offset.toString());
    return api.get<Listing[]>(`/api/listings/${id}/similar?${params.toString()}`, {
      headers: {
        'X-Skip-Error-Handling': 'true',
      },
    });
  },
};

export interface BoardInfo {
  userId: string;
  displayName: string;
  boardSlug: string;
}

export const boardApi = {
  getBySlug: (slug: string) => api.get<BoardInfo>(`/api/board/${encodeURIComponent(slug)}`),
  getListings: (
    slug: string,
    params: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'ASC' | 'DESC' },
  ) => {
    const search = new URLSearchParams();
    if (params.page != null) search.set('page', params.page.toString());
    if (params.limit != null) search.set('limit', params.limit.toString());
    if (params.sortBy != null) search.set('sortBy', params.sortBy);
    if (params.sortOrder != null) search.set('sortOrder', params.sortOrder);
    const query = search.toString();
    return api.get<{ data: Listing[]; meta: PaginationMeta }>(
      `/api/board/${encodeURIComponent(slug)}/listings${query ? `?${query}` : ''}`,
    );
  },
};

export const uploadApi = {
  uploadImage: (file: File, hidePlates?: boolean) => {
    const formData = new FormData();
    formData.append('file', file);
    if (hidePlates !== undefined) {
      formData.append('hidePlates', String(hidePlates));
    }
    return api.post<{
      url: string;
      path: string;
      plateMaskResult?: string | null;
      deleteToken?: string | null;
    }>('/api/upload/image', formData, {
      headers: {
        'X-Skip-Error-Handling': 'true',
      },
    });
  },
  deleteImage: (path: string, deleteToken: string) =>
    api.delete<{ success: boolean }>('/api/upload/image', {
      data: { path, deleteToken },
      headers: {
        'X-Skip-Error-Handling': 'true',
      },
    }),
};

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

export const authApi = {
  register: (data: RegisterDto) => api.post('/api/auth/register', data),
  login: (data: LoginDto) =>
    api.post<{ access_token: string; refresh_token: string; user: User }>('/api/auth/login', data),
  refresh: (data: RefreshTokenDto) =>
    api.post<{ access_token: string; refresh_token: string; user: User }>(
      '/api/auth/refresh',
      data,
    ),
  me: () => api.get<User>('/api/auth/me'),
  updateProfile: (data: UpdateProfileDto) => api.patch<User>('/api/auth/profile', data),
  deleteAccount: () => api.delete<{ message: string }>('/api/auth/profile'),
  verifyPhone: () => api.post<User>('/api/auth/verify-phone'),
  sendSms: (data: SendSmsDto) =>
    api.post<{ success: boolean; message: string }>('/api/auth/send-sms', data, {
      headers: { 'X-Skip-Error-Handling': 'true' },
    }),
  verifySms: (data: VerifySmsDto) =>
    api.post<{ success: boolean; message: string }>('/api/auth/verify-sms', data, {
      headers: { 'X-Skip-Error-Handling': 'true' },
    }),
  verifyEmail: (data: VerifyEmailDto) =>
    api.post<{ success: boolean; message: string; user: User }>('/api/auth/verify-email', data),
  requestPasswordReset: (data: RequestPasswordResetDto) =>
    api.post<{ success: boolean; message: string }>('/api/auth/request-password-reset', data, {
      headers: { 'X-Skip-Error-Handling': 'true' },
    }),
  verifyResetCode: (data: VerifyResetCodeDto) =>
    api.post<{ success: boolean; message: string }>('/api/auth/verify-reset-code', data, {
      headers: { 'X-Skip-Error-Handling': 'true' },
    }),
  resetPassword: (data: ResetPasswordDto) =>
    api.post<{ success: boolean; message: string; user: User }>('/api/auth/reset-password', data),
  changePhoneRequest: (data: ChangePhoneRequestDto) =>
    api.post<{ success: boolean; message: string }>('/api/auth/change-phone-request', data, {
      headers: { 'X-Skip-Error-Handling': 'true' },
    }),
  changePhoneVerify: (data: ChangePhoneVerifyDto) =>
    api.post<User>('/api/auth/change-phone-verify', data, {
      headers: { 'X-Skip-Error-Handling': 'true' },
    }),
};

export interface FavoriteItem {
  listing: Listing;
}

export const favoritesApi = {
  getPage: (page: number = 1, limit: number = 20) =>
    api.get<{ data: FavoriteItem[]; meta: PaginationMeta }>('/api/favorites', {
      params: { page, limit },
    }),
  getIds: () => api.get<{ listingIds: string[] }>('/api/favorites/ids'),
  add: (listingId: string) => api.post(`/api/favorites/${listingId}`),
  remove: (listingId: string) => api.delete(`/api/favorites/${listingId}`),
  check: (listingId: string) =>
    api.get<{ isFavorite: boolean }>(`/api/favorites/check/${listingId}`),
  checkBatch: (listingIds: string[]) =>
    api.post<Record<string, boolean>>('/api/favorites/check-batch', { listingIds }),
};

export const brandsApi = {
  getAll: (vehicleType?: 'car' | 'truck' | 'moto') => {
    const params = vehicleType ? { vehicleType } : {};
    return api.get<Brand[]>('/api/brands', { params });
  },
  getModels: (brandId: string, vehicleType?: 'car' | 'truck' | 'moto') => {
    const params = vehicleType ? { vehicleType } : {};
    return api.get<VehicleModel[]>(`/api/brands/${brandId}/models`, { params });
  },
  getModelsBatch: (brandIds: string[], vehicleType?: 'car' | 'truck' | 'moto') =>
    api.post<Record<string, VehicleModel[]>>('/api/brands/models/batch', {
      brandIds,
      vehicleType,
    }),
  getModelsByName: (brandName: string) =>
    api.get<VehicleModel[]>(`/api/brands/name/${brandName}/models`),
  getSearchMetadata: (params: {
    brand?: string;
    model?: string;
    vehicleType?: 'car' | 'truck' | 'moto';
  }) =>
    api.get<{
      title: string | null;
      description?: string;
      brandName?: string;
      modelNames?: string[];
    }>('/api/brands/search-metadata', { params }),
  seed: () => api.post('/api/brands/seed'),
};

export interface City {
  name: string;
  nameEn: string;
  nameRu?: string;
}

export const citiesApi = {
  getAll: () => api.get<City[]>('/api/cities'),
};

export interface SavedFilter {
  id: string;
  user_id: string;
  name: string;
  filters: Record<string, unknown>;
  created_at: string;
}

export const savedFiltersApi = {
  getAll: () => api.get<SavedFilter[]>('/api/saved-filters'),
  create: (name: string, filters: Record<string, unknown>) =>
    api.post<SavedFilter>('/api/saved-filters', { name, filters }),
  update: (id: string, name: string) =>
    api.patch<SavedFilter>(`/api/saved-filters/${id}`, { name }),
  remove: (id: string) => api.delete(`/api/saved-filters/${id}`),
};

export const adminApi = {
  getAllListings: (
    page: number = 1,
    limit: number = 20,
    listingId?: string,
    userId?: string,
    status?: ListingStatus,
    isPromoted?: boolean,
    search?: string,
  ) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    if (search?.trim()) {
      params.set('search', search.trim());
    } else {
      if (listingId) {
        params.set('listingId', listingId);
      }
      if (userId) {
        params.set('userId', userId);
      }
    }
    if (status) {
      params.set('status', status);
    }
    if (isPromoted !== undefined) {
      params.set('isPromoted', isPromoted.toString());
    }
    const query = params.toString();
    return api.get<{ data: Listing[]; meta: PaginationMeta }>(`/api/admin/listings?${query}`);
  },
  getListingsStatusCounts: (search?: string) => {
    const params = new URLSearchParams();
    if (search?.trim()) {
      params.set('search', search.trim());
    }
    const query = params.toString();
    return api.get<{ Active: number; Paused: number; Closed: number; Promoted: number }>(
      `/api/admin/listings/status-counts${query ? `?${query}` : ''}`,
    );
  },
  updateListingStatus: (id: string, status: ListingStatus) =>
    api.patch(`/api/admin/listings/${id}/status`, { status }),
  getStats: () => api.get<AdminStats>('/api/admin/stats'),
  getAllUsers: (page: number = 1, limit: number = 20, search?: string, userType?: string) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    if (search) {
      params.set('search', search);
    }
    if (userType) {
      params.set('userType', userType);
    }
    const query = params.toString();
    return api.get<{ data: User[]; meta: PaginationMeta }>(`/api/admin/users?${query}`);
  },
  getUserListings: (userId: string) => api.get<Listing[]>(`/api/admin/users/${userId}/listings`),
  validateAssignUser: (userId: string) =>
    api.get<{
      valid: boolean;
      user?: {
        id: string;
        displayName: string;
        type: string;
        activeListings: number;
        listingLimit: number;
      };
      error?: string;
    }>(`/api/admin/validate-assign-user/${userId}`),
  toggleUserStatus: (userId: string) => api.patch(`/api/admin/users/${userId}/toggle-status`),
  toggleListingPromotion: (id: string, isPromoted: boolean, days?: number | null) =>
    api.patch(`/api/admin/listings/${id}/promote`, { is_promoted: isPromoted, days }),
  getAllPromotions: (
    page: number = 1,
    limit: number = 50,
    listingId?: string,
    userId?: string,
    fromDate?: Date,
  ) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    if (listingId) {
      params.set('listingId', listingId);
    }
    if (userId) {
      params.set('userId', userId);
    }
    if (fromDate) {
      params.set('fromDate', fromDate.toISOString());
    }
    return api.get<{
      data: PromotionHistory[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`/api/admin/promotions?${params.toString()}`);
  },
  ...adminBrandsModelsApi,
};
