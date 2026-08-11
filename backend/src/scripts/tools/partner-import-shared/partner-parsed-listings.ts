export interface MarkParsedRegistryItem {
  sourceListingId?: string | null;
  kupitoListingId?: string | null;
}

export interface MarkParsedTargets {
  listingIds: string[];
  externalKeys: string[];
}

export function collectMarkParsedTargets(
  registryItems: MarkParsedRegistryItem[],
  plpSourceIds: Iterable<string> = [],
): MarkParsedTargets {
  const listingIds = new Set<string>();
  const externalKeys = new Set<string>();

  for (const item of registryItems) {
    const listingId = item.kupitoListingId?.trim();
    if (listingId) {
      listingIds.add(listingId);
    }
    const sourceId = item.sourceListingId?.trim();
    if (sourceId) {
      externalKeys.add(sourceId);
    }
  }

  for (const sourceId of plpSourceIds) {
    const trimmed = sourceId.trim();
    if (trimmed) {
      externalKeys.add(trimmed);
    }
  }

  return {
    listingIds: [...listingIds],
    externalKeys: [...externalKeys],
  };
}
