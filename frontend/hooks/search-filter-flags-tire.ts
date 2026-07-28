import type { TireBrand } from '@/lib/api';
import {
  normalizeTireNameKey,
  POPULAR_TIRE_BRAND_NAMES,
  POPULAR_TIRE_SIZES,
} from '@/lib/content/popular-tires';

import type { FilterState } from './useSearchFilters';

function tireBasicFilterChecks(filters: FilterState): boolean[] {
  return [
    filters.tire_brand_ids.length > 0,
    filters.tire_model_ids.length > 0,
    filters.tire_widths.length > 0,
    filters.tire_profiles.length > 0,
    filters.tire_diameters.length > 0,
    filters.tire_vehicle_type !== '',
    filters.tire_seasons.length > 0,
    filters.tire_conditions.length > 0,
    filters.tire_quantities.length > 0,
    filters.tire_studded,
    filters.tire_run_flat,
    filters.tire_reinforced_xl,
    filters.tire_spare_donut,
    filters.tire_tubeless,
    filters.tire_acoustic,
    filters.price_gte !== '',
    filters.price_lte !== '',
    filters.cities.length > 0,
    filters.urgent,
    filters.seller_types.length > 0,
  ];
}

function hasPopularTireBrandSelection(
  filters: FilterState,
  popularBrandKeys: Set<string>,
  tireBrands: TireBrand[],
): boolean {
  const selectedTireBrandNames = filters.tire_brand_ids
    .map((id) => tireBrands.find((b) => b.id === id)?.name)
    .filter((n): n is string => Boolean(n));
  return selectedTireBrandNames.some((n) => popularBrandKeys.has(normalizeTireNameKey(n)));
}

function matchesPopularTireSize(filters: FilterState): boolean {
  const w = filters.tire_widths;
  const p = filters.tire_profiles;
  const d = filters.tire_diameters;
  if (w.length === p.length && p.length === d.length && w.length > 0) {
    return POPULAR_TIRE_SIZES.some((s) =>
      w.some((tw, i) => tw === s.width && p[i] === s.profile && d[i] === s.diameter),
    );
  }
  return POPULAR_TIRE_SIZES.some(
    (s) => w.includes(s.width) && p.includes(s.profile) && d.includes(s.diameter),
  );
}

function hasTirePopularPanelRefinements(filters: FilterState): boolean {
  return (
    filters.tire_model_ids.length > 0 ||
    filters.tire_conditions.length > 0 ||
    filters.tire_studded ||
    filters.tire_run_flat ||
    filters.tire_reinforced_xl ||
    filters.tire_spare_donut ||
    filters.tire_tubeless ||
    filters.tire_acoustic
  );
}

export function computeTireSearchFilterFlags(
  filters: FilterState,
  tireBrands: TireBrand[],
): { hasTireBasicFilters: boolean; hasTirePopularFilters: boolean } {
  const hasTireBasic = tireBasicFilterChecks(filters).some(Boolean);
  const popularBrandKeys = new Set(POPULAR_TIRE_BRAND_NAMES.map((n) => normalizeTireNameKey(n)));
  const hasPopularBrands = hasPopularTireBrandSelection(filters, popularBrandKeys, tireBrands);
  const matchesPopularSize = matchesPopularTireSize(filters);
  const hasTirePopularHints = hasPopularBrands || matchesPopularSize;
  const tirePopularTabDot = hasTirePopularHints && !hasTirePopularPanelRefinements(filters);

  return {
    hasTireBasicFilters: hasTireBasic,
    hasTirePopularFilters: tirePopularTabDot && hasTireBasic,
  };
}
