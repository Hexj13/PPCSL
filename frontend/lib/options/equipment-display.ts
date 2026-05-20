import { sortOptionsByLabel } from '@/lib/utils';

import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CATEGORY_MAP,
  type EquipmentCategory,
  type VehicleEquipmentKey,
} from './vehicle-equipment';

const MIN_ITEMS_FOR_GROUPING = 10;
const MIN_CATEGORIES_FOR_GROUPING = 3;

export type EquipmentColumnPair = { left: string[]; right: string[] };

export type ListingEquipmentDisplay =
  | ({ mode: 'flat' } & EquipmentColumnPair)
  | {
      mode: 'grouped';
      groups: Array<{ category: EquipmentCategory } & EquipmentColumnPair>;
    };

function splitIntoColumns(keys: string[]): EquipmentColumnPair {
  const mid = Math.ceil(keys.length / 2);
  return { left: keys.slice(0, mid), right: keys.slice(mid) };
}

function sortEquipmentKeys(keys: string[], t: (key: string) => string): string[] {
  return sortOptionsByLabel(
    keys.map((key) => ({
      value: key,
      label: t(`vehicleOptions.equipment.${key}`),
    })),
  ).map((opt) => opt.value);
}

function countDistinctCategories(keys: string[]): number {
  const categories = new Set<EquipmentCategory>();
  for (const key of keys) {
    const category = EQUIPMENT_CATEGORY_MAP[key as VehicleEquipmentKey];
    if (category) categories.add(category);
  }
  return categories.size;
}

export function shouldGroupListingEquipment(keys: string[]): boolean {
  if (keys.length < MIN_ITEMS_FOR_GROUPING) return false;
  return countDistinctCategories(keys) >= MIN_CATEGORIES_FOR_GROUPING;
}

function buildFlatDisplay(keys: string[], t: (key: string) => string): ListingEquipmentDisplay {
  const sorted = sortEquipmentKeys(keys, t);
  const { left, right } = splitIntoColumns(sorted);
  return { mode: 'flat', left, right };
}

function buildGroupedDisplay(keys: string[], t: (key: string) => string): ListingEquipmentDisplay {
  const groups = EQUIPMENT_CATEGORIES.map((category) => {
    const keysInCategory = keys.filter(
      (key) => EQUIPMENT_CATEGORY_MAP[key as VehicleEquipmentKey] === category,
    );
    const sorted = sortEquipmentKeys(keysInCategory, t);
    const { left, right } = splitIntoColumns(sorted);
    return { category, left, right };
  }).filter((group) => group.left.length > 0 || group.right.length > 0);

  return { mode: 'grouped', groups };
}

export function buildListingEquipmentDisplay(
  keys: string[],
  t: (key: string) => string,
): ListingEquipmentDisplay {
  if (!keys.length) {
    return { mode: 'flat', left: [], right: [] };
  }
  if (shouldGroupListingEquipment(keys)) {
    return buildGroupedDisplay(keys, t);
  }
  return buildFlatDisplay(keys, t);
}
