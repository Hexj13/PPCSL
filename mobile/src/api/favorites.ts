import type { FavoriteItem, PaginationMeta } from '@/synced/api-types';

import { api } from '@/api/client';

export const mobileFavoritesApi = {
  getPage: (page: number = 1, limit: number = 20) =>
    api.get<{ data: FavoriteItem[]; meta: PaginationMeta }>('/api/favorites', {
      params: { page, limit },
    }),
  add: (listingId: string) => api.post(`/api/favorites/${listingId}`),
  remove: (listingId: string) => api.delete(`/api/favorites/${listingId}`),
  check: (listingId: string) =>
    api.get<{ isFavorite: boolean }>(`/api/favorites/check/${listingId}`),
};
