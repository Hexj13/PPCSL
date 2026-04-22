import type { City } from '@/synced/api-types';

import { api } from '@/api/client';

export const mobileCitiesApi = {
  getAll: () => api.get<City[]>('/api/cities'),
};
