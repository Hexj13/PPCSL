export function getYearRange() {
  return { min: 1940, max: new Date().getFullYear() };
}

export const PRICE_RANGE = { min: 0, max: 999_999_999 };
export const MILEAGE_RANGE = { min: 0, max: 9_999_999 };
export const ENGINE_RANGE = { min: 0, max: 99 };
export const POWER_RANGE = { min: 1, max: 9_999 };

export type NumericRange = { min: number; max: number };

export function clampToRange(value: number, range: NumericRange): number {
  return Math.max(range.min, Math.min(range.max, value));
}

export function isInRange(value: number, range: NumericRange): boolean {
  return value >= range.min && value <= range.max;
}

export function validateMinMax(
  min: number | null,
  max: number | null,
  range: NumericRange,
): { min: number | null; max: number | null } {
  if (min === null && max === null) return { min: null, max: null };
  const clampedMin = min !== null ? clampToRange(min, range) : null;
  const clampedMax = max !== null ? clampToRange(max, range) : null;
  if (clampedMin !== null && clampedMax !== null && clampedMin > clampedMax) {
    return { min: clampedMax, max: clampedMin };
  }
  return { min: clampedMin, max: clampedMax };
}

export type FilterState = Record<string, string | undefined>;

function cleanYearRangeValue(value: string): string {
  return value.trim();
}

function cleanPriceRangeValue(value: string): string {
  return value.replace(/\s/g, '');
}

function cleanDigitRangeValue(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

function cleanEngineRangeValue(value: string): string {
  return value.replace(',', '.').trim();
}

function getRangeKeys(): Array<{
  gte: string;
  lte: string;
  errorKey: string;
  clean: (_value: string) => string;
  parse: (_s: string) => number;
}> {
  return [
    {
      gte: 'year_gte',
      lte: 'year_lte',
      errorKey: 'searchFilters.yearFromGreaterThanTo',
      clean: cleanYearRangeValue,
      parse: (s) => parseInt(s, 10),
    },
    {
      gte: 'price_gte',
      lte: 'price_lte',
      errorKey: 'searchFilters.priceFromGreaterThanTo',
      clean: cleanPriceRangeValue,
      parse: (s) => parseInt(s, 10),
    },
    {
      gte: 'mileage_gte',
      lte: 'mileage_lte',
      errorKey: 'searchFilters.mileageFromGreaterThanTo',
      clean: cleanDigitRangeValue,
      parse: (s) => parseInt(s, 10),
    },
    {
      gte: 'engine_displ_l_gte',
      lte: 'engine_displ_l_lte',
      errorKey: 'searchFilters.engineFromGreaterThanTo',
      clean: cleanEngineRangeValue,
      parse: (s) => parseFloat(s),
    },
    {
      gte: 'horsepower_gte',
      lte: 'horsepower_lte',
      errorKey: 'searchFilters.horsepowerFromGreaterThanTo',
      clean: cleanDigitRangeValue,
      parse: (s) => parseInt(s, 10),
    },
  ];
}

function readCleanedRangeValue(
  filters: Record<string, unknown>,
  key: string,
  clean: (_value: string) => string,
): string | undefined {
  const raw = filters[key];
  if (typeof raw !== 'string') {
    return undefined;
  }
  return clean(raw);
}

export function normalizeFilterRangeOrder<T extends object>(filters: T): T {
  const next: Record<string, unknown> = { ...(filters as Record<string, unknown>) };
  for (const { gte, lte, clean, parse } of getRangeKeys()) {
    const gteVal = readCleanedRangeValue(next, gte, clean);
    const lteVal = readCleanedRangeValue(next, lte, clean);
    if (gteVal !== undefined) {
      next[gte] = gteVal;
    }
    if (lteVal !== undefined) {
      next[lte] = lteVal;
    }
    if (!gteVal || !lteVal) {
      continue;
    }
    const from = parse(gteVal);
    const to = parse(lteVal);
    if (!Number.isNaN(from) && !Number.isNaN(to) && from > to) {
      next[gte] = lteVal;
      next[lte] = gteVal;
    }
  }
  return next as T;
}

export function getFilterRangesValidationError(
  filters: Record<string, string | undefined>,
): string | null {
  for (const { gte, lte, errorKey, clean, parse } of getRangeKeys()) {
    const gteVal = readCleanedRangeValue(filters, gte, clean);
    const lteVal = readCleanedRangeValue(filters, lte, clean);
    if (gteVal && lteVal) {
      const a = parse(gteVal);
      const b = parse(lteVal);
      if (!Number.isNaN(a) && !Number.isNaN(b) && a > b) return errorKey;
    }
  }
  return null;
}
