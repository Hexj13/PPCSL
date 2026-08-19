import { createSlug, normalizeForComparison } from '../../common/utils/slug.utils';

import { brandAliasesFor, buildSearchKeys, modelAliasesFor } from './catalog-suggest-keys';
import {
  CATALOG_SUGGEST_VEHICLE_TYPES,
  type CatalogSuggestIndexDocument,
  type CatalogSuggestVehicleType,
} from './catalog-suggest.types';

export const CATALOG_SUGGEST_EXCLUDED_BRANDS = ['Другая марка'];

type IndexBrandInput = {
  id: string;
  name: string;
  name_normalized?: string | null;
  logoUrl?: string | null;
  vehicle_types?: string[] | null;
  models?: IndexModelInput[] | null;
};

type IndexModelInput = {
  id: string;
  name: string;
  name_normalized?: string | null;
  vehicle_types?: string[] | null;
  is_archived?: boolean;
};

function asVehicleTypes(values: string[] | null | undefined): CatalogSuggestVehicleType[] {
  if (!values?.length) {
    return [];
  }
  const allowed = new Set<string>(CATALOG_SUGGEST_VEHICLE_TYPES);
  const result: CatalogSuggestVehicleType[] = [];
  for (const value of values) {
    if (allowed.has(value) && !result.includes(value as CatalogSuggestVehicleType)) {
      result.push(value as CatalogSuggestVehicleType);
    }
  }
  return result;
}

function resolveVehicleTypes(
  brandTypes: CatalogSuggestVehicleType[],
  modelTypes: CatalogSuggestVehicleType[],
): CatalogSuggestVehicleType[] {
  if (modelTypes.length > 0) {
    return modelTypes;
  }
  if (brandTypes.length > 0) {
    return brandTypes;
  }
  return ['car'];
}

export function buildCatalogSuggestIndex(brands: IndexBrandInput[]): CatalogSuggestIndexDocument[] {
  const documents: CatalogSuggestIndexDocument[] = [];

  for (const brand of brands) {
    if (CATALOG_SUGGEST_EXCLUDED_BRANDS.includes(brand.name)) {
      continue;
    }
    const brandNorm = brand.name_normalized?.trim() || normalizeForComparison(brand.name);
    const brandSearchKeys = buildSearchKeys(brand.name, brandNorm, brandAliasesFor(brandNorm));
    const activeModels = (brand.models ?? []).filter((model) => !model.is_archived);
    const brandTypesFromModels = asVehicleTypes(
      activeModels.flatMap((model) => model.vehicle_types ?? []),
    );
    const brandTypes = resolveVehicleTypes(
      asVehicleTypes(brand.vehicle_types),
      brandTypesFromModels,
    );

    documents.push({
      brandId: brand.id,
      brandName: brand.name,
      brandSlug: createSlug(brand.name),
      logoUrl: brand.logoUrl ?? null,
      brandSearchKeys,
      modelId: null,
      modelName: null,
      modelSlug: null,
      modelSearchKeys: [],
      vehicleTypes: brandTypes,
    });

    for (const model of activeModels) {
      const modelNorm = model.name_normalized?.trim() || normalizeForComparison(model.name);
      documents.push({
        brandId: brand.id,
        brandName: brand.name,
        brandSlug: createSlug(brand.name),
        logoUrl: brand.logoUrl ?? null,
        brandSearchKeys,
        modelId: model.id,
        modelName: model.name,
        modelSlug: createSlug(model.name),
        modelSearchKeys: buildSearchKeys(model.name, modelNorm, modelAliasesFor(modelNorm)),
        vehicleTypes: resolveVehicleTypes(brandTypes, asVehicleTypes(model.vehicle_types)),
      });
    }
  }

  return documents;
}
