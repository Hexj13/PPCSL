import {
  CATALOG_SUGGEST_LIMIT,
  CATALOG_SUGGEST_VEHICLE_TYPES,
  type CatalogSuggestIndexDocument,
  type CatalogSuggestItem,
  type CatalogSuggestKind,
  type CatalogSuggestVehicleType,
} from './catalog-suggest.types';
import { parseCatalogSuggestQuery } from './parse-catalog-suggest-query';

const KIND_SCORE: Record<CatalogSuggestKind, number> = {
  brand_model_year: 700,
  brand_model: 600,
  brand: 500,
  model_year: 400,
  model: 300,
  year: 200,
};

type MatchOptions = {
  vehicleType?: CatalogSuggestVehicleType;
  limit?: number;
  nowYear: number;
};

function keysMatchPrefix(keys: string[], token: string): boolean {
  return keys.some((key) => key.startsWith(token));
}

function keysExact(keys: string[], token: string): boolean {
  return keys.includes(token);
}

function explodeVehicleTypes(
  types: CatalogSuggestVehicleType[],
  filter?: CatalogSuggestVehicleType,
): CatalogSuggestVehicleType[] {
  const ordered = CATALOG_SUGGEST_VEHICLE_TYPES.filter((type) => types.includes(type));
  if (!filter) {
    return ordered;
  }
  return ordered.filter((type) => type === filter);
}

function itemKey(item: CatalogSuggestItem): string {
  return [
    item.kind,
    item.brandSlug ?? '',
    item.modelSlug ?? '',
    item.vehicleType ?? '',
    item.year ?? '',
  ].join('|');
}

function kindForModel(year: number | null): CatalogSuggestKind {
  return year !== null ? 'model_year' : 'model';
}

function kindForBrandModel(year: number | null): CatalogSuggestKind {
  return year !== null ? 'brand_model_year' : 'brand_model';
}

function scoreItem(
  item: CatalogSuggestItem,
  brandKeys: string[],
  firstToken: string | undefined,
): number {
  let score = KIND_SCORE[item.kind];
  if (firstToken && keysExact(brandKeys, firstToken)) {
    score += 40;
  }
  if (item.year !== null) {
    score += 10;
  }
  return score;
}

export function matchCatalogSuggest(
  index: CatalogSuggestIndexDocument[],
  rawQuery: string,
  options: MatchOptions,
): CatalogSuggestItem[] {
  const parsed = parseCatalogSuggestQuery(rawQuery, options.nowYear);
  if (!parsed) {
    return [];
  }

  const limit = Math.min(options.limit ?? CATALOG_SUGGEST_LIMIT, CATALOG_SUGGEST_LIMIT);
  const years = [parsed.exactYear];

  const scored: Array<{ item: CatalogSuggestItem; score: number; brandKeys: string[] }> = [];
  const seen = new Set<string>();

  const push = (
    item: CatalogSuggestItem,
    brandKeys: string[],
    firstToken: string | undefined,
  ): void => {
    const key = itemKey(item);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    scored.push({ item, score: scoreItem(item, brandKeys, firstToken), brandKeys });
  };

  if (parsed.nameTokens.length === 0) {
    for (const year of years) {
      if (year === null) {
        continue;
      }
      push(
        {
          kind: 'year',
          title: String(year),
          brandName: null,
          vehicleType: null,
          logoUrl: null,
          brandSlug: null,
          modelSlug: null,
          year,
        },
        [],
        undefined,
      );
    }
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.item);
  }

  const brandDocs = index.filter((doc) => doc.modelId === null);
  const modelDocs = index.filter((doc) => doc.modelId !== null);
  const firstToken = parsed.nameTokens[0];

  if (parsed.nameTokens.length === 1) {
    const matchingBrands = brandDocs.filter((doc) =>
      keysMatchPrefix(doc.brandSearchKeys, firstToken),
    );
    const matchingBrandIds = new Set(matchingBrands.map((doc) => doc.brandId));

    for (const doc of matchingBrands) {
      for (const vehicleType of explodeVehicleTypes(doc.vehicleTypes, options.vehicleType)) {
        for (const year of years) {
          push(
            {
              kind: 'brand',
              title: doc.brandName,
              brandName: doc.brandName,
              vehicleType,
              logoUrl: doc.logoUrl,
              brandSlug: doc.brandSlug,
              modelSlug: null,
              year,
            },
            doc.brandSearchKeys,
            firstToken,
          );
        }
      }
    }

    const matchingModels = modelDocs.filter(
      (doc) =>
        !matchingBrandIds.has(doc.brandId) && keysMatchPrefix(doc.modelSearchKeys, firstToken),
    );
    for (const doc of matchingModels) {
      for (const vehicleType of explodeVehicleTypes(doc.vehicleTypes, options.vehicleType)) {
        for (const year of years) {
          push(
            {
              kind: kindForModel(year),
              title: doc.modelName ?? '',
              brandName: doc.brandName,
              vehicleType,
              logoUrl: doc.logoUrl,
              brandSlug: doc.brandSlug,
              modelSlug: doc.modelSlug,
              year,
            },
            doc.brandSearchKeys,
            firstToken,
          );
        }
      }
    }
  } else {
    const modelJoined = parsed.nameTokens.slice(1).join('');
    const modelMatches = modelDocs.filter((doc) => {
      const brandOk = keysMatchPrefix(doc.brandSearchKeys, firstToken);
      const modelOk = parsed.nameTokens
        .slice(1)
        .every(
          (token) =>
            keysMatchPrefix(doc.modelSearchKeys, token) ||
            doc.modelSearchKeys.some((key) => key.includes(token)),
        );
      const joinedOk = keysMatchPrefix(doc.modelSearchKeys, modelJoined);
      return brandOk && (modelOk || joinedOk);
    });

    for (const doc of modelMatches) {
      for (const vehicleType of explodeVehicleTypes(doc.vehicleTypes, options.vehicleType)) {
        for (const year of years) {
          push(
            {
              kind: kindForBrandModel(year),
              title: `${doc.brandName} ${doc.modelName}`,
              brandName: doc.brandName,
              vehicleType,
              logoUrl: doc.logoUrl,
              brandSlug: doc.brandSlug,
              modelSlug: doc.modelSlug,
              year,
            },
            doc.brandSearchKeys,
            firstToken,
          );
        }
      }
    }

    const matchingBrands = brandDocs.filter((doc) =>
      keysMatchPrefix(doc.brandSearchKeys, firstToken),
    );
    for (const doc of matchingBrands) {
      for (const vehicleType of explodeVehicleTypes(doc.vehicleTypes, options.vehicleType)) {
        for (const year of years) {
          push(
            {
              kind: 'brand',
              title: doc.brandName,
              brandName: doc.brandName,
              vehicleType,
              logoUrl: doc.logoUrl,
              brandSlug: doc.brandSlug,
              modelSlug: null,
              year,
            },
            doc.brandSearchKeys,
            firstToken,
          );
        }
      }
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}
