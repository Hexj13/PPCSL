import { api } from './api-client';
import type { City } from './api-types';

export const citiesApi = {
  getAll: () => api.get<City[]>('/api/cities'),
};
