export const UPDATE_EXISTING_REQUIRES_PLATFORM_LISTING_ID =
  'UPDATE_EXISTING_REQUIRES_PLATFORM_LISTING_ID';

export function getUpdateExistingRequiresPlatformListingIdError(
  options: { updateExisting?: boolean; sourceId?: string },
  item: { platformListingId?: string },
): string | undefined {
  if (options.updateExisting && options.sourceId?.trim() && !item.platformListingId) {
    return UPDATE_EXISTING_REQUIRES_PLATFORM_LISTING_ID;
  }
  return undefined;
}
