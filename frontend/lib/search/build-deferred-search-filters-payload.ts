import type { FilterState } from '@/hooks/useSearchFilters';

function isValidFilterId(id: string): boolean {
  return id !== 'all' && id !== '' && !id.startsWith('__category__');
}

function isValidCityFilter(city: string): boolean {
  return city !== 'all' && city !== '' && !city.startsWith('__category__');
}

function applyTireCategoryDeferredFilters(
  searchFilters: Record<string, unknown>,
  merged: FilterState,
): void {
  const tb = merged.tire_brand_ids.filter(isValidFilterId);
  const tm = merged.tire_model_ids.filter(isValidFilterId);
  if (tb.length > 0) searchFilters.tire_brand_ids_count = tb.length;
  if (tm.length > 0) searchFilters.tire_model_ids_count = tm.length;
  if (merged.tire_vehicle_type) searchFilters.tire_vehicle_type = merged.tire_vehicle_type;
  if (merged.tire_studded === true) searchFilters.tire_studded = true;
  if (merged.tire_run_flat === true) searchFilters.tire_run_flat = true;
  if (merged.tire_reinforced_xl === true) searchFilters.tire_reinforced_xl = true;
  if (merged.tire_spare_donut === true) searchFilters.tire_spare_donut = true;
  if (merged.tire_tubeless === true) searchFilters.tire_tubeless = true;
  if (merged.tire_acoustic === true) searchFilters.tire_acoustic = true;
}

export function buildDeferredSearchFiltersPayload(
  merged: FilterState,
  vehicleType: 'car' | 'moto' | 'truck',
): Record<string, unknown> {
  const validBrandIds = merged.brand_ids.filter(isValidFilterId);
  const validModelIds = merged.model_ids.filter(isValidFilterId);
  const validCities = merged.cities.filter(isValidCityFilter);
  const searchFilters: Record<string, unknown> = {
    category: merged.listing_category ?? 'vehicle',
    listing_category: merged.listing_category ?? 'vehicle',
  };
  if (validBrandIds.length > 0) searchFilters.brand_ids_count = validBrandIds.length;
  if (validModelIds.length > 0) searchFilters.model_ids_count = validModelIds.length;
  if (validCities.length > 0) searchFilters.cities_count = validCities.length;
  if (merged.listing_category === 'tire') {
    applyTireCategoryDeferredFilters(searchFilters, merged);
  } else if (merged.listing_category === 'vehicle') {
    searchFilters.vehicle_type = vehicleType;
  }
  if (merged.price_gte) searchFilters.price_min = merged.price_gte;
  if (merged.price_lte) searchFilters.price_max = merged.price_lte;
  if (merged.year_gte) searchFilters.year_min = merged.year_gte;
  if (merged.year_lte) searchFilters.year_max = merged.year_lte;
  return searchFilters;
}
