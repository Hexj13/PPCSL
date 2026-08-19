export const CATALOG_SUGGEST_LIMIT = 12;
export const CATALOG_SUGGEST_MIN_ALPHANUMERIC = 3;
export const CATALOG_SUGGEST_YEAR_MIN = 1940;

export const CATALOG_SUGGEST_VEHICLE_TYPES = ['car', 'truck', 'moto'] as const;

export type CatalogSuggestVehicleType = (typeof CATALOG_SUGGEST_VEHICLE_TYPES)[number];

export type CatalogSuggestKind =
  | 'brand'
  | 'brand_model'
  | 'brand_model_year'
  | 'model'
  | 'model_year'
  | 'year';

export type CatalogSuggestIndexDocument = {
  brandId: string;
  brandName: string;
  brandSlug: string;
  logoUrl: string | null;
  brandSearchKeys: string[];
  modelId: string | null;
  modelName: string | null;
  modelSlug: string | null;
  modelSearchKeys: string[];
  vehicleTypes: CatalogSuggestVehicleType[];
};

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

export type CatalogSuggestQuery = {
  nameTokens: string[];
  exactYear: number | null;
};
