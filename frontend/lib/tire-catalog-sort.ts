import { normalizeTireNameKey, POPULAR_TIRE_BRAND_NAMES } from './content/popular-tires';
import { loadSiteConfigSync } from './site-config';

const popularTireBrandKeySet = new Set<string>();
for (const name of POPULAR_TIRE_BRAND_NAMES) {
  popularTireBrandKeySet.add(normalizeTireNameKey(name));
}

function isPopularTireBrandName(name: string): boolean {
  return popularTireBrandKeySet.has(normalizeTireNameKey(name));
}

function getSortLocale(): string {
  const country = process.env.COUNTRY || process.env.NEXT_PUBLIC_COUNTRY || 'md';
  return loadSiteConfigSync(country).locale.split('-')[0];
}

let collatorCache: Intl.Collator | null = null;

function compareTireCatalogLabels(a: string, b: string): number {
  if (!collatorCache) {
    collatorCache = new Intl.Collator(getSortLocale(), { sensitivity: 'base', numeric: true });
  }
  return collatorCache.compare(a, b);
}

const isOtherTireLabel = (name: string): boolean => name.trim().toLowerCase() === 'other';

export function buildCategorizedTireBrandOptions<
  T extends { id: string; name: string; order?: number },
>(
  brands: T[],
  t: (_key: string) => string,
): Array<{ value: string; label: string; category?: string }> {
  const sorted = sortTireBrandsForDisplay(brands);
  const popularSet = new Set(POPULAR_TIRE_BRAND_NAMES.map((n) => normalizeTireNameKey(n)));
  const popular = sorted.filter((b) => popularSet.has(normalizeTireNameKey(b.name)));
  const other = sorted.filter((b) => !popularSet.has(normalizeTireNameKey(b.name)));

  const popularLabel = t('searchFilters.popular');
  const otherLabel = t('searchFilters.other');
  const out: Array<{ value: string; label: string; category?: string }> = [];

  if (popular.length > 0) {
    out.push({ value: '__category__popular', label: popularLabel, category: popularLabel });
    for (const b of popular) {
      out.push({ value: b.id, label: b.name, category: popularLabel });
    }
  }
  if (other.length > 0) {
    out.push({ value: '__category__other', label: otherLabel, category: otherLabel });
    for (const b of other) {
      out.push({ value: b.id, label: b.name, category: otherLabel });
    }
  }
  return out;
}

export function sortTireBrandsForDisplay<T extends { name: string; order?: number }>(
  brands: T[],
): T[] {
  return [...brands].sort((a, b) => {
    const aOther = isOtherTireLabel(a.name) ? 1 : 0;
    const bOther = isOtherTireLabel(b.name) ? 1 : 0;
    if (aOther !== bOther) return aOther - bOther;
    const aPop = isPopularTireBrandName(a.name) ? 0 : 1;
    const bPop = isPopularTireBrandName(b.name) ? 0 : 1;
    if (aPop !== bPop) return aPop - bPop;
    return compareTireCatalogLabels(a.name, b.name);
  });
}

export function sortTireModelsForDisplay<
  T extends { name: string; order?: number; is_other?: boolean },
>(models: T[]): T[] {
  const otherRank = (m: T) => (m.is_other || isOtherTireLabel(m.name) ? 1 : 0);
  return [...models].sort((a, b) => {
    const ao = otherRank(a);
    const bo = otherRank(b);
    if (ao !== bo) return ao - bo;
    const oa = a.order ?? 0;
    const ob = b.order ?? 0;
    if (oa !== ob) return oa - ob;
    return compareTireCatalogLabels(a.name, b.name);
  });
}
