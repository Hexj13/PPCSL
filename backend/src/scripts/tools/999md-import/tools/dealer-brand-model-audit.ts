import * as fs from 'fs';
import * as path from 'path';

import type { BrandInfo, ModelInfo } from '../../partner-import-shared/listing-types';
import {
  adaptSourceModelForBrand,
  findBrandCandidates,
  findModelBySourceName,
} from '../../partner-import-shared/mapping/brand-model-resolver';
import { resolveSubcategoryToVehicleType } from '../mapping/subcategory-vehicle-type';
import type { AdvertRaw } from '../parsers/advert-types';

const GQL = process.env.SITE999MD_GRAPHQL_URL ?? 'https://999.md/graphql';
const DEFAULT_PLATFORM_API =
  process.env.PPCSL_IMPORT_API_URL ?? process.env.KUPITO_IMPORT_API_URL ?? 'http://localhost:4000';

const ADVERT_FRAGMENT = `
  id
  title
  subCategory {
    id
    url
    title {
      translated
    }
  }
  groups(placement: VIEW_ONE_DESKTOP) {
    title
    controls {
      type
      title
      option_title
      feature {
        id
        type
        value
      }
    }
  }
`;

type VehicleType = 'car' | 'truck' | 'moto';

interface PairKey {
  vehicleType: VehicleType;
  brand: string;
  model: string;
}

function pickTranslated(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value.trim() || undefined;
  }
  if (typeof value === 'object' && 'translated' in (value as object)) {
    const t = (value as { translated?: string }).translated;
    return typeof t === 'string' && t.trim() ? t.trim() : undefined;
  }
  return undefined;
}

function pickBodyText(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value.trim() || undefined;
  }
  if (typeof value === 'object') {
    const o = value as Record<string, string>;
    const ro = o.ro?.trim();
    const ru = o.ru?.trim();
    const tr = o.translated?.trim();
    return tr || ro || ru || undefined;
  }
  return undefined;
}

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (body.errors?.length) {
    throw new Error(body.errors.map((e) => e.message).join('; '));
  }
  if (!body.data) {
    throw new Error('Empty GraphQL data');
  }
  return body.data;
}

async function fetchAllAdIds(login: string, pageSize: number, maxAds?: number): Promise<string[]> {
  const ids: string[] = [];
  let skip = 0;
  let total = Infinity;
  while (skip < total) {
    const data = await gql<{
      profileAds: { count: number; ads: { id: string }[] };
    }>(
      `query ($login: String!, $skip: Int!, $limit: Int!) {
        profileAds(input: { login: $login, pagination: { skip: $skip, limit: $limit } }) {
          count
          ads { id }
        }
      }`,
      { login, skip, limit: pageSize },
    );
    total = data.profileAds.count;
    const batch = data.profileAds.ads.map((a) => String(a.id));
    for (const id of batch) {
      ids.push(id);
      if (maxAds !== undefined && ids.length >= maxAds) {
        return ids;
      }
    }
    if (batch.length === 0) {
      break;
    }
    skip += batch.length;
  }
  return ids;
}

function aliasForId(id: string): string {
  return `ad_${id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
}

async function fetchAdvertsBatch(ids: string[]): Promise<Map<string, AdvertRaw>> {
  const result = new Map<string, AdvertRaw>();
  if (ids.length === 0) {
    return result;
  }
  const parts = ids.map((id) => {
    const alias = aliasForId(id);
    return `${alias}: advert(input: { id: ${JSON.stringify(id)} }) { ${ADVERT_FRAGMENT} }`;
  });
  const query = `query DealerAuditBatch { ${parts.join('\n')} }`;
  const data = await gql<Record<string, AdvertRaw | null>>(query);
  for (const id of ids) {
    const alias = aliasForId(id);
    const advert = data[alias];
    if (advert) {
      result.set(id, advert);
    }
  }
  return result;
}

function extractBrandModel(advert: AdvertRaw): { brand?: string; model?: string } {
  let brand: string | undefined;
  let model: string | undefined;
  for (const group of advert.groups ?? []) {
    for (const control of group.controls ?? []) {
      const f = control.feature;
      if (f.id === 20 && f.type === 'FEATURE_OPTIONS') {
        brand = pickTranslated(f.value) ?? brand;
      }
      if (f.id === 21 && f.type === 'FEATURE_OPTIONS') {
        model = pickTranslated(f.value) ?? model;
      }
      if (f.id === 585 && f.type === 'FEATURE_TEXT') {
        const raw = typeof f.value === 'string' ? f.value.trim() : pickBodyText(f.value);
        if (raw) {
          model = model ?? raw;
        }
      }
    }
  }
  return { brand, model };
}

async function platformFetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${url}`);
  }
  return (await res.json()) as T;
}

async function loadPlatformCatalogue(
  baseUrl: string,
): Promise<Map<VehicleType, Map<string, { brand: BrandInfo; models: ModelInfo[] }>>> {
  const out = new Map<VehicleType, Map<string, { brand: BrandInfo; models: ModelInfo[] }>>();
  const vehicleTypes: VehicleType[] = ['car', 'truck', 'moto'];
  for (const vt of vehicleTypes) {
    const brands = await platformFetchJson<BrandInfo[]>(
      `${baseUrl.replace(/\/+$/, '')}/api/brands?vehicleType=${vt}`,
    );
    const brandIds = brands.map((b) => b.id);
    const byBrand = new Map<string, { brand: BrandInfo; models: ModelInfo[] }>();
    const chunkSize = 40;
    for (let i = 0; i < brandIds.length; i += chunkSize) {
      const chunk = brandIds.slice(i, i + chunkSize);
      const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/brands/models/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandIds: chunk, vehicleType: vt }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} models/batch`);
      }
      const batchMap = (await res.json()) as Record<string, ModelInfo[]>;
      for (const bid of chunk) {
        const brand = brands.find((b) => b.id === bid);
        if (!brand) {
          continue;
        }
        byBrand.set(bid, { brand, models: batchMap[bid] ?? [] });
      }
    }
    out.set(vt, byBrand);
  }
  return out;
}

function tryResolvePair(
  pair: PairKey,
  catalogue: Map<VehicleType, Map<string, { brand: BrandInfo; models: ModelInfo[] }>>,
): { ok: true; brandId: string; modelId: string } | { ok: false; reason: string } {
  const vtMap = catalogue.get(pair.vehicleType);
  if (!vtMap) {
    return { ok: false, reason: 'NO_CATALOGUE_FOR_VT' };
  }
  const brands = [...vtMap.values()].map((x) => x.brand);
  const candidates = findBrandCandidates(brands, pair.brand, pair.model);
  if (candidates.length === 0) {
    return { ok: false, reason: 'BRAND_NOT_FOUND' };
  }
  for (const brand of candidates) {
    const entry = vtMap.get(brand.id);
    if (!entry) {
      continue;
    }
    const adapted = adaptSourceModelForBrand(pair.model, brand.name);
    const model = findModelBySourceName(entry.models, adapted);
    if (model) {
      return { ok: true, brandId: brand.id, modelId: model.id };
    }
  }
  return { ok: false, reason: 'MODEL_NOT_FOUND' };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs(argv: string[]): {
  login: string;
  out: string;
  platformApiUrl: string;
  pageSize: number;
  batchSize: number;
  delayMs: number;
  maxAds?: number;
} {
  let login = 'AGMOTORS';
  let out = path.join(
    process.cwd(),
    'src/scripts/tools/999md-import/reports/dealer-brand-model-audit.json',
  );
  let platformApiUrl = DEFAULT_PLATFORM_API;
  let pageSize = 100;
  let batchSize = 8;
  let delayMs = 400;
  let maxAds: number | undefined;
  for (const a of argv) {
    if (a.startsWith('--login=')) {
      login = a.slice('--login='.length);
    } else if (a.startsWith('--out=')) {
      out = path.resolve(a.slice('--out='.length));
    } else if (a.startsWith('--platformApiUrl=')) {
      platformApiUrl = a.slice('--platformApiUrl='.length);
    } else if (a.startsWith('--pageSize=')) {
      pageSize = parseInt(a.slice('--pageSize='.length), 10);
    } else if (a.startsWith('--batchSize=')) {
      batchSize = parseInt(a.slice('--batchSize='.length), 10);
    } else if (a.startsWith('--delayMs=')) {
      delayMs = parseInt(a.slice('--delayMs='.length), 10);
    } else if (a.startsWith('--maxAds=')) {
      maxAds = parseInt(a.slice('--maxAds='.length), 10);
    }
  }
  return { login, out, platformApiUrl, pageSize, batchSize, delayMs, maxAds };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const pairMap = new Map<
    string,
    { vehicleType: VehicleType; brand: string; model: string; listingIds: string[] }
  >();
  const skippedAds: { listingId: string; reason: string }[] = [];
  const incompleteAds: { listingId: string; brand?: string; model?: string }[] = [];

  console.error(`Fetching ad ids for ${args.login}...`);
  const adIds = await fetchAllAdIds(args.login, args.pageSize, args.maxAds);
  console.error(
    `Found ${adIds.length} listing ids. Loading adverts in batches of ${args.batchSize}...`,
  );

  for (let i = 0; i < adIds.length; i += args.batchSize) {
    const chunk = adIds.slice(i, i + args.batchSize);
    const adverts = await fetchAdvertsBatch(chunk);
    for (const id of chunk) {
      const advert = adverts.get(id);
      if (!advert) {
        skippedAds.push({ listingId: id, reason: 'ADVERT_NOT_RETURNED' });
        continue;
      }
      const sub = advert.subCategory;
      const resolution = resolveSubcategoryToVehicleType({
        subCategoryId: sub?.id,
        subCategoryUrl: sub?.url ?? undefined,
      });
      if (resolution.kind === 'skip') {
        skippedAds.push({ listingId: id, reason: resolution.reason });
        continue;
      }
      const { brand, model } = extractBrandModel(advert);
      if (!brand || !model) {
        incompleteAds.push({ listingId: id, brand, model });
        continue;
      }
      const vehicleType = resolution.vehicleType;
      const key = `${vehicleType}|${brand}|${model}`;
      const existing = pairMap.get(key);
      if (existing) {
        existing.listingIds.push(id);
      } else {
        pairMap.set(key, { vehicleType, brand, model, listingIds: [id] });
      }
    }
    if (i + args.batchSize < adIds.length) {
      await sleep(args.delayMs);
    }
  }

  console.error(`Loading platform catalogue from ${args.platformApiUrl}...`);
  const catalogue = await loadPlatformCatalogue(args.platformApiUrl);

  const pairsFrom999 = [...pairMap.values()].sort((a, b) =>
    `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`),
  );

  const missingFromPlatform: {
    brand: string;
    model: string;
    vehicleType: VehicleType;
    reason: string;
    listingCount: number;
    sampleListingIds: string[];
  }[] = [];

  const resolved: {
    brand: string;
    model: string;
    vehicleType: VehicleType;
    platformBrandId: string;
    platformModelId: string;
    listingCount: number;
  }[] = [];

  for (const p of pairsFrom999) {
    const r = tryResolvePair(
      { vehicleType: p.vehicleType, brand: p.brand, model: p.model },
      catalogue,
    );
    const listingCount = p.listingIds.length;
    if (r.ok) {
      resolved.push({
        brand: p.brand,
        model: p.model,
        vehicleType: p.vehicleType,
        platformBrandId: r.brandId,
        platformModelId: r.modelId,
        listingCount,
      });
    } else {
      missingFromPlatform.push({
        brand: p.brand,
        model: p.model,
        vehicleType: p.vehicleType,
        reason: r.reason,
        listingCount,
        sampleListingIds: p.listingIds.slice(0, 5),
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    dealerLogin: args.login,
    platformApiUrl: args.platformApiUrl,
    graphqlUrl: GQL,
    stats: {
      listingIdsFetched: adIds.length,
      uniqueBrandModelPairs: pairsFrom999.length,
      resolvedPairs: resolved.length,
      missingPairs: missingFromPlatform.length,
      skippedSubcategory: skippedAds.length,
      incompleteBrandModel: incompleteAds.length,
    },
    pairsFrom999: pairsFrom999.map((p) => ({
      vehicleType: p.vehicleType,
      brand: p.brand,
      model: p.model,
      listingCount: p.listingIds.length,
    })),
    missingFromPlatform,
    resolved,
    skippedSubcategory: skippedAds.slice(0, 200),
    incompleteBrandModel: incompleteAds.slice(0, 200),
  };

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.error(`Wrote ${args.out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
