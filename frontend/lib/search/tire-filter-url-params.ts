import {
  isValidTireAspectRatio,
  isValidTireDiameterInch,
  isValidTireWidthMm,
  normalizeTireDiameterInch,
  parseStrictUnsignedIntString,
  TIRE_LISTING_QUANTITY_MAX,
  TIRE_LISTING_QUANTITY_MIN,
} from '@/lib/constants';
import type { FilterState } from '@/lib/search/filter-state';
import { TIRE_TREAD_SET } from '@/lib/tire-tread';

const TIRE_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIRE_CONDITION_SET = new Set(['new', 'used', 'retreaded']);

export type TireCoreFiltersInput = Pick<
  FilterState,
  | 'tire_vehicle_type'
  | 'tire_brand_ids'
  | 'tire_model_ids'
  | 'tire_widths'
  | 'tire_profiles'
  | 'tire_diameters'
  | 'tire_seasons'
  | 'tire_conditions'
  | 'tire_quantities'
  | 'tire_studded'
  | 'tire_run_flat'
  | 'tire_reinforced_xl'
  | 'tire_spare_donut'
  | 'tire_tubeless'
  | 'tire_acoustic'
>;

export function filterValidMultiSelectValues(values: string[]): string[] {
  return values.filter((id) => id !== 'all' && id !== '' && !id.startsWith('__category__'));
}

type TireUrlParamSink = {
  setScalar(key: string, value: string | number | boolean): void;
  setJoined(key: string, values: string[]): void;
};

function appendTireUuidIds(sink: TireUrlParamSink, key: string, ids: string[]): void {
  const valid = filterValidMultiSelectValues(ids)
    .filter((id) => TIRE_UUID_RE.test(id))
    .slice(0, 20);
  if (valid.length > 0) {
    sink.setJoined(key, valid);
  }
}

function appendTireWidths(sink: TireUrlParamSink, widths: string[]): void {
  const valid = widths
    .map((s) => parseStrictUnsignedIntString(String(s)))
    .filter((n): n is number => n !== null && isValidTireWidthMm(n))
    .slice(0, 20)
    .map(String);
  if (valid.length > 0) {
    sink.setJoined('tire_widths', valid);
  }
}

function appendTireProfiles(sink: TireUrlParamSink, profiles: string[]): void {
  const valid = profiles
    .map((s) => parseStrictUnsignedIntString(String(s)))
    .filter((n): n is number => n !== null && isValidTireAspectRatio(n))
    .slice(0, 20)
    .map(String);
  if (valid.length > 0) {
    sink.setJoined('tire_profiles', valid);
  }
}

function appendTireDiameters(sink: TireUrlParamSink, diameters: string[]): void {
  const valid = diameters
    .map((s) => {
      const n = parseFloat(String(s).replace(/\s/g, '').replace(',', '.'));
      if (Number.isNaN(n)) return null;
      return normalizeTireDiameterInch(n);
    })
    .filter((n): n is number => n !== null && isValidTireDiameterInch(n))
    .slice(0, 20)
    .map(String);
  if (valid.length > 0) {
    sink.setJoined('tire_diameters', valid);
  }
}

function appendTireSeasons(sink: TireUrlParamSink, seasons: string[]): void {
  const valid = seasons.filter((s) => TIRE_TREAD_SET.has(s)).slice(0, 10);
  if (valid.length > 0) {
    sink.setJoined('tire_seasons', valid);
  }
}

function appendTireConditions(sink: TireUrlParamSink, conditions: string[]): void {
  const valid = conditions.filter((s) => TIRE_CONDITION_SET.has(s)).slice(0, 10);
  if (valid.length > 0) {
    sink.setJoined('tire_conditions', valid);
  }
}

function appendTireQuantities(sink: TireUrlParamSink, quantities: string[]): void {
  const valid = quantities
    .map((s) => parseStrictUnsignedIntString(String(s)))
    .filter(
      (n): n is number =>
        n !== null && n >= TIRE_LISTING_QUANTITY_MIN && n <= TIRE_LISTING_QUANTITY_MAX,
    )
    .slice(0, 10)
    .map(String);
  if (valid.length > 0) {
    sink.setJoined('tire_quantities', valid);
  }
}

function appendTireBooleanFlags(sink: TireUrlParamSink, filters: TireCoreFiltersInput): void {
  if (filters.tire_studded) sink.setScalar('tire_studded', true);
  if (filters.tire_run_flat) sink.setScalar('tire_run_flat', true);
  if (filters.tire_reinforced_xl) sink.setScalar('tire_reinforced_xl', true);
  if (filters.tire_spare_donut) sink.setScalar('tire_spare_donut', true);
  if (filters.tire_tubeless) sink.setScalar('tire_tubeless', true);
  if (filters.tire_acoustic) sink.setScalar('tire_acoustic', true);
}

export function appendOptionalIntParamToSink(
  sink: TireUrlParamSink,
  raw: string,
  key: string,
): void {
  if (!raw || raw.trim() === '') return;
  const n = parseInt(raw.replace(/\s/g, ''), 10);
  if (!Number.isNaN(n)) {
    sink.setScalar(key, n);
  }
}

export function appendTireFallbackScalars(sink: TireUrlParamSink, filters: FilterState): void {
  appendOptionalIntParamToSink(sink, filters.price_gte, 'price_gte');
  appendOptionalIntParamToSink(sink, filters.price_lte, 'price_lte');
  if (filters.urgent) sink.setScalar('urgent', true);
  if (filters.seller_type === 'Individual' || filters.seller_type === 'Business') {
    sink.setScalar('seller_type', filters.seller_type);
  }
  if (filters.currency?.trim()) {
    sink.setScalar('currency', filters.currency.trim());
  }
  if (filters.sortBy && filters.sortBy !== 'created_at') {
    sink.setScalar('sortBy', filters.sortBy);
  }
  if (filters.sortOrder && filters.sortOrder !== 'DESC') {
    sink.setScalar('sortOrder', filters.sortOrder);
  }
}

export function appendTireCoreFilters(sink: TireUrlParamSink, filters: TireCoreFiltersInput): void {
  if (filters.tire_vehicle_type && ['car', 'truck', 'moto'].includes(filters.tire_vehicle_type)) {
    sink.setScalar('tireVehicleType', filters.tire_vehicle_type);
  }

  appendTireUuidIds(sink, 'tire_brand_ids', filters.tire_brand_ids);
  appendTireUuidIds(sink, 'tire_model_ids', filters.tire_model_ids);
  appendTireWidths(sink, filters.tire_widths);
  appendTireProfiles(sink, filters.tire_profiles);
  appendTireDiameters(sink, filters.tire_diameters);
  appendTireSeasons(sink, filters.tire_seasons);
  appendTireConditions(sink, filters.tire_conditions);
  appendTireQuantities(sink, filters.tire_quantities);
  appendTireBooleanFlags(sink, filters);
}

export function appendTireCityValues(sink: TireUrlParamSink, cities: string[]): void {
  const cityVals = cities.filter((c) => c !== 'all' && c !== '' && !c.startsWith('__category__'));
  if (cityVals.length > 0) {
    sink.setJoined('cities', cityVals);
  }
}

export function appendTireFiltersToUrlSink(sink: TireUrlParamSink, filters: FilterState): void {
  appendTireCityValues(sink, filters.cities);
  appendTireCoreFilters(sink, filters);
  appendTireFallbackScalars(sink, filters);
}
