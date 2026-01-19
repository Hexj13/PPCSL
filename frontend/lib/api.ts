import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

import {
  BodyType,
  ConditionType,
  Currency,
  DriveType,
  FuelType,
  ListingStatus,
  RegistrationType,
  TransmissionType,
  UserType,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (_value?: unknown) => void;
  reject: (_error?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

const getErrorMessage = (error: AxiosError): string => {
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return 'Истече време за поврзување. Обидете се повторно.';
    }
    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      return 'Грешка во мрежата. Проверете ја вашата интернет врска.';
    }
    return 'Грешка при поврзување со серверот. Обидете се повторно.';
  }

  const status = error.response.status;
  const data = error.response.data as ErrorResponseData;
  let message = '';

  if (data?.message) {
    if (Array.isArray(data.message)) {
      message = data.message.join(', ');
    } else {
      message = data.message;
    }
  }

  switch (status) {
    case 400:
      return message || 'Невалидна барање. Проверете ги внесените податоци.';
    case 401:
      if (typeof window !== 'undefined') {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
            window.location.href = '/login';
          }
        }
      }
      return message || 'Неавторизиран пристап. Најавете се повторно.';
    case 403:
      return message || 'Немате дозвола за оваа акција.';
    case 404:
      return message || 'Ресурсот не е пронајден.';
    case 409:
      return message || 'Конфликт. Ресурсот веќе постои.';
    case 422:
      return message || 'Грешка во валидација. Проверете ги внесените податоци.';
    case 429:
      return 'Премногу барања. Обидете се подоцна.';
    case 500:
      return message || 'Грешка на серверот. Обидете се подоцна.';
    case 502:
    case 503:
    case 504:
      return 'Серверот е привремено недостапен. Обидете се подоцна.';
    default:
      return message || `Грешка ${status}. Обидете се повторно.`;
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as ExtendedAxiosRequestConfig | undefined;

    if (error.response?.status === 429 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const retryAfter = error.response.headers['retry-after']
        ? parseInt(error.response.headers['retry-after'], 10) * 1000
        : 2000;

      await new Promise((resolve) => setTimeout(resolve, retryAfter));
      return api(originalRequest);
    }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const isLoginEndpoint = originalRequest.url?.includes('/api/auth/login');
      const isRegisterEndpoint = originalRequest.url?.includes('/api/auth/register');

      if (isLoginEndpoint || isRegisterEndpoint) {
        if (error.config && !error.config.headers['X-Skip-Error-Handling']) {
          const errorMessage = getErrorMessage(error);
          if (typeof window !== 'undefined') {
            (async () => {
              const { toast } = await import('react-hot-toast');
              toast.error(errorMessage);
            })();
          }
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken =
        typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;

      if (!refreshToken) {
        processQueue(error);
        isRefreshing = false;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
            const currentUrl = window.location.pathname + window.location.search;
            localStorage.setItem('returnUrl', currentUrl);
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }

      try {
        const response = await api.post<{
          access_token: string;
          refresh_token: string;
          user: User;
        }>(
          '/api/auth/refresh',
          { refresh_token: refreshToken },
          { headers: { 'X-Skip-Error-Handling': 'true' } }
        );

        const { access_token, refresh_token: newRefreshToken } = response.data;

        if (typeof window !== 'undefined') {
          localStorage.setItem('token', access_token);
          localStorage.setItem('refresh_token', newRefreshToken);
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
        }

        processQueue(null, access_token);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError);
        isRefreshing = false;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
            const currentUrl = window.location.pathname + window.location.search;
            localStorage.setItem('returnUrl', currentUrl);
            window.location.href = '/login';
          }
        }
        return Promise.reject(refreshError);
      }
    }

    if (error.config && !error.config.headers['X-Skip-Error-Handling']) {
      const errorMessage = getErrorMessage(error);
      if (typeof window !== 'undefined') {
        const { toast } = await import('react-hot-toast');
        toast.error(errorMessage);
      }
    }
    return Promise.reject(error);
  }
);

export interface Listing {
  id: string;
  title: string;
  price?: number;
  currency?: Currency;
  city: string;
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
  is_registered?: boolean;
  registration_expires_at?: string;
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
}

export interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
  order: number;
}

export interface VehicleModel {
  id: string;
  name: string;
  brand_id: string;
  order: number;
  vehicle_type?: 'car' | 'truck' | 'moto';
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
  is_registered?: boolean;
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
  is_registered?: boolean;
  registration_expires_at?: string;
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
}

export interface UpdateListingDto extends Partial<CreateListingDto> {}

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

interface ErrorResponseData {
  message?: string | string[];
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
  close: (id: string) => api.post(`/api/listings/${id}/close`),
  getMy: (page: number = 1, limit: number = 20) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', limit.toString());
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

export const uploadApi = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ url: string; path: string }>('/api/upload/image', formData);
  },
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
      data
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

export const favoritesApi = {
  getAll: () => api.get('/api/favorites'),
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
  seed: () => api.post('/api/brands/seed'),
};

export interface City {
  name: string;
  nameEn: string;
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
    isPromoted?: boolean
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
    if (status) {
      params.set('status', status);
    }
    if (isPromoted !== undefined) {
      params.set('isPromoted', isPromoted.toString());
    }
    const query = params.toString();
    return api.get<{ data: Listing[]; meta: PaginationMeta }>(`/api/admin/listings?${query}`);
  },
  getListingsStatusCounts: () => {
    return api.get<{ Active: number; Paused: number; Closed: number; Promoted: number }>(
      '/api/admin/listings/status-counts'
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
  toggleUserStatus: (userId: string) => api.patch(`/api/admin/users/${userId}/toggle-status`),
  toggleListingPromotion: (id: string, isPromoted: boolean, days?: number | null) =>
    api.patch(`/api/admin/listings/${id}/promote`, { is_promoted: isPromoted, days }),
  getAllPromotions: (
    page: number = 1,
    limit: number = 50,
    listingId?: string,
    userId?: string,
    fromDate?: Date
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
};
