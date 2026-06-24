'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCrossTabMyListingsRefetch } from '@/hooks/useCrossTabMyListingsRefetch';
import { useListingActions } from '@/hooks/useListingActions';
import { SKELETON_PAGE, useLoadingState } from '@/hooks/useLoadingState';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useTranslation } from '@/hooks/useTranslation';
import type { Listing, MyListingsStatusCounts, PaginationMeta } from '@/lib/api';
import { listingsApi, normalizeListingResponse } from '@/lib/api';
import { sessionStorageGetItem, sessionStorageRemoveItem } from '@/lib/browser-session-storage';
import { silentCatch } from '@/lib/utils';

import { useMyListingsPromotion } from './useMyListingsPromotion';
import { useMyListingsRefreshCooldownTimer } from './useMyListingsRefreshCooldownTimer';
import { useMyListingsUpdatedToast } from './useMyListingsUpdatedToast';

type StatusFilter = 'All' | 'Active' | 'Paused' | 'Closed';
type PromotedFilter = 'All' | 'Promoted' | 'NotPromoted';

function toApiStatus(status?: string) {
  return status && status !== 'All' ? status : undefined;
}

function toApiPromoted(promoted?: boolean) {
  return promoted === undefined ? undefined : promoted;
}

function toApiSearch(search?: string) {
  return search?.trim() || undefined;
}

function toPromotedBoolean(filter: PromotedFilter) {
  if (filter === 'Promoted') return true;
  if (filter === 'NotPromoted') return false;
  return undefined;
}

function mergeUniqueListings(prev: Listing[], next: Listing[]) {
  const existingIds = new Set(prev.map((listing) => listing.id));
  const unique = next.filter((listing) => !existingIds.has(listing.id));
  return [...prev, ...unique];
}

const EMPTY_STATUS_COUNTS: MyListingsStatusCounts = {
  Active: 0,
  Paused: 0,
  Closed: 0,
  Promoted: 0,
};

function preloadListingPages(listings: Listing[]) {
  if (!('caches' in window) || listings.length === 0) return;
  void caches
    .open('kupito-data-v1')
    .then((cache) => {
      listings.forEach((listing) => {
        cache.add(`/listings/${listing.id}`).catch(silentCatch('MyListings.cacheAdd'));
      });
    })
    .catch(silentCatch('MyListings.prefetch'));
}

async function fetchHasActiveListingsOverall() {
  try {
    const res = await listingsApi.getMy(1, 1, 'Active');
    const normalized = normalizeListingResponse(res.data, 1, 1);
    return (normalized.meta.total ?? 0) > 0 || normalized.data.length > 0;
  } catch {
    return false;
  }
}

async function fetchHasAnyListingsOverall() {
  try {
    const res = await listingsApi.getMyStatusCounts();
    const counts = res.data;
    return counts.Active + counts.Paused + counts.Closed > 0;
  } catch {
    return false;
  }
}

export function useMyListingsPage() {
  const { user, isLoading, isAuthorized } = useRequireAuth();
  const { t } = useTranslation();
  const [listings, setListings] = useState<Listing[]>([]);
  const [statusCounts, setStatusCounts] = useState<MyListingsStatusCounts>(EMPTY_STATUS_COUNTS);
  const countsGenerationRef = useRef(0);
  const [loading, setLoading] = useState(false);
  const [listingsRefreshing, setListingsRefreshing] = useState(false);
  const [initialListingsLoadDone, setInitialListingsLoadDone] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [promotedFilter, setPromotedFilter] = useState<PromotedFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [listingToClose, setListingToClose] = useState<string | null>(null);
  const [hasActiveListingsOverall, setHasActiveListingsOverall] = useState(false);
  const [hasAnyListingsOverall, setHasAnyListingsOverall] = useState(false);
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const listingsRef = useRef<Listing[]>([]);
  const fetchGenerationRef = useRef(0);

  const fetchListings = useCallback(
    async (
      page: number,
      append: boolean = false,
      limit: number = 20,
      status?: string,
      promoted?: boolean,
      search?: string,
    ) => {
      if (loadingRef.current || (append && loadingMoreRef.current)) return;
      if (!append && loadingMoreRef.current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
      const generation = ++fetchGenerationRef.current;
      if (append) {
        setLoadingMore(true);
        loadingMoreRef.current = true;
      } else {
        const hasExisting = listingsRef.current.length > 0;
        if (!hasExisting) {
          setLoading(true);
          loadingRef.current = true;
        } else {
          setListingsRefreshing(true);
        }
      }
      try {
        const apiStatus = toApiStatus(status);
        const apiPromoted = toApiPromoted(promoted);
        const apiSearch = toApiSearch(search);
        const res = await listingsApi.getMy(page, limit, apiStatus, apiPromoted, apiSearch);
        if (fetchGenerationRef.current !== generation) return;
        const normalized = normalizeListingResponse(res.data, page, limit);
        const newListings = normalized.data;
        if (append) {
          setListings((prev) => {
            const updated = mergeUniqueListings(prev, newListings);
            listingsRef.current = updated;
            return updated;
          });
        } else {
          setListings(newListings);
          listingsRef.current = newListings;
        }
        setCurrentPage(page);
        setMeta(normalized.meta);
        preloadListingPages(newListings);
      } catch {
        if (fetchGenerationRef.current !== generation) return;
        if (!append) {
          setListings([]);
          listingsRef.current = [];
        }
      } finally {
        if (fetchGenerationRef.current === generation) {
          if (!append) {
            setInitialListingsLoadDone(true);
          }
          if (append) {
            setLoadingMore(false);
            loadingMoreRef.current = false;
          } else {
            setLoading(false);
            loadingRef.current = false;
            setListingsRefreshing(false);
          }
        }
      }
    },
    [],
  );

  const refetchStatusCounts = useCallback(async () => {
    const generation = ++countsGenerationRef.current;
    try {
      const q = toApiSearch(searchQuery);
      const res = await listingsApi.getMyStatusCounts(q);
      if (countsGenerationRef.current !== generation) return;
      setStatusCounts(res.data);
      if (!q) {
        setHasAnyListingsOverall(res.data.Active + res.data.Paused + res.data.Closed > 0);
      }
    } catch {}
  }, [searchQuery]);

  const refetchHasActiveListingsOverall = useCallback(async () => {
    setHasActiveListingsOverall(await fetchHasActiveListingsOverall());
  }, []);

  const refetchHasAnyListingsOverall = useCallback(async () => {
    setHasAnyListingsOverall(await fetchHasAnyListingsOverall());
  }, []);

  const listingActions = useListingActions(
    {
      refreshCooldownMs: meta?.refreshCooldownMs ?? 0,
      lastRefreshAt: meta?.last_listing_refresh_at ?? null,
      timeUntilRefresh,
      setTimeUntilRefresh,
      canPromote: false,
      userId: user?.id,
      statusFilter,
      promotedFilter,
      searchQuery,
    },
    {
      setListings,
      listingsRef,
      fetchListings,
      refetchStatusCounts,
    },
  );

  const promotion = useMyListingsPromotion(user, listingActions);

  const statusFilterRef = useRef(statusFilter);
  const promotedFilterRef = useRef(promotedFilter);
  useEffect(() => {
    statusFilterRef.current = statusFilter;
  }, [statusFilter]);
  useEffect(() => {
    promotedFilterRef.current = promotedFilter;
  }, [promotedFilter]);

  useEffect(() => {
    if (!isAuthorized || !hasLoadedRef.current) return;
    const timer = setTimeout(() => {
      const q = searchQuery.trim();
      const apiStatus = toApiStatus(statusFilterRef.current);
      const apiPromoted = toPromotedBoolean(promotedFilterRef.current);
      setCurrentPage(1);
      void fetchListings(1, false, 20, apiStatus, apiPromoted, q || undefined).then(() => {
        void refetchStatusCounts();
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, isAuthorized, fetchListings, refetchStatusCounts]);

  useEffect(() => {
    if (!isAuthorized || !user) return;
    const shouldRefresh = sessionStorageGetItem('refreshMyListings');
    if (shouldRefresh === 'true') {
      sessionStorageRemoveItem('refreshMyListings');
      hasLoadedRef.current = true;
      void fetchListings(1, false);
      void refetchStatusCounts();
      void refetchHasActiveListingsOverall();
      void refetchHasAnyListingsOverall();
      return;
    }
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      void fetchListings(1, false);
      void refetchStatusCounts();
      void refetchHasActiveListingsOverall();
      void refetchHasAnyListingsOverall();
    }
  }, [
    user,
    isAuthorized,
    fetchListings,
    refetchStatusCounts,
    refetchHasActiveListingsOverall,
    refetchHasAnyListingsOverall,
  ]);

  useEffect(() => {
    const check = () => {
      if (sessionStorageGetItem('refreshMyListings') === 'true' && user) {
        sessionStorageRemoveItem('refreshMyListings');
        hasLoadedRef.current = true;
        void fetchListings(1, false);
        void refetchStatusCounts();
        void refetchHasActiveListingsOverall();
      }
    };
    check();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [
    user,
    fetchListings,
    refetchStatusCounts,
    refetchHasActiveListingsOverall,
    refetchHasAnyListingsOverall,
  ]);

  useCrossTabMyListingsRefetch({
    user,
    hasLoadedRef,
    fetchListings,
    refetchStatusCounts,
    refetchHasActiveListingsOverall,
    refetchHasAnyListingsOverall,
    statusFilter,
    promotedFilter,
    searchQuery,
  });

  useMyListingsUpdatedToast(t);
  useMyListingsRefreshCooldownTimer(meta, user?.id, timeUntilRefresh, setTimeUntilRefresh);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !meta?.totalPages || currentPage >= meta.totalPages) return;
    const promoted = toPromotedBoolean(promotedFilter);
    await fetchListings(currentPage + 1, true, 20, statusFilter, promoted, searchQuery);
  }, [loadingMore, meta, currentPage, fetchListings, statusFilter, promotedFilter, searchQuery]);

  const handleAction = useCallback(
    async (id: string, action: 'publish' | 'pause' | 'close') => {
      if (action === 'close') {
        setListingToClose(id);
        setIsCloseConfirmOpen(true);
        return;
      }
      if (action === 'publish') await listingActions.publishListing(id);
      else await listingActions.pauseListing(id);
      void refetchHasActiveListingsOverall();
    },
    [listingActions, refetchHasActiveListingsOverall],
  );

  const handleCloseConfirm = useCallback(async () => {
    if (!listingToClose) return;
    try {
      await listingActions.closeListing(listingToClose);
      void refetchHasActiveListingsOverall();
    } finally {
      setIsCloseConfirmOpen(false);
      setListingToClose(null);
    }
  }, [listingToClose, listingActions, refetchHasActiveListingsOverall]);

  const handleRefreshDates = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await listingActions.refreshAllDates();
    } finally {
      setIsRefreshing(false);
    }
  }, [listingActions]);

  const formattedTime = useMemo(
    () =>
      timeUntilRefresh === null || timeUntilRefresh <= 0
        ? null
        : listingActions.formatTimeRemaining(timeUntilRefresh),
    [timeUntilRefresh, listingActions],
  );

  const handleStatusFilterChange = useCallback(
    (newStatus: StatusFilter) => {
      setStatusFilter(newStatus);
      if (promotedFilter !== 'All') setPromotedFilter('All');
      setCurrentPage(1);
      void fetchListings(1, false, 20, newStatus, undefined, searchQuery);
    },
    [fetchListings, promotedFilter, searchQuery],
  );

  const handlePromotedFilterToggle = useCallback(() => {
    const newPromoted = promotedFilter === 'Promoted' ? 'All' : 'Promoted';
    setPromotedFilter(newPromoted);
    const newStatus = newPromoted === 'Promoted' ? 'All' : statusFilter;
    if (newPromoted === 'Promoted') setStatusFilter('All');
    setCurrentPage(1);
    void fetchListings(
      1,
      false,
      20,
      newStatus,
      newPromoted === 'Promoted' ? true : undefined,
      searchQuery,
    );
  }, [fetchListings, promotedFilter, statusFilter, searchQuery]);

  const filterStatusCounts = useMemo(
    () => ({
      Active: statusCounts.Active,
      Paused: statusCounts.Paused,
      Closed: statusCounts.Closed,
    }),
    [statusCounts],
  );

  const isLoadingContent = !initialListingsLoadDone && (loading || !hasLoadedRef.current);
  const { visible: showSkeleton } = useLoadingState({
    isLoading: isLoadingContent,
    ...SKELETON_PAGE,
  });

  return {
    user,
    isLoading,
    isAuthorized,
    listings,
    showSkeleton,
    listingsRefreshing,
    statusFilter,
    statusCounts: filterStatusCounts,
    promotedCount: statusCounts.Promoted,
    hasAnyListingsOverall,
    meta,
    currentPage,
    loadingMore,
    isRefreshing,
    timeUntilRefresh,
    formattedTime,
    hasActiveListingsOverall,
    isCloseConfirmOpen,
    listingToClose,
    setIsCloseConfirmOpen,
    setListingToClose,
    handleStatusFilterChange,
    handlePromotedFilterToggle,
    handleAction,
    handleCloseConfirm,
    handleRefreshDates,
    handleLoadMore,
    listingActions,
    promotedFilter,
    searchQuery,
    setSearchQuery,
    ...promotion,
  };
}
