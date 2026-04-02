import { useEffect, type MutableRefObject } from 'react';

import { subscribeToCrossTabEvents } from '@/lib/cross-tab-events';

type StatusFilter = 'All' | 'Active' | 'Paused' | 'Closed';
type PromotedFilter = 'All' | 'Promoted' | 'NotPromoted';

function toApiStatus(status?: string) {
  return status && status !== 'All' ? status : undefined;
}

function toApiSearch(search?: string) {
  return search?.trim() || undefined;
}

function toPromotedBoolean(filter: PromotedFilter) {
  if (filter === 'Promoted') return true;
  if (filter === 'NotPromoted') return false;
  return undefined;
}

export function useCrossTabMyListingsRefetch(params: {
  user: { id: string } | null | undefined;
  hasLoadedRef: MutableRefObject<boolean>;
  fetchListings: (
    page: number,
    append: boolean,
    limit?: number,
    status?: string,
    promoted?: boolean,
    search?: string,
  ) => Promise<void>;
  refetchAllForCount: () => Promise<void>;
  refetchHasActiveListingsOverall: () => Promise<void>;
  statusFilter: StatusFilter;
  promotedFilter: PromotedFilter;
  searchQuery: string;
}) {
  const {
    user,
    hasLoadedRef,
    fetchListings,
    refetchAllForCount,
    refetchHasActiveListingsOverall,
    statusFilter,
    promotedFilter,
    searchQuery,
  } = params;

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToCrossTabEvents((ev) => {
      if (ev.type !== 'listing-status-changed') return;
      hasLoadedRef.current = false;
      const apiStatus = toApiStatus(statusFilter);
      const apiPromoted = toPromotedBoolean(promotedFilter);
      const q = toApiSearch(searchQuery);
      void fetchListings(1, false, 20, apiStatus, apiPromoted, q);
      void refetchAllForCount();
      void refetchHasActiveListingsOverall();
    });
    return unsub;
  }, [
    user,
    hasLoadedRef,
    fetchListings,
    refetchAllForCount,
    refetchHasActiveListingsOverall,
    statusFilter,
    promotedFilter,
    searchQuery,
  ]);
}
