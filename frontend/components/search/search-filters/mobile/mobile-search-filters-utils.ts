import type { FilterState } from '@/hooks/useSearchFilters';
import { TIRE_LISTING_QUANTITY_MAX, TIRE_LISTING_QUANTITY_MIN } from '@/lib/constants';

export type MobileTranslateFn = (_key: string, _params?: Record<string, string | number>) => string;

export function summarizeMulti(
  ids: string[],
  options: Array<{ value: string; label: string }>,
  t: MobileTranslateFn,
): string {
  if (!ids.length) return '';
  const labels = ids
    .map((id) => options.find((o) => o.value === id)?.label)
    .filter((x): x is string => Boolean(x));
  if (!labels.length) return '';
  if (labels.length === 1) return labels[0];
  return t('common.selectedCount', { count: labels.length });
}

export function formatPriceWithSpaces(value: string): string {
  if (!value || value === '') return '';
  const numericValue = value.replace(/\s/g, '');
  if (!numericValue) return '';
  return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export const sanitizeEngineInput = (raw: string): string | null => {
  let value = raw.replace(',', '.');
  value = value.replace(/[^0-9.]/g, '');
  const parts = value.split('.');
  if (parts.length > 2) {
    value = parts[0] + '.' + parts.slice(1).join('');
  }
  if (parts.length === 2 && parts[1].length > 1) {
    value = parts[0] + '.' + parts[1].substring(0, 1);
  }
  const numValue = value === '' ? 0 : parseFloat(value);
  if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= 99)) {
    return value;
  }
  return null;
};

export const sanitizeHorsepowerInput = (raw: string): string | null => {
  const value = raw.replace(/[^0-9]/g, '');
  if (value === '' || (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 9999)) {
    return value;
  }
  return null;
};

export const TIRE_QUANTITY_FILTER_OPTIONS = Array.from(
  { length: TIRE_LISTING_QUANTITY_MAX - TIRE_LISTING_QUANTITY_MIN + 1 },
  (_, i) => {
    const v = String(TIRE_LISTING_QUANTITY_MIN + i);
    return { value: v, label: v };
  },
);

export function defaultYearLte(yearLte: string | undefined): string {
  const trimmed = yearLte?.trim() ?? '';
  return trimmed !== '' ? trimmed : String(new Date().getFullYear());
}

export function normalizeYearRangeOrder(
  yearGte: string,
  yearLte: string,
): { yearGte: string; yearLte: string } {
  const a = parseInt(yearGte, 10);
  const b = parseInt(yearLte, 10);
  if (Number.isNaN(a) || Number.isNaN(b) || a <= b) {
    return { yearGte: yearGte, yearLte: yearLte };
  }
  return { yearGte: yearLte, yearLte: yearGte };
}

export function normalizePriceRangeOrder(
  priceGte: string,
  priceLte: string,
): { priceGte: string; priceLte: string } {
  const gteClean = priceGte.replace(/\s/g, '');
  const lteClean = priceLte.replace(/\s/g, '');
  const g = parseInt(gteClean, 10);
  const l = parseInt(lteClean, 10);
  if (Number.isNaN(g) || Number.isNaN(l) || g <= l) {
    return { priceGte: gteClean, priceLte: lteClean };
  }
  return { priceGte: lteClean, priceLte: gteClean };
}

export function normalizeMileageRangeOrder(
  mileageGte: string,
  mileageLte: string,
): { mileageGte: string; mileageLte: string } {
  const gteClean = mileageGte.replace(/[^0-9]/g, '');
  const lteClean = mileageLte.replace(/[^0-9]/g, '');
  const g = parseInt(gteClean, 10);
  const l = parseInt(lteClean, 10);
  if (Number.isNaN(g) || Number.isNaN(l) || g <= l) {
    return { mileageGte: gteClean, mileageLte: lteClean };
  }
  return { mileageGte: lteClean, mileageLte: gteClean };
}

export function normalizeHorsepowerRangeOrder(
  horsepowerGte: string,
  horsepowerLte: string,
): { horsepowerGte: string; horsepowerLte: string } {
  const gteClean = horsepowerGte.replace(/[^0-9]/g, '');
  const lteClean = horsepowerLte.replace(/[^0-9]/g, '');
  const g = parseInt(gteClean, 10);
  const l = parseInt(lteClean, 10);
  if (Number.isNaN(g) || Number.isNaN(l) || g <= l) {
    return { horsepowerGte: gteClean, horsepowerLte: lteClean };
  }
  return { horsepowerGte: lteClean, horsepowerLte: gteClean };
}

export function normalizeEngineDisplacementRangeOrder(
  engineGte: string,
  engineLte: string,
): { engineGte: string; engineLte: string } {
  const parseNum = (s: string): number => {
    const normalized = s.replace(',', '.').trim();
    if (normalized === '') return NaN;
    const n = parseFloat(normalized);
    return Number.isNaN(n) ? NaN : n;
  };
  const g = parseNum(engineGte);
  const l = parseNum(engineLte);
  if (Number.isNaN(g) || Number.isNaN(l) || g <= l) {
    return { engineGte: engineGte.trim(), engineLte: engineLte.trim() };
  }
  return { engineGte: engineLte.trim(), engineLte: engineGte.trim() };
}

export function tireFeatureValuesFromState(s: Partial<FilterState> | FilterState): string[] {
  const values: string[] = [];
  if (s.tire_studded) values.push('tire_studded');
  if (s.tire_run_flat) values.push('tire_run_flat');
  if (s.tire_reinforced_xl) values.push('tire_reinforced_xl');
  if (s.tire_spare_donut) values.push('tire_spare_donut');
  if (s.tire_tubeless) values.push('tire_tubeless');
  if (s.tire_acoustic) values.push('tire_acoustic');
  return values;
}
