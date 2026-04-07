import { useCallback } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { listingsApi, type Listing } from '@/lib/api';
import { localStorageSetItem } from '@/lib/browser-local-storage';
import { publishCrossTabEvent } from '@/lib/cross-tab-events';
import { toast } from '@/lib/toast';

export interface ListingActionsConfig {
  refreshCooldownMs: number;
  lastRefreshAt: string | null;
  timeUntilRefresh: number | null;
  setTimeUntilRefresh: (_value: number | null) => void;
  canPromote: boolean;
  userId: string | undefined;
  statusFilter?: string;
  promotedFilter?: string;
  searchQuery?: string;
}

export interface ListingActionsCallbacks {
  setListings: React.Dispatch<React.SetStateAction<Listing[]>>;
  setAllListingsForCount: React.Dispatch<React.SetStateAction<Listing[]>>;
  listingsRef: React.MutableRefObject<Listing[]>;
  fetchListings: (
    _page: number,
    _append: boolean,
    _limit?: number,
    _status?: string,
    _promoted?: boolean,
    _search?: string,
  ) => Promise<void>;
  refetchAllForCount: () => Promise<void>;
}

export function useListingActions(
  config: ListingActionsConfig,
  callbacks: ListingActionsCallbacks,
) {
  const { t } = useTranslation();
  const {
    refreshCooldownMs,
    timeUntilRefresh,
    setTimeUntilRefresh,
    userId,
    statusFilter,
    promotedFilter,
    searchQuery,
  } = config;
  const { setListings, setAllListingsForCount, listingsRef, fetchListings, refetchAllForCount } =
    callbacks;

  const updateListingInState = useCallback(
    (id: string, patch: Partial<Listing>) => {
      setListings((prev) => {
        const updated = prev.map((listing) =>
          listing.id === id ? { ...listing, ...patch } : listing,
        );
        listingsRef.current = updated;
        return updated;
      });
      setAllListingsForCount((prevAll) => {
        const found = prevAll.find((l) => l.id === id);
        if (found) {
          return prevAll.map((listing) => (listing.id === id ? { ...listing, ...patch } : listing));
        }
        void refetchAllForCount();
        return prevAll;
      });
    },
    [setListings, setAllListingsForCount, listingsRef, refetchAllForCount],
  );

  const replaceListingInState = useCallback(
    (id: string, listing: Listing) => {
      setListings((prev) => {
        const updated = prev.map((l) => (l.id === id ? listing : l));
        listingsRef.current = updated;
        return updated;
      });
      setAllListingsForCount((prevAll) => {
        const found = prevAll.find((l) => l.id === id);
        if (found) {
          return prevAll.map((l) => (l.id === id ? listing : l));
        }
        void refetchAllForCount();
        return prevAll;
      });
    },
    [setListings, setAllListingsForCount, listingsRef, refetchAllForCount],
  );

  const publishListing = useCallback(
    async (id: string) => {
      try {
        await listingsApi.publish(id);
        toast.success(t('myListings.published'));
        updateListingInState(id, { status: 'Active' });
        publishCrossTabEvent({
          type: 'listing-status-changed',
          listingId: id,
          status: 'Active',
          at: Date.now(),
        });
      } catch (error: unknown) {
        const axiosError = error as {
          response?: { data?: { message?: string; errorKey?: string } };
        };
        const backendMessage = axiosError.response?.data?.message;
        toast.error(
          typeof backendMessage === 'string' ? backendMessage : t('myListings.statusUpdateError'),
        );
      }
    },
    [t, updateListingInState],
  );

  const pauseListing = useCallback(
    async (id: string) => {
      try {
        await listingsApi.pause(id);
        toast.success(t('myListings.pausedMessage'));
        updateListingInState(id, { status: 'Paused' });
        publishCrossTabEvent({
          type: 'listing-status-changed',
          listingId: id,
          status: 'Paused',
          at: Date.now(),
        });
      } catch (error: unknown) {
        const axiosError = error as {
          response?: { data?: { message?: string; errorKey?: string } };
        };
        const backendMessage = axiosError.response?.data?.message;
        toast.error(
          typeof backendMessage === 'string' ? backendMessage : t('myListings.statusUpdateError'),
        );
      }
    },
    [t, updateListingInState],
  );

  const closeListing = useCallback(
    async (id: string) => {
      try {
        const res = await listingsApi.close(id);
        const updated = res.data;
        toast.success(t('myListings.closedMessage'));
        replaceListingInState(id, updated);
        publishCrossTabEvent({
          type: 'listing-status-changed',
          listingId: id,
          status: 'Closed',
          at: Date.now(),
        });
      } catch (error: unknown) {
        const axiosError = error as {
          response?: { data?: { message?: string; errorKey?: string } };
        };
        const backendMessage = axiosError.response?.data?.message;
        toast.error(
          typeof backendMessage === 'string' ? backendMessage : t('myListings.statusUpdateError'),
        );
      }
    },
    [t, replaceListingInState],
  );

  const canRefreshDates = useCallback((): boolean => {
    return timeUntilRefresh === null || timeUntilRefresh <= 0;
  }, [timeUntilRefresh]);

  const getRefreshCooldownRemaining = useCallback((): number => {
    if (timeUntilRefresh === null || timeUntilRefresh <= 0) return 0;
    return timeUntilRefresh;
  }, [timeUntilRefresh]);

  const refreshAllDates = useCallback(async () => {
    if (!canRefreshDates()) {
      toast.error(t('myListings.refreshDateLimit'));
      return;
    }
    if (!userId) return;

    const apiStatus = statusFilter && statusFilter !== 'All' ? statusFilter : undefined;
    const apiPromoted =
      promotedFilter === 'Promoted' ? true : promotedFilter === 'NotPromoted' ? false : undefined;

    try {
      const res = await listingsApi.refreshDates();
      toast.success(t('myListings.datesUpdated', { count: res.data.updated }));
      localStorageSetItem(`lastRefreshDate_${userId}`, Date.now().toString());
      if (refreshCooldownMs > 0) setTimeUntilRefresh(refreshCooldownMs);
      await fetchListings(1, false, 20, apiStatus, apiPromoted, searchQuery);
      void refetchAllForCount();
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 400) {
        toast.error(t('myListings.refreshDateLimit'));
      } else {
        toast.error(t('common.apiErrors.serverError'));
      }
    }
  }, [
    canRefreshDates,
    userId,
    statusFilter,
    promotedFilter,
    searchQuery,
    refreshCooldownMs,
    setTimeUntilRefresh,
    fetchListings,
    refetchAllForCount,
    t,
  ]);

  const togglePromotion = useCallback(
    async (
      id: string,
      isPromoted: boolean,
      days?: number | null,
      source: 'default' | 'partner_balance' = 'default',
    ) => {
      const apiStatus = statusFilter && statusFilter !== 'All' ? statusFilter : undefined;
      const apiPromoted =
        promotedFilter === 'Promoted' ? true : promotedFilter === 'NotPromoted' ? false : undefined;

      try {
        await listingsApi.togglePromotion(id, isPromoted, days, source);
        toast.success(t('listings.promotionEnabled'));
        await fetchListings(1, false, 20, apiStatus, apiPromoted, searchQuery);
        void refetchAllForCount();
      } catch (error: unknown) {
        const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
        const backendMessage = axiosError.response?.data?.message;
        if (axiosError.response?.status === 403) {
          toast.error(backendMessage || t('listings.promotionNotAvailable'));
        } else if (axiosError.response?.status === 400) {
          toast.error(backendMessage || t('listings.promotionOnlyActive'));
        } else {
          toast.error(backendMessage || t('listings.promotionError'));
        }
      }
    },
    [fetchListings, refetchAllForCount, statusFilter, promotedFilter, searchQuery, t],
  );

  const formatTimeRemaining = useCallback((ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    publishListing,
    pauseListing,
    closeListing,
    canRefreshDates,
    getRefreshCooldownRemaining,
    refreshAllDates,
    togglePromotion,
    formatTimeRemaining,
  };
}
