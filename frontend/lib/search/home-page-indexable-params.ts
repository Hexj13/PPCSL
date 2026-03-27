export const INDEXABLE_SEARCH_PARAM_KEYS = new Set([
  'brand',
  'model',
  'page',
  'body_types',
  'vehicleType',
  'category',
  'tire_brand_ids',
  'tire_model_ids',
  'tireVehicleType',
  'tire_widths',
  'tire_profiles',
  'tire_diameters',
  'tire_seasons',
  'tire_conditions',
  'tire_quantities',
  'tire_studded',
  'tire_run_flat',
  'tire_reinforced_xl',
  'tire_spare_donut',
  'tire_tubeless',
  'tire_acoustic',
  'cities',
  '_e',
  '_f',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
  'gclsrc',
  'fbclid',
  'ref',
  'mc_cid',
  'mc_eid',
]);

export const TIRE_CANONICAL_PARAM_KEYS = [
  'tire_brand_ids',
  'tire_model_ids',
  'tireVehicleType',
  'tire_widths',
  'tire_profiles',
  'tire_diameters',
  'tire_seasons',
  'tire_conditions',
  'tire_quantities',
  'tire_studded',
  'tire_run_flat',
  'tire_reinforced_xl',
  'tire_spare_donut',
  'tire_tubeless',
  'tire_acoustic',
  'cities',
  '_e',
  '_f',
] as const;

export function appendTireCanonicalParams(
  params: Record<string, string | string[] | undefined>,
  target: URLSearchParams,
) {
  for (const key of TIRE_CANONICAL_PARAM_KEYS) {
    const val = params[key];
    if (typeof val === 'string' && val.trim() !== '') {
      target.set(key, val);
    }
  }
}

export function isIndexableVehicleTypeParam(value: string | string[] | undefined): value is string {
  return typeof value === 'string' && ['car', 'truck', 'moto'].includes(value);
}

export function hasNonIndexableHomeSearchParams(
  params: Record<string, string | string[] | undefined>,
): boolean {
  const tireMode = typeof params.category === 'string' && params.category === 'tire';
  return Object.entries(params).some(([key, value]) => {
    if (value === undefined) return false;
    if (key === 'category') {
      if (typeof value !== 'string') return true;
      const trimmed = value.trim();
      if (trimmed === '') return false;
      return trimmed !== 'tire';
    }
    if (tireMode && ['brand', 'model', 'body_types', 'vehicleType'].includes(key)) {
      return true;
    }
    if (!INDEXABLE_SEARCH_PARAM_KEYS.has(key)) return true;
    if (key === 'vehicleType') return !isIndexableVehicleTypeParam(value);
    return false;
  });
}
