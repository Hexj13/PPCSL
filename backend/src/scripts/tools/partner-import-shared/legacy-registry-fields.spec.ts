import {
  LEGACY_REGISTRY_LISTING_ID_KEY,
  migrateRegistryDataListingIds,
  migrateRegistryItemListingId,
} from './legacy-registry-fields';

describe('legacy registry listing id', () => {
  it('copies the legacy JSON key onto platformListingId and drops it', () => {
    const item = migrateRegistryItemListingId({
      [LEGACY_REGISTRY_LISTING_ID_KEY]: 'listing-1',
      sourceListingId: 'src-1',
    } as Record<string, unknown>);
    expect(item.platformListingId).toBe('listing-1');
    expect(item[LEGACY_REGISTRY_LISTING_ID_KEY]).toBeUndefined();
  });

  it('keeps an existing platformListingId', () => {
    const item = migrateRegistryItemListingId({
      platformListingId: 'current',
      [LEGACY_REGISTRY_LISTING_ID_KEY]: 'legacy',
    } as Record<string, unknown>);
    expect(item.platformListingId).toBe('current');
    expect(item[LEGACY_REGISTRY_LISTING_ID_KEY]).toBeUndefined();
  });

  it('migrates nested registry items', () => {
    const data = migrateRegistryDataListingIds({
      items: {
        a: { [LEGACY_REGISTRY_LISTING_ID_KEY]: 'id-a' },
      },
    });
    expect(data.items?.a).toEqual({ platformListingId: 'id-a' });
  });
});
