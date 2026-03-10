import { api } from './api-client';
import type {
  CreateListingDto,
  Listing,
  PaginationMeta,
  PromotionHistory,
  SearchParams,
  UpdateListingDto,
} from './api-types';

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
  getVin: (id: string, action: 'reveal' | 'copy') =>
    api.get<{ vin: string }>(`/api/listings/${id}/vin`, {
      params: { action },
      headers: { 'X-Skip-Error-Handling': 'true' },
    }),
  getHistoryByListingId: (id: string) => api.get<Listing[]>(`/api/listings/${id}/history`),
  getReportUrl: (id: string) =>
    api.get<{ url: string }>(`/api/listings/${id}/report-url`, {
      headers: { 'X-Skip-Error-Handling': 'true' },
    }),
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
