import { useEffect } from 'react';

import { subscribeToCrossTabEvents } from '@/lib/cross-tab-events';

export function useCrossTabListingStatusRefetch(
  listingId: string,
  fetchListingData: (forceRefresh?: boolean) => void,
) {
  useEffect(() => {
    const unsub = subscribeToCrossTabEvents((ev) => {
      if (ev.type !== 'listing-status-changed') return;
      if (ev.listingId !== listingId) return;
      fetchListingData(true);
    });
    return unsub;
  }, [listingId, fetchListingData]);
}
