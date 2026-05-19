import { defaultCatalogSearchParams } from '@/catalog/catalogSearchParams';
import type { SearchParams } from '@/synced/api-types';

const IGNORE_KEYS = new Set([
  'category',
  'vehicleType',
  'tireVehicleType',
  'sortBy',
  'sortOrder',
  'page',
  'limit',
  'title',
]);

function isActiveValue(key: string, value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'boolean') return value;
  if (key === 'vehicleType' || key === 'tireVehicleType') return false;
  return true;
}

export function hasActiveCatalogFilters(draft: SearchParams | null | undefined): boolean {
  if (!draft || typeof draft !== 'object') return false;
  const kind = draft.category === 'tire' ? 'tire' : 'vehicle';
  const defaults = defaultCatalogSearchParams(kind);
  for (const key of Object.keys(draft) as (keyof SearchParams)[]) {
    if (IGNORE_KEYS.has(key)) continue;
    const val = draft[key];
    const def = defaults[key];
    if (JSON.stringify(val) === JSON.stringify(def)) continue;
    if (isActiveValue(key, val)) return true;
  }
  return false;
}
