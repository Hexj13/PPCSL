import { useCallback } from 'react';
import { toast } from 'react-hot-toast';

import { useTranslation } from '@/hooks/useTranslation';
import { listingsApi, type Listing } from '@/lib/api';

export interface ListingActionsConfig {
  refreshCooldownMs: number;
  lastRefreshAt: string | null;
  timeUntilRefresh: number | null;
  setTimeUntilRefresh: (_value: number | null) => void;
  canPromote: boolean;
  userId: string | undefined;
}

export interface ListingActionsCallbacks {
  setListings: React.Dispatch<React.SetStateAction<Listing[]>>;
  setAllListingsForCount: React.Dispatch<React.SetStateAction<Listing[]>>;
  listingsRef: React.MutableRefObject<Listing[]>;
  fetchListings: (_page: number, _append: boolean, _limit?: number) => Promise<void>;
  refetchAllForCount: () => Promise<void>;
}

export function useListingActions(
  config: ListingActionsConfig,
  callbacks: ListingActionsCallbacks
) {
  const { t } = useTranslation();
  const { refreshCooldownMs, timeUntilRefresh, setTimeUntilRefresh, userId } = config;
  const { setListings, setAllListingsForCount, listingsRef, fetchListings, refetchAllForCount } =
    callbacks;

  const updateListingInState = useCallback(
    (id: string, patch: Partial<Listing>) => {
      setListings((prev) => {
        const updated = prev.map((listing) =>
          listing.id === id ? { ...listing, ...patch } : listing
        );
        listingsRef.current = updated;
        return updated;
      });
      setAllListingsForCount((prevAll) => {
        const found = prevAll.find((l) => l.id === id);
        if (found) {
          return prevAll.map((listing) => (listing.id === id ? { ...listing, ...patch } : listing));
        }
        refetchAllForCount();
        return prevAll;
      });
    },
    [setListings, setAllListingsForCount, listingsRef, refetchAllForCount]
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
        refetchAllForCount();
        return prevAll;
      });
    },
    [setListings, setAllListingsForCount, listingsRef, refetchAllForCount]
  );

  const publishListing = useCallback(
    async (id: string) => {
      try {
        await listingsApi.publish(id);
        toast.success(t('myListings.published'));
        updateListingInState(id, { status: 'Active' });
      } catch {
        toast.error(t('myListings.statusUpdateError'));
      }
    },
    [t, updateListingInState]
  );

  const pauseListing = useCallback(
    async (id: string) => {
      try {
        await listingsApi.pause(id);
        toast.success(t('myListings.pausedMessage'));
        updateListingInState(id, { status: 'Paused' });
      } catch {
        toast.error(t('myListings.statusUpdateError'));
      }
    },
    [t, updateListingInState]
  );

  const closeListing = useCallback(
    async (id: string) => {
      try {
        const res = await listingsApi.close(id);
        const updated = res.data;
        toast.success(t('myListings.closedMessage'));
        replaceListingInState(id, updated);
      } catch {
        toast.error(t('myListings.statusUpdateError'));
      }
    },
    [t, replaceListingInState]
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

    try {
      const res = await listingsApi.refreshDates();
      toast.success(t('myListings.datesUpdated', { count: res.data.updated }));
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`lastRefreshDate_${userId}`, Date.now().toString());
      }
      if (refreshCooldownMs > 0) setTimeUntilRefresh(refreshCooldownMs);
      await fetchListings(1, false);
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 400) {
        toast.error(t('myListings.refreshDateLimit'));
      } else {
        toast.error(t('common.apiErrors.serverError'));
      }
    }
  }, [canRefreshDates, userId, refreshCooldownMs, setTimeUntilRefresh, fetchListings, t]);

  const togglePromotion = useCallback(
    async (id: string, isPromoted: boolean, days?: number) => {
      if (days == null) {
        toast.error(t('listings.promotionNotAvailable'));
        return;
      }
      try {
        await listingsApi.togglePromotion(id, isPromoted, days);
        toast.success(t('listings.promotionEnabled'));
        await fetchListings(1, false);
      } catch (error: unknown) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 403) {
          toast.error(t('listings.promotionNotAvailable'));
        } else if (axiosError.response?.status === 400) {
          toast.error(t('listings.promotionOnlyActive'));
        } else {
          toast.error(t('listings.promotionError'));
        }
      }
    },
    [fetchListings, t]
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
