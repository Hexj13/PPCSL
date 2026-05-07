import { api } from './api-client';
import type {
  CreateListingDto,
  Listing,
  ListingAiReportPostResponse,
  ListingVideoConstraints,
  StagedListingVideoStatusResponse,
  StagedListingVideoUploadInitResponse,
  ListingVideoUploadInitResponse,
  PaginationMeta,
  PromotionAccessStatus,
  PromotionHistory,
  SearchParams,
  UpdateListingDto,
} from './api-types';

export const listingsApi = {
  getAll: (
    params?: SearchParams,
    config?: {
      signal?: AbortSignal;
    },
  ) => api.get<{ data: Listing[]; meta: PaginationMeta }>('/api/listings', { params, ...config }),
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
  getUserActiveListingsCount: (userId: string) =>
    api.get<{ count: number }>(`/api/listings/user/${userId}/active/count`),
  getByVin: (vin: string, excludeId?: string) =>
    api.get<Listing[]>(`/api/listings/vin/${vin}`, { params: excludeId ? { excludeId } : {} }),
  getVin: (id: string, action: 'reveal' | 'copy') =>
    api.get<{ vin: string }>(`/api/listings/${id}/vin`, {
      params: { action },
      headers: { 'X-Skip-Error-Handling': 'true' },
    }),
  getPhones: (id: string) =>
    api.get<{ phone: string | null; additionalPhone: string | null }>(
      `/api/listings/${id}/phones`,
      {
        headers: { 'X-Skip-Error-Handling': 'true' },
      },
    ),
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
  getMy: (
    page: number = 1,
    limit: number = 20,
    status?: string,
    promoted?: boolean,
    search?: string,
  ) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    if (status) {
      params.set('status', status);
    }
    if (promoted !== undefined) {
      params.set('promoted', String(promoted));
    }
    if (search && search.trim()) {
      params.set('search', search.trim());
    }
    const query = params.toString();
    return api.get<{ data: Listing[]; meta: PaginationMeta }>(`/api/listings/my?${query}`);
  },
  refreshDates: () => api.post<{ updated: number }>('/api/listings/refresh-dates'),
  togglePromotion: (
    id: string,
    isPromoted: boolean,
    days?: number | null,
    source?: 'default' | 'partner_balance',
  ) => api.patch(`/api/listings/${id}/promote`, { is_promoted: isPromoted, days, source }),
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
  getPromotionAccess: () => api.get<PromotionAccessStatus>('/api/listings/promotion-access'),
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
  postAiReport: (id: string, options?: { signal?: AbortSignal; reportLanguage?: 'ru' | 'ro' }) =>
    api.post<ListingAiReportPostResponse>(
      `/api/listings/${id}/ai-report`,
      {},
      {
        headers: {
          'X-Skip-Error-Handling': 'true',
          ...(options?.reportLanguage ? { 'X-Report-Language': options.reportLanguage } : {}),
        },
        signal: options?.signal,
      },
    ),
  getListingVideoConstraints: () =>
    api.get<ListingVideoConstraints>(`/api/listings/video/constraints`),
  stagedVideoUploadInit: (body: { fileSize: number; fileName: string; contentType: string }) =>
    api.post<StagedListingVideoUploadInitResponse>(`/api/listings/video/staged-upload-init`, body),
  stagedVideoUploadComplete: (body: {
    stagedVideoToken: string;
    uploadId: string;
    parts: { PartNumber: number; ETag: string }[];
  }) =>
    api.post<{ jobId: string | null; stagedVideoToken: string }>(
      `/api/listings/video/staged-upload-complete`,
      body,
    ),
  getStagedVideoStatus: (stagedVideoToken: string) =>
    api.post<StagedListingVideoStatusResponse>(`/api/listings/video/staged-status`, {
      stagedVideoToken,
    }),
  videoUploadInit: (
    listingId: string,
    body: { fileSize: number; fileName: string; contentType: string },
  ) =>
    api.post<ListingVideoUploadInitResponse>(`/api/listings/${listingId}/video/upload-init`, body),
  videoUploadComplete: (
    listingId: string,
    body: { uploadId: string; parts: { PartNumber: number; ETag: string }[] },
  ) => api.post<{ jobId: string | null }>(`/api/listings/${listingId}/video/upload-complete`, body),
  deleteListingVideo: (listingId: string) =>
    api.delete<{ success: boolean }>(`/api/listings/${listingId}/video`),
};
