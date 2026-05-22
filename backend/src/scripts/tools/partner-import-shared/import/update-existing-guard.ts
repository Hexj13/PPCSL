export const UPDATE_EXISTING_REQUIRES_KUPITO_LISTING_ID =
  'UPDATE_EXISTING_REQUIRES_KUPITO_LISTING_ID';

export function getUpdateExistingRequiresKupitoListingIdError(
  options: { updateExisting?: boolean; sourceId?: string },
  item: { kupitoListingId?: string },
): string | undefined {
  if (options.updateExisting && options.sourceId?.trim() && !item.kupitoListingId) {
    return UPDATE_EXISTING_REQUIRES_KUPITO_LISTING_ID;
  }
  return undefined;
}
