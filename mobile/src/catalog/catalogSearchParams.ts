import type { SearchParams } from '@/synced/api-types';

export function defaultCatalogSearchParams(kind: 'vehicle' | 'tire'): SearchParams {
  if (kind === 'tire') {
    return {
      category: 'tire',
      tireVehicleType: 'car',
      sortBy: 'created_at',
      sortOrder: 'DESC',
    };
  }
  return {
    category: 'vehicle',
    vehicleType: 'car',
    sortBy: 'created_at',
    sortOrder: 'DESC',
  };
}

export function normalizeCatalogSearchParams(params: SearchParams): SearchParams {
  const kind = params.category === 'tire' ? 'tire' : 'vehicle';
  const defaults = defaultCatalogSearchParams(kind);
  const merged: SearchParams = { ...defaults, ...params };
  delete merged.title;
  return merged;
}
