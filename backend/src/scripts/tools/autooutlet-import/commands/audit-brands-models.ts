import type { PlatformApiClient } from '../../partner-import-shared/api/platform-api';
import {
  adaptSourceModelForBrand,
  buildBrandCandidateKeys,
  findModelBySourceName,
} from '../../partner-import-shared/mapping/brand-model-resolver';
import type {
  AutooutletBrandModelPair,
  AutooutletBrandsModelsAuditReport,
  ModelInfo,
  RegistryItem,
  RuntimeEnv,
} from '../types';

type VehicleType = 'car';

interface AuditBrandsModelsInput {
  startedAt: string;
  env: RuntimeEnv;
  registryItems: RegistryItem[];
  platformApi: PlatformApiClient;
  vehicleType: VehicleType;
}

interface ExtractedPair extends AutooutletBrandModelPair {
  normBrand: string;
  normModel: string;
}

export async function auditBrandsModels(
  input: AuditBrandsModelsInput,
): Promise<AutooutletBrandsModelsAuditReport> {
  const completedAt = new Date().toISOString();
  const startedMs = Date.parse(input.startedAt);
  const completedMs = Date.parse(completedAt);
  const elapsedMs = Number.isFinite(startedMs) ? Math.max(0, completedMs - startedMs) : 0;

  const pairsByKey = new Map<string, ExtractedPair>();
  const brandDisplayByNorm = new Map<string, string>();
  let invalidPairs = 0;

  for (const item of input.registryItems) {
    const brand = (item.brand ?? item.parsedData?.brand ?? '').trim();
    const model = (item.model ?? item.parsedData?.model ?? '').trim();
    if (!brand || !model) {
      invalidPairs += 1;
      continue;
    }

    const normBrand = normalize(brand);
    const normModel = normalize(model);
    if (!normBrand || !normModel) {
      invalidPairs += 1;
      continue;
    }

    const key = `${normBrand}||${normModel}`;
    if (!pairsByKey.has(key)) {
      pairsByKey.set(key, { brand, model, normBrand, normModel });
    }
    if (!brandDisplayByNorm.has(normBrand)) {
      brandDisplayByNorm.set(normBrand, brand);
    }
  }

  const ourBrands = await input.platformApi.getBrands(input.vehicleType);
  const ourBrandByNorm = new Map<string, { id: string; name: string }>();
  const ourBrandById = new Map<string, { id: string; name: string }>();
  for (const brand of ourBrands) {
    const norm = normalize(brand.name);
    if (!ourBrandByNorm.has(norm)) {
      ourBrandByNorm.set(norm, { id: brand.id, name: brand.name });
    }
    if (!ourBrandById.has(brand.id)) {
      ourBrandById.set(brand.id, { id: brand.id, name: brand.name });
    }
  }

  const missingBrands = [] as string[];
  const neededBrandIds = new Set<string>();

  for (const [normBrand, displayBrand] of brandDisplayByNorm.entries()) {
    const ourBrand = ourBrandByNorm.get(normBrand);
    if (!ourBrand) {
      missingBrands.push(displayBrand);
      continue;
    }
  }

  for (const extracted of pairsByKey.values()) {
    for (const brandId of resolveBrandCandidateIds(
      extracted.brand,
      extracted.model,
      ourBrandByNorm,
    )) {
      neededBrandIds.add(brandId);
    }
  }

  const modelsByBrandId = new Map<string, ModelInfo[]>();
  for (const brandId of neededBrandIds) {
    const models = await input.platformApi.getModelsByBrand(brandId, input.vehicleType);
    modelsByBrandId.set(brandId, models);
  }

  const missingModelsByKey = new Map<string, AutooutletBrandModelPair>();
  for (const extracted of pairsByKey.values()) {
    const candidateBrandIds = resolveBrandCandidateIds(
      extracted.brand,
      extracted.model,
      ourBrandByNorm,
    );
    if (candidateBrandIds.length === 0) continue;

    let matched = false;
    for (const brandId of candidateBrandIds) {
      const models = modelsByBrandId.get(brandId);
      if (!models) continue;
      const targetBrandName = ourBrandById.get(brandId)?.name ?? '';
      const adaptedModel = adaptSourceModelForBrand(extracted.model, targetBrandName);
      if (findModelBySourceName(models, adaptedModel)) {
        matched = true;
        break;
      }
    }

    if (!matched) {
      const key = `${extracted.normBrand}||${extracted.normModel}`;
      if (!missingModelsByKey.has(key)) {
        missingModelsByKey.set(key, { brand: extracted.brand, model: extracted.model });
      }
    }
  }

  const missingModels = [...missingModelsByKey.values()];

  missingBrands.sort(
    (a, b) =>
      normalize(a).localeCompare(normalize(b)) ||
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
  );
  missingModels.sort(
    (a, b) =>
      normalize(a.brand).localeCompare(normalize(b.brand)) ||
      normalize(a.model).localeCompare(normalize(b.model)),
  );

  return {
    startedAt: input.startedAt,
    completedAt,
    elapsedMs,
    env: input.env,
    vehicleType: input.vehicleType,
    flags: {
      registryItemsCount: input.registryItems.length,
    },
    stats: {
      uniqueBrands: brandDisplayByNorm.size,
      uniqueBrandModelsPairs: pairsByKey.size,
      invalidPairs,
      missingBrands: missingBrands.length,
      missingModels: missingModels.length,
    },
    missingBrands,
    missingModels,
  };
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function resolveBrandCandidateIds(
  sourceBrand: string,
  sourceModel: string,
  brandsByNorm: Map<string, { id: string; name: string }>,
): string[] {
  const ids: string[] = [];
  const keys = buildBrandCandidateKeys(sourceBrand, sourceModel);
  for (const key of keys) {
    const brand = brandsByNorm.get(key);
    if (!brand || ids.includes(brand.id)) {
      continue;
    }
    ids.push(brand.id);
  }
  return ids;
}
