export const HEADER_CATALOG_SUGGEST_MIN_CHARS = 3;
export const HEADER_CATALOG_SUGGEST_MAX_CHARS = 64;
export const HEADER_CATALOG_SUGGEST_DEBOUNCE_MS = 200;

export type CatalogSuggestVehicleType = 'car' | 'truck' | 'moto';

export type CatalogSuggestKind =
  | 'brand'
  | 'brand_model'
  | 'brand_model_year'
  | 'model'
  | 'model_year'
  | 'year';

export type CatalogSuggestItem = {
  kind: CatalogSuggestKind;
  title: string;
  brandName: string | null;
  vehicleType: CatalogSuggestVehicleType | null;
  logoUrl: string | null;
  brandSlug: string | null;
  modelSlug: string | null;
  year: number | null;
};

export function countAlphanumeric(value: string): number {
  return (value.match(/\p{L}|\p{N}/gu) ?? []).length;
}

export function hasMinHeaderSuggestChars(value: string): boolean {
  return countAlphanumeric(value) >= HEADER_CATALOG_SUGGEST_MIN_CHARS;
}
