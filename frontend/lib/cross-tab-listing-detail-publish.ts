import { publishCrossTabEvent } from '@/lib/cross-tab-events';

export function publishListingDetailFavoriteCrossTab(listingId: string, action: 'add' | 'remove') {
  publishCrossTabEvent({
    type: 'favorites-changed',
    listingId,
    action,
    isAuthenticated: true,
    at: Date.now(),
  });
}

export function publishListingDetailComparisonCrossTab(
  listingId: string,
  action: 'add' | 'remove',
  bucket: 'vehicle' | 'tire',
  isAuthenticated: boolean,
) {
  publishCrossTabEvent({
    type: 'comparison-changed',
    listingId,
    action,
    bucket,
    isAuthenticated,
    at: Date.now(),
  });
}
