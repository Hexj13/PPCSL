import type { FilterState } from '@/hooks/useSearchFilters';
import {
  isValidTireAspectRatio,
  isValidTireDiameterInch,
  isValidTireWidthMm,
  normalizeTireDiameterInch,
  parseStrictUnsignedIntString,
  TIRE_LISTING_QUANTITY_MAX,
  TIRE_LISTING_QUANTITY_MIN,
} from '@/lib/constants';
import { TIRE_TREAD_SET } from '@/lib/tire-tread';

function filterValidMultiSelectValues(values: string[]): string[] {
  return values.filter((id) => id !== 'all' && id !== '' && !id.startsWith('__category__'));
}

const TIRE_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TIRE_CONDITION_SET = new Set(['new', 'used', 'retreaded']);

export function isGetParsedListingSearchParamsFailure(
  parsed: Record<string, string | number | boolean>,
): boolean {
  const keys = Object.keys(parsed);
  return keys.length === 2 && keys.includes('page') && keys.includes('limit');
}

function buildTireFallbackListingSearchParams(
  filters: FilterState,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {
    page: 1,
    limit: 1,
    category: 'tire',
  };

  const cityVals = filters.cities.filter(
    (c) => c !== 'all' && c !== '' && !c.startsWith('__category__'),
  );
  if (cityVals.length > 0) out.cities = cityVals.join(',');

  if (filters.tire_vehicle_type && ['car', 'truck', 'moto'].includes(filters.tire_vehicle_type)) {
    out.tireVehicleType = filters.tire_vehicle_type;
  }

  const tireBrandIds = filterValidMultiSelectValues(filters.tire_brand_ids)
    .filter((id) => TIRE_UUID_RE.test(id))
    .slice(0, 20);
  if (tireBrandIds.length > 0) out.tire_brand_ids = tireBrandIds.join(',');

  const tireModelIds = filterValidMultiSelectValues(filters.tire_model_ids)
    .filter((id) => TIRE_UUID_RE.test(id))
    .slice(0, 20);
  if (tireModelIds.length > 0) out.tire_model_ids = tireModelIds.join(',');

  const widths = filters.tire_widths
    .map((s) => parseStrictUnsignedIntString(String(s)))
    .filter((n): n is number => n !== null && isValidTireWidthMm(n))
    .slice(0, 20);
  if (widths.length > 0) out.tire_widths = widths.join(',');

  const profiles = filters.tire_profiles
    .map((s) => parseStrictUnsignedIntString(String(s)))
    .filter((n): n is number => n !== null && isValidTireAspectRatio(n))
    .slice(0, 20);
  if (profiles.length > 0) out.tire_profiles = profiles.join(',');

  const diameters = filters.tire_diameters
    .map((s) => {
      const n = parseFloat(String(s).replace(/\s/g, '').replace(',', '.'));
      if (Number.isNaN(n)) return null;
      return normalizeTireDiameterInch(n);
    })
    .filter((n): n is number => n !== null && isValidTireDiameterInch(n))
    .slice(0, 20);
  if (diameters.length > 0) out.tire_diameters = diameters.join(',');

  const seasons = filters.tire_seasons.filter((s) => TIRE_TREAD_SET.has(s)).slice(0, 10);
  if (seasons.length > 0) out.tire_seasons = seasons.join(',');

  const conditions = filters.tire_conditions.filter((s) => TIRE_CONDITION_SET.has(s)).slice(0, 10);
  if (conditions.length > 0) out.tire_conditions = conditions.join(',');

  const quantities = filters.tire_quantities
    .map((s) => parseStrictUnsignedIntString(String(s)))
    .filter(
      (n): n is number =>
        n !== null && n >= TIRE_LISTING_QUANTITY_MIN && n <= TIRE_LISTING_QUANTITY_MAX,
    )
    .slice(0, 10);
  if (quantities.length > 0) out.tire_quantities = quantities.join(',');

  if (filters.tire_studded) out.tire_studded = true;
  if (filters.tire_run_flat) out.tire_run_flat = true;
  if (filters.tire_reinforced_xl) out.tire_reinforced_xl = true;
  if (filters.tire_spare_donut) out.tire_spare_donut = true;
  if (filters.tire_tubeless) out.tire_tubeless = true;
  if (filters.tire_acoustic) out.tire_acoustic = true;

  const parseIntOrSkip = (raw: string, key: string) => {
    if (!raw || raw.trim() === '') return;
    const n = parseInt(raw.replace(/\s/g, ''), 10);
    if (!Number.isNaN(n)) out[key] = n;
  };

  parseIntOrSkip(filters.price_gte, 'price_gte');
  parseIntOrSkip(filters.price_lte, 'price_lte');

  if (filters.urgent) out.urgent = true;

  if (filters.currency?.trim()) out.currency = filters.currency.trim();

  if (filters.sortBy && filters.sortBy !== 'created_at') out.sortBy = filters.sortBy;
  if (filters.sortOrder && filters.sortOrder !== 'DESC') out.sortOrder = filters.sortOrder;

  return out;
}

export function buildFallbackListingSearchParamsFromFilters(
  filters: FilterState,
  vehicleType: 'car' | 'moto' | 'truck',
): Record<string, string | number | boolean> {
  if (filters.listing_category === 'tire') {
    return buildTireFallbackListingSearchParams(filters);
  }

  const out: Record<string, string | number | boolean> = {
    page: 1,
    limit: 1,
    vehicleType,
  };

  const brandIds = filterValidMultiSelectValues(filters.brand_ids);
  const modelIds = filterValidMultiSelectValues(filters.model_ids);
  if (brandIds.length) out.brand_ids = brandIds.join(',');
  if (modelIds.length) out.model_ids = modelIds.join(',');

  const cityVals = filters.cities.filter(
    (c) => c !== 'all' && c !== '' && !c.startsWith('__category__'),
  );
  if (cityVals.length) out.cities = cityVals.join(',');

  const multiKeys: (keyof Pick<
    FilterState,
    | 'fuels'
    | 'transmissions'
    | 'body_types'
    | 'colors'
    | 'doors'
    | 'conditions'
    | 'registration_types'
    | 'drive_types'
    | 'equipment'
  >)[] = [
    'fuels',
    'transmissions',
    'body_types',
    'colors',
    'doors',
    'conditions',
    'registration_types',
    'drive_types',
    'equipment',
  ];

  for (const key of multiKeys) {
    const filtered = filterValidMultiSelectValues(filters[key]);
    if (filtered.length) out[key] = filtered.join(',');
  }

  if (filters.equipment_match_mode === 'partial') {
    out.equipmentMatch = 'partial';
  }

  const parseIntOrSkip = (raw: string, key: string) => {
    if (!raw || raw.trim() === '') return;
    const n = parseInt(raw.replace(/\s/g, ''), 10);
    if (!Number.isNaN(n)) out[key] = n;
  };

  parseIntOrSkip(filters.year_gte, 'year_gte');
  parseIntOrSkip(filters.year_lte, 'year_lte');
  parseIntOrSkip(filters.price_gte, 'price_gte');
  parseIntOrSkip(filters.price_lte, 'price_lte');
  parseIntOrSkip(filters.mileage_gte, 'mileage_gte');
  parseIntOrSkip(filters.mileage_lte, 'mileage_lte');
  parseIntOrSkip(filters.horsepower_gte, 'horsepower_gte');
  parseIntOrSkip(filters.horsepower_lte, 'horsepower_lte');
  parseIntOrSkip(filters.down_payment_amount_gte, 'down_payment_amount_gte');

  const parseFloatOrSkip = (raw: string, key: string) => {
    if (!raw || raw.trim() === '') return;
    const n = parseFloat(raw.replace(',', '.'));
    if (!Number.isNaN(n)) out[key] = n;
  };

  parseFloatOrSkip(filters.engine_displ_l_gte, 'engine_displ_l_gte');
  parseFloatOrSkip(filters.engine_displ_l_lte, 'engine_displ_l_lte');

  if (filters.urgent) out.urgent = true;
  if (filters.is_new) out.is_new = true;
  if (filters.available_in_credit) out.available_in_credit = true;

  if (filters.currency?.trim()) out.currency = filters.currency.trim();

  if (filters.sortBy && filters.sortBy !== 'created_at') out.sortBy = filters.sortBy;
  if (filters.sortOrder && filters.sortOrder !== 'DESC') out.sortOrder = filters.sortOrder;

  return out;
}
