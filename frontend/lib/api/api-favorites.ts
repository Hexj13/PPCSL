import { api } from './api-client';
import type { FavoriteItem, PaginationMeta } from './api-types';

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
