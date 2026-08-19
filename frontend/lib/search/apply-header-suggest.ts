import type { CatalogSuggestItem } from '@/lib/search/header-catalog-suggest.types';

type BuildHeaderSuggestPathOptions = {
  currentYear: string;
  currentVehicleType?: 'car' | 'truck' | 'moto';
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CATALOG_YEAR_MIN = 1940;

function catalogVehicleType(
  value: string | null | undefined,
): 'car' | 'truck' | 'moto' | undefined {
  if (value === 'car' || value === 'truck' || value === 'moto') {
    return value;
  }
  return undefined;
}

function catalogSlug(value: string | null | undefined): string | undefined {
  if (!value || !SLUG_RE.test(value)) {
    return undefined;
  }
  return value;
}

function catalogYear(value: number | null, maxYear: number): number | undefined {
  if (value === null || !Number.isInteger(value) || value < CATALOG_YEAR_MIN || value > maxYear) {
    return undefined;
  }
  return value;
}

export function buildHeaderSuggestPath(
  item: CatalogSuggestItem,
  options: BuildHeaderSuggestPathOptions,
): string {
  const params = new URLSearchParams();
  const vehicleType =
    catalogVehicleType(item.vehicleType) ?? catalogVehicleType(options.currentVehicleType) ?? 'car';
  const brandSlug = catalogSlug(item.brandSlug);
  const modelSlug = catalogSlug(item.modelSlug);
  const maxYear = Number.parseInt(options.currentYear, 10);
  const year = Number.isInteger(maxYear) ? catalogYear(item.year, maxYear) : undefined;
  if (brandSlug) {
    params.set('brand', brandSlug);
  }
  if (modelSlug) {
    params.set('model', modelSlug);
  }
  if (vehicleType !== 'car') {
    params.set('vehicleType', vehicleType);
  }
  if (year !== undefined) {
    const yearText = String(year);
    params.set('year_gte', yearText);
    if (yearText !== options.currentYear) {
      params.set('year_lte', yearText);
    }
  }
  const query = params.toString();
  return query ? `/?${query}` : '/';
}
