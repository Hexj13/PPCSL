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

import { decodeBase64Array } from './search-params-encoding';
import type { ParsedSearchParams } from './search-params-parsed.types';

const TIRE_BOOLEAN_PARAMS = [
  'tire_studded',
  'tire_run_flat',
  'tire_reinforced_xl',
  'tire_spare_donut',
  'tire_tubeless',
  'tire_acoustic',
] as const;

const TIRE_CONDITIONS = new Set(['new', 'used', 'retreaded']);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UrlParamsInput = URLSearchParams | Record<string, string | string[] | undefined>;

function getParamValue(urlParams: UrlParamsInput, key: string): string | undefined {
  if (urlParams instanceof URLSearchParams) {
    return urlParams.get(key) ?? undefined;
  }
  const val = urlParams[key];
  if (Array.isArray(val)) return val.join(',');
  return typeof val === 'string' ? val : undefined;
}

export function applyTireSearchArraysToParsed(
  params: ParsedSearchParams,
  urlParams: UrlParamsInput,
  hasEncodedArrays: boolean,
  storedFilters: Record<string, string[]> | null,
): void {
  const getRaw = (key: string): string | undefined => {
    const fromStore = storedFilters?.[key];
    if (Array.isArray(fromStore) && fromStore.length > 0) {
      return fromStore.join(',');
    }
    return getParamValue(urlParams, key);
  };

  const decodeList = (raw: string | undefined): string[] => {
    if (!raw) return [];
    return hasEncodedArrays && !storedFilters
      ? decodeBase64Array(raw)
      : raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
  };

  const brandIds = decodeList(getRaw('tire_brand_ids'))
    .filter((id) => UUID_RE.test(id))
    .slice(0, 20);
  if (brandIds.length > 0) params.tire_brand_ids = brandIds.join(',');

  const modelIds = decodeList(getRaw('tire_model_ids'))
    .filter((id) => UUID_RE.test(id))
    .slice(0, 20);
  if (modelIds.length > 0) params.tire_model_ids = modelIds.join(',');

  const widths = decodeList(getRaw('tire_widths'))
    .map((s) => parseStrictUnsignedIntString(s))
    .filter((n): n is number => n !== null && isValidTireWidthMm(n))
    .slice(0, 20);
  if (widths.length > 0) params.tire_widths = widths.join(',');

  const profiles = decodeList(getRaw('tire_profiles'))
    .map((s) => parseStrictUnsignedIntString(s))
    .filter((n): n is number => n !== null && isValidTireAspectRatio(n))
    .slice(0, 20);
  if (profiles.length > 0) params.tire_profiles = profiles.join(',');

  const diameters = decodeList(getRaw('tire_diameters'))
    .map((s) => {
      const n = parseFloat(s.replace(',', '.'));
      if (Number.isNaN(n)) return null;
      return normalizeTireDiameterInch(n);
    })
    .filter((n): n is number => n !== null && isValidTireDiameterInch(n))
    .slice(0, 20);
  if (diameters.length > 0) params.tire_diameters = diameters.map((d) => String(d)).join(',');

  const seasons = decodeList(getRaw('tire_seasons'))
    .filter((s) => TIRE_TREAD_SET.has(s))
    .slice(0, 10);
  if (seasons.length > 0) params.tire_seasons = seasons.join(',');

  const conditions = decodeList(getRaw('tire_conditions'))
    .filter((s) => TIRE_CONDITIONS.has(s))
    .slice(0, 10);
  if (conditions.length > 0) params.tire_conditions = conditions.join(',');

  const quantities = decodeList(getRaw('tire_quantities'))
    .map((s) => parseStrictUnsignedIntString(s))
    .filter(
      (n): n is number =>
        n !== null && n >= TIRE_LISTING_QUANTITY_MIN && n <= TIRE_LISTING_QUANTITY_MAX,
    )
    .slice(0, 10);
  if (quantities.length > 0) params.tire_quantities = quantities.join(',');
}

export function applyTireBooleanParamsToParsed(
  params: ParsedSearchParams,
  urlParams: UrlParamsInput,
): void {
  const out = params as unknown as Record<string, boolean | undefined>;
  for (const key of TIRE_BOOLEAN_PARAMS) {
    let value: string | boolean | undefined;
    if (urlParams instanceof URLSearchParams) {
      value = urlParams.get(key) ?? undefined;
    } else {
      const val = urlParams[key];
      if (typeof val === 'boolean') {
        out[key] = val;
        continue;
      }
      value = Array.isArray(val) ? val.join(',') : typeof val === 'string' ? val : undefined;
    }
    if (value === 'true') {
      out[key] = true;
    }
  }
}

const VEHICLE_ONLY_KEYS_WHEN_TIRE: (keyof ParsedSearchParams)[] = [
  'vehicleType',
  'brand_ids',
  'model_ids',
  'fuels',
  'transmissions',
  'body_types',
  'colors',
  'doors',
  'conditions',
  'registration_types',
  'drive_types',
  'equipment',
  'equipmentMatch',
  'year_gte',
  'year_lte',
  'mileage_gte',
  'mileage_lte',
  'engine_displ_l_gte',
  'engine_displ_l_lte',
  'horsepower_gte',
  'horsepower_lte',
  'is_new',
  'available_in_credit',
  'down_payment_amount_gte',
];

export function stripVehicleSearchFieldsForTireCategory(params: ParsedSearchParams): void {
  if (params.category !== 'tire') return;
  const p = params as unknown as Record<string, unknown>;
  for (const key of VEHICLE_ONLY_KEYS_WHEN_TIRE) {
    delete p[key as string];
  }
}
