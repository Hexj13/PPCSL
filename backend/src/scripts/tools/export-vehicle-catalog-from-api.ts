/**
 * Export active brands + models from a live PPCSL API into vehicle-catalog.json.
 *
 * Usage:
 *   npm run export:vehicle-catalog
 *   npm run export:vehicle-catalog -- --api-url http://localhost:4000
 *   npm run export:vehicle-catalog -- --out /tmp/vehicle-catalog.json
 */
import * as fs from 'fs';
import * as path from 'path';

import type {
  VehicleCatalog,
  VehicleCatalogBrand,
  VehicleCatalogModel,
  VehicleCatalogVehicleType,
} from '../data/vehicle-catalog.types';
import { VEHICLE_CATALOG_FILENAME } from '../data/vehicle-catalog.types';

type ApiBrand = {
  id: string;
  name: string;
  order: number;
  vehicle_types?: VehicleCatalogVehicleType[] | null;
};

type ApiModel = {
  name: string;
  order: number;
  vehicle_types?: VehicleCatalogVehicleType[] | null;
  is_archived?: boolean;
};

const DEFAULT_API_URL =
  process.env.PPCSL_IMPORT_API_URL || process.env.KUPITO_IMPORT_API_URL || 'http://localhost:4000';
const BATCH_SIZE = 25;
const BATCH_DELAY_MS = 250;

function parseArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) {
    return undefined;
  }
  return process.argv[idx + 1];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeVehicleTypes(
  types: VehicleCatalogVehicleType[] | null | undefined,
): VehicleCatalogVehicleType[] {
  if (!Array.isArray(types) || types.length === 0) {
    return ['car'];
  }
  const allowed = new Set<VehicleCatalogVehicleType>(['car', 'truck', 'moto', 'tire']);
  const filtered = types.filter((t): t is VehicleCatalogVehicleType => allowed.has(t));
  return filtered.length > 0 ? filtered : ['car'];
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status} for ${url}: ${body.slice(0, 200)}`);
  }
  return (await response.json()) as T;
}

async function exportCatalog(): Promise<void> {
  const apiUrl = (parseArg('--api-url') || DEFAULT_API_URL).replace(/\/$/, '');
  const defaultOut = path.join(__dirname, '..', 'data', VEHICLE_CATALOG_FILENAME);
  const outPath = path.resolve(parseArg('--out') || defaultOut);

  console.log(`📡 Fetching brands from ${apiUrl}/api/brands ...`);
  const brands = await fetchJson<ApiBrand[]>(`${apiUrl}/api/brands`);
  console.log(`   ${brands.length} brands`);

  const modelsByBrandId: Record<string, ApiModel[]> = {};
  for (let i = 0; i < brands.length; i += BATCH_SIZE) {
    const batch = brands.slice(i, i + BATCH_SIZE);
    const brandIds = batch.map((b) => b.id);
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(brands.length / BATCH_SIZE);
    process.stdout.write(`   models batch ${batchIndex}/${totalBatches} (${brandIds.length})\r`);

    const batchResult = await fetchJson<Record<string, ApiModel[]>>(
      `${apiUrl}/api/brands/models/batch`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ brandIds }),
      },
    );

    Object.assign(modelsByBrandId, batchResult);

    if (i + BATCH_SIZE < brands.length) {
      await delay(BATCH_DELAY_MS);
    }
  }
  process.stdout.write('\n');

  const catalogBrands: VehicleCatalogBrand[] = brands
    .slice()
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map((brand) => {
      const rawModels = modelsByBrandId[brand.id] || [];
      const models: VehicleCatalogModel[] = rawModels
        .filter((m) => !m.is_archived)
        .slice()
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
        .map((m) => ({
          name: m.name,
          order: m.order,
          vehicle_types: normalizeVehicleTypes(m.vehicle_types),
          is_archived: false,
        }));

      return {
        name: brand.name,
        order: brand.order,
        vehicle_types: normalizeVehicleTypes(brand.vehicle_types),
        is_archived: false,
        models,
      };
    });

  const catalog: VehicleCatalog = {
    version: 1,
    source: apiUrl,
    exportedAt: new Date().toISOString(),
    brands: catalogBrands,
  };

  const totalModels = catalogBrands.reduce((sum, b) => sum + b.models.length, 0);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');

  console.log(`✅ Wrote ${catalogBrands.length} brands, ${totalModels} models → ${outPath}`);
}

exportCatalog().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`❌ Export failed: ${message}`);
  process.exit(1);
});
