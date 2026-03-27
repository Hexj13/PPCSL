export const POPULAR_TIRE_BRAND_NAMES = [
  'Michelin',
  'Continental',
  'Pirelli',
  'Bridgestone',
  'Goodyear',
  'Nokian',
  'Hankook',
  'Yokohama',
  'Dunlop',
  'Toyo',
  'Kumho',
  'Falken',
] as const;

const POPULAR_TIRE_SIZES_UNSORTED = [
  { width: '195', profile: '65', diameter: '15' },
  { width: '195', profile: '55', diameter: '16' },
  { width: '205', profile: '55', diameter: '16' },
  { width: '205', profile: '60', diameter: '16' },
  { width: '215', profile: '60', diameter: '16' },
  { width: '225', profile: '45', diameter: '17' },
  { width: '225', profile: '55', diameter: '17' },
  { width: '235', profile: '55', diameter: '17' },
] as const;

function comparePopularTireSize(
  a: (typeof POPULAR_TIRE_SIZES_UNSORTED)[number],
  b: (typeof POPULAR_TIRE_SIZES_UNSORTED)[number],
): number {
  const w = Number(a.width) - Number(b.width);
  if (w !== 0) return w;
  const p = Number(a.profile) - Number(b.profile);
  if (p !== 0) return p;
  return Number(a.diameter) - Number(b.diameter);
}

export const POPULAR_TIRE_SIZES: readonly (typeof POPULAR_TIRE_SIZES_UNSORTED)[number][] = [
  ...POPULAR_TIRE_SIZES_UNSORTED,
].sort(comparePopularTireSize);

export const TIRE_QUANTITY_QUICK_VALUES = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

export function normalizeTireNameKey(name: string): string {
  return name.trim().toLowerCase();
}
