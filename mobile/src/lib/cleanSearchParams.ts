import type { SearchParams } from '@/synced/api-types';

export function cleanSearchParams(params: SearchParams): SearchParams {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key === 'title') continue;
    if (value === undefined || value === null) continue;
    if (value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out as SearchParams;
}
