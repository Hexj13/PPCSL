import type { FilterState } from '@/hooks/useSearchFilters';
import {
  appendTireFiltersToUrlSink,
  filterValidMultiSelectValues,
} from '@/lib/search/tire-filter-url-params';

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

  appendTireFiltersToUrlSink(
    {
      setScalar: (key, value) => {
        out[key] = value;
      },
      setJoined: (key, values) => {
        out[key] = values.join(',');
      },
    },
    filters,
  );

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

  if (filters.seller_type === 'Individual' || filters.seller_type === 'Business') {
    out.seller_type = filters.seller_type;
  }

  if (filters.currency?.trim()) out.currency = filters.currency.trim();

  if (filters.sortBy && filters.sortBy !== 'created_at') out.sortBy = filters.sortBy;
  if (filters.sortOrder && filters.sortOrder !== 'DESC') out.sortOrder = filters.sortOrder;

  return out;
}
