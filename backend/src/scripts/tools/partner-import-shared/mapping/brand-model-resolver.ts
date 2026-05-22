import type { KupitoApiClient } from '../api/kupito-api';
import type { BrandInfo, ModelInfo } from '../listing-types';

export type BrandModelVehicleType = 'car' | 'truck' | 'moto';

export type BrandModelResolverContext = {
  sourceListingId?: string;
};

export type BrandModelAutoCreateLog = (payload: Record<string, unknown>) => void;

export type BrandModelAutoCreateOptions = {
  autoCreateBrands: boolean;
  autoCreateModels: boolean;
  log?: BrandModelAutoCreateLog;
};

function isHttp409Conflict(error: unknown): boolean {
  return String(error).includes('HTTP 409');
}

export class BrandModelResolver {
  private readonly brandsByVehicleType = new Map<BrandModelVehicleType, BrandInfo[] | null>();
  private readonly modelsByBrandCache = new Map<string, ModelInfo[]>();

  constructor(
    private readonly kupitoApi: KupitoApiClient,
    private readonly autoCreate: BrandModelAutoCreateOptions = {
      autoCreateBrands: false,
      autoCreateModels: false,
    },
  ) {}

  async resolve(
    brandName?: string,
    modelName?: string,
    vehicleType: BrandModelVehicleType = 'car',
    context?: BrandModelResolverContext,
  ): Promise<{ brandId: string; modelId: string }> {
    if (!brandName || !modelName) {
      throw new Error(`Brand/model missing. brand="${brandName}" model="${modelName}"`);
    }

    return this.resolveWithAutoCreate(brandName, modelName, vehicleType, {
      retriedAfterBrandCreate: false,
      retriedAfterModelCreate: false,
      sourceListingId: context?.sourceListingId,
    });
  }

  private emitPartnerImportCatalog(payload: Record<string, unknown>): void {
    this.autoCreate.log?.(payload);
  }

  private async resolveWithAutoCreate(
    brandName: string,
    modelName: string,
    vehicleType: BrandModelVehicleType,
    state: {
      retriedAfterBrandCreate: boolean;
      retriedAfterModelCreate: boolean;
      sourceListingId?: string;
    },
  ): Promise<{ brandId: string; modelId: string }> {
    const brands = await this.getBrands(vehicleType);
    const brandCandidates = findBrandCandidates(brands, brandName, modelName);
    if (brandCandidates.length === 0) {
      if (!this.autoCreate.autoCreateBrands || state.retriedAfterBrandCreate) {
        throw new Error(`Brand not found in Kupito: ${brandName}`);
      }
      try {
        const created = await this.kupitoApi.createBrand({
          name: brandName.trim(),
          vehicleTypes: [vehicleType],
        });
        this.emitPartnerImportCatalog({
          event: 'partner_import_catalog_auto_create_brand_created',
          sourceListingId: state.sourceListingId,
          brandId: created.id,
          name: created.name,
          vehicleType,
        });
      } catch (error) {
        if (isHttp409Conflict(error)) {
          this.emitPartnerImportCatalog({
            event: 'partner_import_catalog_auto_create_brand_conflict',
            sourceListingId: state.sourceListingId,
            name: brandName.trim(),
            vehicleType,
          });
          this.invalidateBrandsCache(vehicleType);
          return this.resolveWithAutoCreate(brandName, modelName, vehicleType, {
            ...state,
            retriedAfterBrandCreate: true,
          });
        }
        throw error;
      }
      this.invalidateBrandsCache(vehicleType);
      return this.resolveWithAutoCreate(brandName, modelName, vehicleType, {
        ...state,
        retriedAfterBrandCreate: true,
      });
    }

    for (const brand of brandCandidates) {
      const models = await this.getModelsByBrand(brand.id, vehicleType);
      const adaptedModelName = adaptSourceModelForBrand(modelName, brand.name);
      const model = findModelBySourceName(models, adaptedModelName);
      if (model) {
        return {
          brandId: brand.id,
          modelId: model.id,
        };
      }
    }

    if (!this.autoCreate.autoCreateModels || state.retriedAfterModelCreate) {
      throw new Error(`Model not found in Kupito: ${brandName} ${modelName}`);
    }
    const primaryBrand = brandCandidates[0];
    const modelToCreate =
      adaptSourceModelForBrand(modelName, primaryBrand.name).trim() || modelName.trim();
    try {
      const created = await this.kupitoApi.createModel({
        brandId: primaryBrand.id,
        name: modelToCreate,
        vehicleTypes: [vehicleType],
      });
      this.emitPartnerImportCatalog({
        event: 'partner_import_catalog_auto_create_model_created',
        sourceListingId: state.sourceListingId,
        brandId: primaryBrand.id,
        modelId: created.id,
        name: created.name,
        vehicleType,
      });
    } catch (error) {
      if (isHttp409Conflict(error)) {
        this.emitPartnerImportCatalog({
          event: 'partner_import_catalog_auto_create_model_conflict',
          sourceListingId: state.sourceListingId,
          brandId: primaryBrand.id,
          name: modelToCreate,
          vehicleType,
        });
        this.invalidateModelsCache(primaryBrand.id, vehicleType);
        return this.resolveWithAutoCreate(brandName, modelName, vehicleType, {
          ...state,
          retriedAfterModelCreate: true,
        });
      }
      throw error;
    }
    this.invalidateModelsCache(primaryBrand.id, vehicleType);
    return this.resolveWithAutoCreate(brandName, modelName, vehicleType, {
      ...state,
      retriedAfterModelCreate: true,
    });
  }

  private invalidateBrandsCache(vehicleType: BrandModelVehicleType): void {
    this.brandsByVehicleType.delete(vehicleType);
  }

  private invalidateModelsCache(brandId: string, vehicleType: BrandModelVehicleType): void {
    this.modelsByBrandCache.delete(this.modelsCacheKey(brandId, vehicleType));
  }

  private async getBrands(vehicleType: BrandModelVehicleType): Promise<BrandInfo[]> {
    const cached = this.brandsByVehicleType.get(vehicleType);
    if (cached) {
      return cached;
    }
    const loaded = await this.kupitoApi.getBrands(vehicleType);
    this.brandsByVehicleType.set(vehicleType, loaded);
    return loaded;
  }

  private modelsCacheKey(brandId: string, vehicleType: BrandModelVehicleType): string {
    return `${brandId}:${vehicleType}`;
  }

  private async getModelsByBrand(
    brandId: string,
    vehicleType: BrandModelVehicleType,
  ): Promise<ModelInfo[]> {
    const key = this.modelsCacheKey(brandId, vehicleType);
    const cached = this.modelsByBrandCache.get(key);
    if (cached) {
      return cached;
    }
    const models = await this.kupitoApi.getModelsByBrand(brandId, vehicleType);
    this.modelsByBrandCache.set(key, models);
    return models;
  }
}

function findByNormalizedName<T extends { name: string; name_normalized?: string | null }>(
  list: T[],
  name: string,
): T | undefined {
  const normalized = normalize(name);
  return list.find((item) => {
    const itemNormalized = item.name_normalized?.trim() || normalize(item.name);
    return itemNormalized === normalized;
  });
}

export function findBrandCandidates<T extends { name: string; name_normalized?: string | null }>(
  list: T[],
  sourceBrandName: string,
  sourceModelName: string,
): T[] {
  const byNorm = new Map<string, T>();
  for (const item of list) {
    const itemNormalized = item.name_normalized?.trim() || normalize(item.name);
    if (!byNorm.has(itemNormalized)) {
      byNorm.set(itemNormalized, item);
    }
  }

  const keys = buildBrandCandidateKeys(sourceBrandName, sourceModelName);
  const result: T[] = [];
  for (const key of keys) {
    const candidate = byNorm.get(key);
    if (candidate && !result.includes(candidate)) {
      result.push(candidate);
    }
  }
  return result;
}

export function buildBrandCandidateKeys(
  sourceBrandName: string,
  sourceModelName: string,
): string[] {
  const normalizedBrand = normalize(sourceBrandName);
  const normalizedModel = normalize(sourceModelName);

  if (normalizedBrand === 'mercedes') {
    return ['mercedesbenz', normalizedBrand];
  }

  if (normalizedBrand === 'landrover' && normalizedModel.includes('rangerover')) {
    return ['rangerover', normalizedBrand];
  }

  const lynkcoKeys = new Set<string>();
  const maybeAddLynkco = (key: string) => {
    if (!key) return;
    lynkcoKeys.add(key);
  };
  if (
    normalizedBrand === 'lynk' ||
    normalizedBrand === 'lync' ||
    normalizedBrand === 'lynkco' ||
    normalizedBrand === 'lyncco' ||
    normalizedBrand === 'lyncoco' ||
    normalizedBrand === 'lynco'
  ) {
    maybeAddLynkco('lynkco');
    maybeAddLynkco(normalizedBrand);
    return [...lynkcoKeys];
  }

  return [normalizedBrand];
}

export function findModelBySourceName<T extends { name: string; name_normalized?: string | null }>(
  list: T[],
  sourceModelName: string,
): T | undefined {
  const exact = findByNormalizedName(list, sourceModelName);
  if (exact) {
    return exact;
  }

  const looseSource = normalizeLooseModelName(sourceModelName);
  if (!looseSource) {
    return undefined;
  }

  const looseBuckets = new Map<string, T[]>();
  for (const item of list) {
    const key = normalizeLooseModelName(item.name);
    if (!key) {
      continue;
    }
    const bucket = looseBuckets.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      looseBuckets.set(key, [item]);
    }
  }

  const sameLoose = looseBuckets.get(looseSource);
  if (sameLoose?.length === 1) {
    return sameLoose[0];
  }
  if (sameLoose && sameLoose.length > 1) {
    const rankedSameLoose = rankByPrefixSpecificity(sameLoose, sourceModelName);
    if (rankedSameLoose.length > 0) {
      return rankedSameLoose[0];
    }
  }

  const unambiguousByPrefix = [...looseBuckets.entries()].filter(
    ([candidate]) =>
      candidate.length >= 2 &&
      (looseSource.startsWith(candidate) || candidate.startsWith(looseSource)),
  );
  if (unambiguousByPrefix.length === 1 && unambiguousByPrefix[0][1].length === 1) {
    return unambiguousByPrefix[0][1][0];
  }

  const ranked = rankByPrefixSpecificity(list, sourceModelName);
  if (ranked.length > 0) {
    return ranked[0];
  }

  return undefined;
}

export function adaptSourceModelForBrand(sourceModelName: string, targetBrandName: string): string {
  const source = decodeHtmlEntities(sourceModelName).trim();
  const normalizedBrand = normalize(targetBrandName);
  if (normalizedBrand === 'rangerover') {
    return source.replace(/^range\s*rover\s+/i, '').trim() || source;
  }
  return source;
}

export function normalizeLooseModelName(value: string): string {
  const rawTokens = tokenizeModelName(value);
  const filteredTokens = rawTokens.filter(
    (token) => !MODEL_STOP_TOKENS.has(token) && !isTechnicalToken(token),
  );
  const baseTokens = filteredTokens.length > 0 ? filteredTokens : rawTokens;
  const hasAlphaToken = baseTokens.some((token) => /[a-z]/.test(token));
  const withoutPureNumeric = hasAlphaToken
    ? baseTokens.filter((token) => !/^\d{2,4}$/.test(token))
    : baseTokens;
  const tokens = withoutPureNumeric.length > 0 ? withoutPureNumeric : baseTokens;
  return tokens.join('');
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&amp;/gi, '&');
}

function tokenizeModelName(value: string): string[] {
  return decodeHtmlEntities(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function isTechnicalToken(token: string): boolean {
  if (/^[a-z]\d{1,4}[a-z]{0,3}$/.test(token)) {
    return true;
  }
  if (/^\d{1,3}(d|i|e|h|hp|cv)$/.test(token)) {
    return true;
  }
  return false;
}

function rankByPrefixSpecificity<T extends { name: string; name_normalized?: string | null }>(
  list: T[],
  sourceModelName: string,
): T[] {
  const sourceNorm = normalize(decodeHtmlEntities(sourceModelName));
  if (!sourceNorm) {
    return [];
  }

  const candidates = list
    .map((item) => ({
      item,
      itemNorm: item.name_normalized?.trim() || normalize(item.name),
    }))
    .filter(
      ({ itemNorm }) =>
        itemNorm && (sourceNorm.startsWith(itemNorm) || itemNorm.startsWith(sourceNorm)),
    )
    .sort((a, b) => b.itemNorm.length - a.itemNorm.length);

  if (candidates.length === 0) {
    return [];
  }

  const bestLength = candidates[0].itemNorm.length;
  const best = candidates.filter((candidate) => candidate.itemNorm.length === bestLength);
  if (best.length === 1) {
    return [best[0].item];
  }
  return [];
}

const MODEL_STOP_TOKENS = new Set([
  'series',
  'class',
  'gran',
  'tourer',
  'crossback',
  'line',
  'sport',
  'sportline',
  'gtline',
  'gt',
  'nline',
  'allterrain',
  'coupe',
  'twin',
  'engine',
  'awd',
  'fwd',
  'rwd',
  'xdrive',
  'quattro',
  'tfsi',
  'tfsie',
  'tsi',
  'tdi',
  'hdi',
  'dci',
  'phev',
  'hybrid',
  'polestar',
]);
