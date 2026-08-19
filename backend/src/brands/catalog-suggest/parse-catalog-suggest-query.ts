import { normalizeForComparison } from '../../common/utils/slug.utils';

import {
  CATALOG_SUGGEST_MIN_ALPHANUMERIC,
  CATALOG_SUGGEST_YEAR_MIN,
  type CatalogSuggestQuery,
} from './catalog-suggest.types';

const YEAR_EXACT_RE = /^\d{4}$/;

export function countAlphanumeric(value: string): number {
  return (value.match(/\p{L}|\p{N}/gu) ?? []).length;
}

export function hasMinSuggestQueryChars(value: string): boolean {
  return countAlphanumeric(value) >= CATALOG_SUGGEST_MIN_ALPHANUMERIC;
}

function isYearInRange(year: number, nowYear: number): boolean {
  return year >= CATALOG_SUGGEST_YEAR_MIN && year <= nowYear;
}

export function parseCatalogSuggestQuery(raw: string, nowYear: number): CatalogSuggestQuery | null {
  const trimmed = raw.trim();
  if (!hasMinSuggestQueryChars(trimmed)) {
    return null;
  }

  const parts = trimmed.split(/[\s-]+/).filter(Boolean);
  const nameTokens: string[] = [];
  let exactYear: number | null = null;

  for (const part of parts) {
    if (YEAR_EXACT_RE.test(part)) {
      const year = Number.parseInt(part, 10);
      if (isYearInRange(year, nowYear)) {
        exactYear = year;
        continue;
      }
    }
    const normalized = normalizeForComparison(part);
    if (normalized) {
      nameTokens.push(normalized);
    }
  }

  if (nameTokens.length === 0 && exactYear === null) {
    return null;
  }

  return { nameTokens, exactYear };
}
