import { api } from '@/api/client';

export type SavedFilter = {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  created_at?: string;
};

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
  'category',
  'tire_vehicle_type',
  'tire_brand_ids',
  'tire_model_ids',
  'tire_width_mm',
  'tire_aspect_ratio',
  'tire_diameter_inch',
  'tire_seasons',
  'tire_conditions',
  'tire_quantity',
  'tire_studded',
  'tire_run_flat',
]);

function sanitizeSavedFilters(filters: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(filters).filter(([key]) => ALLOWED_SAVED_FILTER_KEYS.has(key)),
  );
}

export const mobileSavedFiltersApi = {
  getAll: () => api.get<SavedFilter[]>('/api/saved-filters'),
  create: (name: string, filters: Record<string, unknown>) =>
    api.post<SavedFilter>('/api/saved-filters', {
      name,
      filters: sanitizeSavedFilters(filters),
    }),
  update: (id: string, name: string) =>
    api.patch<SavedFilter>(`/api/saved-filters/${id}`, { name }),
  remove: (id: string) => api.delete(`/api/saved-filters/${id}`),
};
