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

function getRangeKeys(): Array<{
  gte: string;
  lte: string;
  errorKey: string;
  parse: (_s: string) => number;
}> {
  return [
    {
      gte: 'year_gte',
      lte: 'year_lte',
      errorKey: 'searchFilters.yearFromGreaterThanTo',
      parse: (s) => parseInt(s, 10),
    },
    {
      gte: 'price_gte',
      lte: 'price_lte',
      errorKey: 'searchFilters.priceFromGreaterThanTo',
      parse: (s) => parseInt(s, 10),
    },
    {
      gte: 'mileage_gte',
      lte: 'mileage_lte',
      errorKey: 'searchFilters.mileageFromGreaterThanTo',
      parse: (s) => parseInt(s, 10),
    },
    {
      gte: 'engine_displ_l_gte',
      lte: 'engine_displ_l_lte',
      errorKey: 'searchFilters.engineFromGreaterThanTo',
      parse: (s) => parseFloat(s),
    },
    {
      gte: 'horsepower_gte',
      lte: 'horsepower_lte',
      errorKey: 'searchFilters.horsepowerFromGreaterThanTo',
      parse: (s) => parseInt(s, 10),
    },
  ];
}

export function getFilterRangesValidationError(
  filters: Record<string, string | undefined>,
): string | null {
  for (const { gte, lte, errorKey, parse } of getRangeKeys()) {
    const gteVal = filters[gte];
    const lteVal = filters[lte];
    if (gteVal && lteVal) {
      const a = parse(gteVal);
      const b = parse(lteVal);
      if (!Number.isNaN(a) && !Number.isNaN(b) && a > b) return errorKey;
    }
  }
  return null;
}
