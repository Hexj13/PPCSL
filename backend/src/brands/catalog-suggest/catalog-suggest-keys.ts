import { normalizeForComparison } from '../../common/utils/slug.utils';
import { BRAND_SEARCH_ALIASES, MODEL_SEARCH_ALIASES } from '../data/brand-search-aliases';

const LATIN_TO_CYRILLIC: Record<string, string> = {
  a: 'а',
  b: 'б',
  c: 'к',
  d: 'д',
  e: 'е',
  f: 'ф',
  g: 'г',
  h: 'х',
  i: 'и',
  j: 'дж',
  k: 'к',
  l: 'л',
  m: 'м',
  n: 'н',
  o: 'о',
  p: 'п',
  q: 'к',
  r: 'р',
  s: 'с',
  t: 'т',
  u: 'у',
  v: 'в',
  w: 'в',
  x: 'кс',
  y: 'и',
  z: 'з',
};

export function latinToCyrillicApprox(text: string): string {
  return text.toLowerCase().replace(/[a-z]/g, (ch) => LATIN_TO_CYRILLIC[ch] ?? '');
}

function addKey(keys: Set<string>, value: string | null | undefined): void {
  if (!value) {
    return;
  }
  const normalized = normalizeForComparison(value);
  if (normalized) {
    keys.add(normalized);
  }
}

export function buildSearchKeys(
  name: string,
  nameNormalized: string | null | undefined,
  extraAliases: string[],
): string[] {
  const keys = new Set<string>();
  addKey(keys, name);
  addKey(keys, nameNormalized);
  addKey(keys, latinToCyrillicApprox(name));
  for (const alias of extraAliases) {
    addKey(keys, alias);
  }
  return [...keys];
}

export function brandAliasesFor(nameNormalized: string): string[] {
  return BRAND_SEARCH_ALIASES[nameNormalized] ?? [];
}

export function modelAliasesFor(nameNormalized: string): string[] {
  return MODEL_SEARCH_ALIASES[nameNormalized] ?? [];
}
