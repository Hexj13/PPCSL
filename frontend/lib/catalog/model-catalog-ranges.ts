import { createSlug } from '@/lib/utils';

export const MODEL_CATALOG_RANGES = [
  'a-b',
  'c-d',
  'e-g',
  'h-j',
  'k-m',
  'n-p',
  'q-s',
  't-v',
  'w-x',
  'y-z',
] as const;

export type ModelCatalogRange = (typeof MODEL_CATALOG_RANGES)[number];

const RANGE_BOUNDS: Array<{ slug: ModelCatalogRange; from: string; to: string }> = [
  { slug: 'a-b', from: 'a', to: 'b' },
  { slug: 'c-d', from: 'c', to: 'd' },
  { slug: 'e-g', from: 'e', to: 'g' },
  { slug: 'h-j', from: 'h', to: 'j' },
  { slug: 'k-m', from: 'k', to: 'm' },
  { slug: 'n-p', from: 'n', to: 'p' },
  { slug: 'q-s', from: 'q', to: 's' },
  { slug: 't-v', from: 't', to: 'v' },
  { slug: 'w-x', from: 'w', to: 'x' },
  { slug: 'y-z', from: 'y', to: 'z' },
];

export function isModelCatalogEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_MODEL_CATALOG === 'true';
}

export function isModelCatalogRange(value: string): value is ModelCatalogRange {
  return (MODEL_CATALOG_RANGES as readonly string[]).includes(value);
}

export function brandRangeSlug(brandName: string): ModelCatalogRange {
  const first = createSlug(brandName).charAt(0);
  if (!first || first < 'a' || first > 'z') {
    return 'a-b';
  }
  for (const bound of RANGE_BOUNDS) {
    if (first >= bound.from && first <= bound.to) {
      return bound.slug;
    }
  }
  return 'a-b';
}

export function modelCatalogRangeLabel(slug: ModelCatalogRange): string {
  const [from, to] = slug.split('-');
  return `${from.toUpperCase()}-${to.toUpperCase()}`;
}
