import type { BrandModelVehicleType } from '../../cipauto-import/mapping/brand-model-resolver';

export type SubcategoryVehicleResolution =
  | { kind: 'ok'; vehicleType: BrandModelVehicleType }
  | { kind: 'skip'; reason: string };

const BY_SUBCATEGORY_ID: Record<number, SubcategoryVehicleResolution> = {
  659: { kind: 'ok', vehicleType: 'car' },
  660: { kind: 'ok', vehicleType: 'truck' },
  662: { kind: 'ok', vehicleType: 'truck' },
  8393: { kind: 'ok', vehicleType: 'truck' },
  663: { kind: 'ok', vehicleType: 'moto' },
  664: { kind: 'skip', reason: 'Non-motor vehicle category (bicycles)' },
  6636: { kind: 'skip', reason: 'Non-motor vehicle category (electric scooters)' },
};

const URL_RULES: Array<{ pattern: RegExp; resolution: SubcategoryVehicleResolution }> = [
  { pattern: /^transport\/cars(\/|$)/, resolution: { kind: 'ok', vehicleType: 'car' } },
  {
    pattern: /^transport\/buses-and-minibuses(\/|$)/,
    resolution: { kind: 'ok', vehicleType: 'truck' },
  },
  { pattern: /^transport\/trucks(\/|$)/, resolution: { kind: 'ok', vehicleType: 'truck' } },
  { pattern: /^transport\/buses(\/|$)/, resolution: { kind: 'ok', vehicleType: 'truck' } },
  {
    pattern: /^transport\/motorcycles(\/|$)/,
    resolution: { kind: 'ok', vehicleType: 'moto' },
  },
  { pattern: /^transport\/bicycles(\/|$)/, resolution: BY_SUBCATEGORY_ID[664]! },
  {
    pattern: /^transport\/electric-scooters(\/|$)/,
    resolution: BY_SUBCATEGORY_ID[6636]!,
  },
];

export function resolveSubcategoryToVehicleType(params: {
  subCategoryId?: number;
  subCategoryUrl?: string;
}): SubcategoryVehicleResolution {
  const { subCategoryId, subCategoryUrl } = params;
  if (subCategoryId !== undefined && BY_SUBCATEGORY_ID[subCategoryId]) {
    return BY_SUBCATEGORY_ID[subCategoryId];
  }
  const url = (subCategoryUrl ?? '').replace(/^\/+/, '').toLowerCase();
  for (const rule of URL_RULES) {
    if (rule.pattern.test(url)) {
      return rule.resolution;
    }
  }
  if (url.startsWith('transport/')) {
    return {
      kind: 'skip',
      reason: `UNMAPPED_SUBCATEGORY:url=${subCategoryUrl ?? ''};id=${subCategoryId ?? ''}`,
    };
  }
  return {
    kind: 'skip',
    reason: `UNMAPPED_SUBCATEGORY:url=${subCategoryUrl ?? ''};id=${subCategoryId ?? ''}`,
  };
}
