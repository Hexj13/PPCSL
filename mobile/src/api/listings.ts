import type {
  CreateListingDto,
  Listing,
  PaginationMeta,
  SearchParams,
  UpdateListingDto,
} from '@/synced/api-types';

import { api } from '@/api/client';

export const mobileListingsApi = {
  getAll: (params?: SearchParams, config?: { signal?: AbortSignal }) =>
    api.get<{ data: Listing[]; meta: PaginationMeta }>('/api/listings', { params, ...config }),
  getOne: (id: string) => api.get<Listing>(`/api/listings/${id}`),
  create: (data: CreateListingDto) => api.post<Listing>('/api/listings', data),
  update: (id: string, data: UpdateListingDto) =>
    api.patch<Listing>(`/api/listings/${id}`, data),
  publish: (id: string) => api.post(`/api/listings/${id}/publish`),
  pause: (id: string) => api.post(`/api/listings/${id}/pause`),
  close: (id: string) => api.post(`/api/listings/${id}/close`),
  promote: (id: string) => api.post(`/api/listings/${id}/promote`),
  unpromote: (id: string) => api.post(`/api/listings/${id}/unpromote`),
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
    if (status) params.set('status', status);
    if (promoted !== undefined) params.set('promoted', String(promoted));
    if (typeof search === 'string' && search.trim()) params.set('search', search.trim());
    return api.get<{ data: Listing[]; meta: PaginationMeta }>(`/api/listings/my?${params}`);
  },
};
