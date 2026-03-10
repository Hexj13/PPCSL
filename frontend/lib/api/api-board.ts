import { api } from './api-client';
import type { BoardInfo, Listing, PaginationMeta } from './api-types';

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
