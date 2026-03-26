import { api } from './api-client';
import type { SavedFilter } from './api-types';

const ALLOWED_SAVED_FILTER_KEYS = new Set([
  'brand_ids',
  'model_ids',
  'cities',
  'year_gte',
  'year_lte',
  'price_gte',
  'price_lte',
  'mileage_gte',
  'mileage_lte',
  'fuels',
  'transmissions',
  'body_types',
  'engine_displ_l_gte',
  'engine_displ_l_lte',
  'colors',
  'doors',
  'currency',
  'urgent',
  'is_new',
  'conditions',
  'registration_types',
  'horsepower_gte',
  'horsepower_lte',
  'drive_types',
  'equipment',
  'equipment_match_mode',
  'available_in_credit',
  'down_payment_amount_gte',
  'sortBy',
  'sortOrder',
  'vehicleType',
]);

function sanitizeSavedFilters(filters: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(filters).filter(([key]) => ALLOWED_SAVED_FILTER_KEYS.has(key)),
  );
}

export const savedFiltersApi = {
  getAll: () => api.get<SavedFilter[]>('/api/saved-filters'),
  create: (name: string, filters: Record<string, unknown>) =>
    api.post<SavedFilter>('/api/saved-filters', { name, filters: sanitizeSavedFilters(filters) }),
  update: (id: string, name: string) =>
    api.patch<SavedFilter>(`/api/saved-filters/${id}`, { name }),
  remove: (id: string) => api.delete(`/api/saved-filters/${id}`),
};
