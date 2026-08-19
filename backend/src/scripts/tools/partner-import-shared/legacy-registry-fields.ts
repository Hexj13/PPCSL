/** Pre-P3 JSON key on partner-import registry items. Migrated on load to `platformListingId`. */
export const LEGACY_REGISTRY_LISTING_ID_KEY = 'kupitoListingId';

export function migrateRegistryItemListingId<T extends Record<string, unknown>>(item: T): T {
  const rec = item as Record<string, unknown>;
  const legacy = rec[LEGACY_REGISTRY_LISTING_ID_KEY];
  if (typeof rec.platformListingId !== 'string' && typeof legacy === 'string' && legacy) {
    rec.platformListingId = legacy;
  }
  delete rec[LEGACY_REGISTRY_LISTING_ID_KEY];
  return item;
}

export function migrateRegistryDataListingIds<T extends { items?: Record<string, unknown> }>(
  data: T,
): T {
  const items = data.items;
  if (!items || typeof items !== 'object') {
    return data;
  }
  for (const key of Object.keys(items)) {
    const item = items[key];
    if (item && typeof item === 'object') {
      migrateRegistryItemListingId(item as Record<string, unknown>);
    }
  }
  return data;
}
