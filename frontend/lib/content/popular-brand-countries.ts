export const POPULAR_BRAND_COUNTRIES = [
  'chinese',
  'french',
  'german',
  'korean',
  'japanese',
  'american',
  'italian',
] as const;

export type PopularBrandCountry = (typeof POPULAR_BRAND_COUNTRIES)[number];

export const POPULAR_BRAND_COUNTRY_FLAGS: Record<PopularBrandCountry, string> = {
  chinese: '🇨🇳',
  french: '🇫🇷',
  german: '🇩🇪',
  korean: '🇰🇷',
  japanese: '🇯🇵',
  american: '🇺🇸',
  italian: '🇮🇹',
};

type BrandWithPopularCountry = {
  id: string;
  popular_country?: PopularBrandCountry | null;
};

export type PopularBrandCountryGroup = {
  country: PopularBrandCountry;
  brandIds: string[];
};

export function groupBrandsByPopularCountry(
  brands: BrandWithPopularCountry[],
): PopularBrandCountryGroup[] {
  const byCountry = new Map<PopularBrandCountry, string[]>();

  for (const brand of brands) {
    const country = brand.popular_country;
    if (!country) continue;
    const list = byCountry.get(country) ?? [];
    list.push(brand.id);
    byCountry.set(country, list);
  }

  return POPULAR_BRAND_COUNTRIES.flatMap((country) => {
    const brandIds = byCountry.get(country);
    if (!brandIds || brandIds.length === 0) return [];
    return [{ country, brandIds }];
  }).sort((a, b) => {
    const countDiff = b.brandIds.length - a.brandIds.length;
    if (countDiff !== 0) return countDiff;
    return POPULAR_BRAND_COUNTRIES.indexOf(a.country) - POPULAR_BRAND_COUNTRIES.indexOf(b.country);
  });
}
