import {
  getDefaultFilters as getDefaultFiltersFromSearchParams,
  getDefaultTireFilters,
} from '@/lib/search';
import type { FilterState } from '@/lib/search/filter-state';

export type UrlParseContext = {
  searchParams: URLSearchParams;
  storedFilters: Record<string, unknown> | null;
  hasEncodedArrays: boolean;
  currentYear: string;
};

const decodeArray = (encoded: string): string[] => {
  if (!encoded) return [];
  try {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return encoded.split(',').filter((v) => v.trim() !== '');
  }
};

export const parseArrayParam = (param: string | null, isEncoded: boolean = false): string[] => {
  if (!param) return [];
  if (isEncoded) {
    return decodeArray(param);
  }
  return param.split(',').filter((v) => v.trim() !== '');
};

export const resolveArrayFromStorageOrUrl = (
  ctx: UrlParseContext,
  storageKey: string,
  urlKeys: string[],
): string[] => {
  if (Array.isArray(ctx.storedFilters?.[storageKey])) {
    return ctx.storedFilters[storageKey] as string[];
  }
  const param = urlKeys.map((k) => ctx.searchParams.get(k)).find((v) => v !== null) ?? null;
  return parseArrayParam(param, ctx.hasEncodedArrays);
};

const getDefaultFilters = (currentYear: string): FilterState =>
  getDefaultFiltersFromSearchParams(currentYear) as FilterState;

const getTireDefaults = (currentYear: string): FilterState =>
  getDefaultTireFilters(currentYear) as FilterState;

function buildInitialTireFilters(ctx: UrlParseContext): FilterState {
  const tireVtRaw = ctx.searchParams.get('tireVehicleType');
  const tire_vehicle_type =
    tireVtRaw && ['car', 'truck', 'moto'].includes(tireVtRaw)
      ? (tireVtRaw as 'car' | 'truck' | 'moto')
      : '';

  const tireBase = getTireDefaults(ctx.currentYear);
  return {
    ...tireBase,
    cities: resolveArrayFromStorageOrUrl(ctx, 'cities', ['cities', 'city']),
    price_gte: ctx.searchParams.get('price_gte') || '',
    price_lte: ctx.searchParams.get('price_lte') || '',
    currency: ctx.searchParams.get('currency') || '',
    urgent: ctx.searchParams.get('urgent') === 'true',
    sortBy: ctx.searchParams.get('sortBy') || 'created_at',
    sortOrder: (ctx.searchParams.get('sortOrder') || 'DESC') as 'ASC' | 'DESC',
    tire_vehicle_type,
    tire_brand_ids: resolveArrayFromStorageOrUrl(ctx, 'tire_brand_ids', ['tire_brand_ids']),
    tire_model_ids: resolveArrayFromStorageOrUrl(ctx, 'tire_model_ids', ['tire_model_ids']),
    tire_widths: resolveArrayFromStorageOrUrl(ctx, 'tire_widths', ['tire_widths']),
    tire_profiles: resolveArrayFromStorageOrUrl(ctx, 'tire_profiles', ['tire_profiles']),
    tire_diameters: resolveArrayFromStorageOrUrl(ctx, 'tire_diameters', ['tire_diameters']),
    tire_seasons: resolveArrayFromStorageOrUrl(ctx, 'tire_seasons', ['tire_seasons']),
    tire_conditions: resolveArrayFromStorageOrUrl(ctx, 'tire_conditions', ['tire_conditions']),
    tire_quantities: resolveArrayFromStorageOrUrl(ctx, 'tire_quantities', ['tire_quantities']),
    tire_studded: ctx.searchParams.get('tire_studded') === 'true',
    tire_run_flat: ctx.searchParams.get('tire_run_flat') === 'true',
    tire_reinforced_xl: ctx.searchParams.get('tire_reinforced_xl') === 'true',
    tire_spare_donut: ctx.searchParams.get('tire_spare_donut') === 'true',
    tire_tubeless: ctx.searchParams.get('tire_tubeless') === 'true',
    tire_acoustic: ctx.searchParams.get('tire_acoustic') === 'true',
  };
}

function resolveSellerType(searchParams: URLSearchParams): '' | 'Individual' | 'Business' {
  const raw = searchParams.get('seller_type');
  if (raw === 'Individual' || raw === 'Business') {
    return raw;
  }
  const legacy = searchParams.get('seller_types');
  if (!legacy) {
    return '';
  }
  const first = legacy
    .split(',')
    .map((s) => s.trim())
    .find((v) => v === 'Individual' || v === 'Business');
  return first ?? '';
}

function buildInitialVehicleFilters(ctx: UrlParseContext): FilterState {
  const hasBrandParam = !!ctx.searchParams.get('brand');
  const hasModelParam = !!ctx.searchParams.get('model');
  const brandIdsFromUrl = parseArrayParam(
    ctx.searchParams.get('brand_ids') || ctx.searchParams.get('brand_id') || null,
    ctx.hasEncodedArrays,
  );
  const modelIdsFromUrl = parseArrayParam(
    ctx.searchParams.get('model_ids') || ctx.searchParams.get('model_id') || null,
    ctx.hasEncodedArrays,
  );

  const resolveBrandIds = () => {
    if (hasBrandParam) return [];
    if (Array.isArray(ctx.storedFilters?.brand_ids)) {
      return ctx.storedFilters.brand_ids as string[];
    }
    return brandIdsFromUrl;
  };
  const resolveModelIds = () => {
    if (hasBrandParam || hasModelParam) return [];
    if (Array.isArray(ctx.storedFilters?.model_ids)) {
      return ctx.storedFilters.model_ids as string[];
    }
    return modelIdsFromUrl;
  };

  return {
    ...getDefaultFilters(ctx.currentYear),
    brand_ids: resolveBrandIds(),
    model_ids: resolveModelIds(),
    cities: resolveArrayFromStorageOrUrl(ctx, 'cities', ['cities', 'city']),
    year_gte: ctx.searchParams.get('year_gte') || '',
    year_lte: ctx.searchParams.get('year_lte') || ctx.currentYear,
    price_gte: ctx.searchParams.get('price_gte') || '',
    price_lte: ctx.searchParams.get('price_lte') || '',
    mileage_gte: ctx.searchParams.get('mileage_gte') || '',
    mileage_lte: ctx.searchParams.get('mileage_lte') || '',
    fuels: resolveArrayFromStorageOrUrl(ctx, 'fuels', ['fuels', 'fuel']),
    transmissions: resolveArrayFromStorageOrUrl(ctx, 'transmissions', [
      'transmissions',
      'transmission',
    ]),
    body_types: resolveArrayFromStorageOrUrl(ctx, 'body_types', ['body_types', 'body_type']),
    engine_displ_l_gte: ctx.searchParams.get('engine_displ_l_gte') || '',
    engine_displ_l_lte: ctx.searchParams.get('engine_displ_l_lte') || '',
    colors: resolveArrayFromStorageOrUrl(ctx, 'colors', ['colors', 'color']),
    doors: resolveArrayFromStorageOrUrl(ctx, 'doors', ['doors']),
    currency: ctx.searchParams.get('currency') || '',
    urgent: ctx.searchParams.get('urgent') === 'true',
    is_new: ctx.searchParams.get('is_new') === 'true',
    conditions: resolveArrayFromStorageOrUrl(ctx, 'conditions', ['conditions']),
    registration_types: resolveArrayFromStorageOrUrl(ctx, 'registration_types', [
      'registration_types',
    ]),
    horsepower_gte: ctx.searchParams.get('horsepower_gte') || '',
    horsepower_lte: ctx.searchParams.get('horsepower_lte') || '',
    drive_types: resolveArrayFromStorageOrUrl(ctx, 'drive_types', ['drive_types']),
    equipment: resolveArrayFromStorageOrUrl(ctx, 'equipment', ['equipment']),
    equipment_match_mode: ctx.searchParams.get('equipmentMatch') === 'partial' ? 'partial' : 'full',
    available_in_credit: ctx.searchParams.get('available_in_credit') === 'true',
    down_payment_amount_gte: ctx.searchParams.get('down_payment_amount_gte') || '',
    seller_type: resolveSellerType(ctx.searchParams),
    sortBy: ctx.searchParams.get('sortBy') || 'created_at',
    sortOrder: (ctx.searchParams.get('sortOrder') || 'DESC') as 'ASC' | 'DESC',
  };
}

export function buildInitialFiltersFromUrl(
  ctx: UrlParseContext,
  listingCategory: 'vehicle' | 'tire',
): FilterState {
  if (listingCategory === 'tire') {
    return buildInitialTireFilters(ctx);
  }
  return buildInitialVehicleFilters(ctx);
}
