'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useListingActions } from '@/hooks/useListingActions';
import { useLoadingState } from '@/hooks/useLoadingState';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useTranslation } from '@/hooks/useTranslation';
import type { Listing, PaginationMeta, PromotionHistory } from '@/lib/api';
import { listingsApi, normalizeListingResponse } from '@/lib/api';

export function useMyListingsPage() {
  const { user, isLoading, isAuthorized } = useRequireAuth();
  const { t } = useTranslation();
  const [listings, setListings] = useState<Listing[]>([]);
  const [allListingsForCount, setAllListingsForCount] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Paused' | 'Closed'>('All');
  const [promotedFilter, setPromotedFilter] = useState<'All' | 'Promoted' | 'NotPromoted'>('All');
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [listingToClose, setListingToClose] = useState<string | null>(null);
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [promotionHistoryModalOpen, setPromotionHistoryModalOpen] = useState(false);
  const [hasPromotionHistory, setHasPromotionHistory] = useState(false);
  const [promotionHistory, setPromotionHistory] = useState<PromotionHistory[]>([]);
  const [promotionHistoryPage, setPromotionHistoryPage] = useState(1);
  const [promotionHistoryMeta, setPromotionHistoryMeta] = useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [canPromote, setCanPromote] = useState(false);
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const showLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listingsRef = useRef<Listing[]>([]);
  const fetchGenerationRef = useRef(0);

  const fetchListings = useCallback(
    async (
      page: number,
      append: boolean = false,
      limit: number = 20,
      status?: string,
      promoted?: boolean,
    ) => {
      if (append && (loadingMoreRef.current || loadingRef.current)) return;
      if (!append && loadingRef.current) return;
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
          showLoadingTimeoutRef.current = setTimeout(() => {
            setLoading(true);
            loadingRef.current = true;
          }, 200);
        }
      }
      try {
        const apiStatus = status && status !== 'All' ? status : undefined;
        const apiPromoted = promoted === undefined ? undefined : promoted;
        const res = await listingsApi.getMy(page, limit, apiStatus, apiPromoted);
        if (fetchGenerationRef.current !== generation) return;
        const normalized = normalizeListingResponse(res.data, page, limit);
        const newListings = normalized.data;
        if (append) {
          setListings((prev) => {
            const existingIds = new Set(prev.map((l) => l.id));
            const unique = newListings.filter((l) => !existingIds.has(l.id));
            const updated = [...prev, ...unique];
            listingsRef.current = updated;
            return updated;
          });
        } else {
          setListings(newListings);
          listingsRef.current = newListings;
        }
        setCurrentPage(page);
        setMeta(normalized.meta);
        if ('caches' in window && newListings.length > 0) {
          void caches
            .open('kupito-data-v1')
            .then((cache) => {
              newListings.forEach((listing) => {
                cache.add(`/listings/${listing.id}`).catch(() => {});
              });
            })
            .catch(() => {});
        }
      } catch {
        if (fetchGenerationRef.current !== generation) return;
        if (!append) {
          setListings([]);
          listingsRef.current = [];
        }
      } finally {
        if (fetchGenerationRef.current === generation) {
          if (showLoadingTimeoutRef.current) {
            clearTimeout(showLoadingTimeoutRef.current);
            showLoadingTimeoutRef.current = null;
          }
          if (append) {
            setLoadingMore(false);
            loadingMoreRef.current = false;
          } else {
            setLoading(false);
            loadingRef.current = false;
          }
        }
      }
    },
    [],
  );

  const refetchAllForCount = useCallback(async () => {
    try {
      const res = await listingsApi.getMy(1, 1000);
      const data = res.data;
      const all = Array.isArray(data) ? data : (data?.data ?? []);
      setAllListingsForCount(all);
    } catch {
      // ignore
    }
  }, []);

  const listingActions = useListingActions(
    {
      refreshCooldownMs: meta?.refreshCooldownMs ?? 0,
      lastRefreshAt: meta?.last_listing_refresh_at ?? null,
      timeUntilRefresh,
      setTimeUntilRefresh,
      canPromote,
      userId: user?.id,
      statusFilter,
      promotedFilter,
    },
    {
      setListings,
      setAllListingsForCount,
      listingsRef,
      fetchListings,
      refetchAllForCount,
    },
  );

  useEffect(() => {
    if (!isAuthorized || !user) return;
    const shouldRefresh = sessionStorage.getItem('refreshMyListings');
    if (shouldRefresh === 'true') {
      sessionStorage.removeItem('refreshMyListings');
      hasLoadedRef.current = false;
    }
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      void fetchListings(1, false);
      listingsApi
        .getMy(1, 1000)
        .then((res) => {
          const data = res.data;
          const all = Array.isArray(data) ? data : (data?.data ?? []);
          setAllListingsForCount(all);
        })
        .catch(() => {});
    }
  }, [user, isAuthorized, fetchListings]);

  useEffect(() => {
    const check = () => {
      if (sessionStorage.getItem('refreshMyListings') === 'true' && user) {
        sessionStorage.removeItem('refreshMyListings');
        hasLoadedRef.current = false;
        void fetchListings(1, false);
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
  }, [user, fetchListings]);

  useEffect(() => {
    if (!meta?.last_listing_refresh_at || meta?.refreshCooldownMs == null || !user?.id) return;
    const at = new Date(meta.last_listing_refresh_at).getTime();
    const remaining = at + meta.refreshCooldownMs - Date.now();
    if (remaining > 0) {
      setTimeUntilRefresh(remaining);
      localStorage.setItem(`lastRefreshDate_${user.id}`, at.toString());
    }
  }, [meta?.last_listing_refresh_at, meta?.refreshCooldownMs, user?.id]);

  useEffect(() => {
    if (timeUntilRefresh === null || timeUntilRefresh <= 0) return;
    const interval = setInterval(() => {
      setTimeUntilRefresh((prev) => (prev === null || prev <= 1000 ? 0 : prev - 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeUntilRefresh]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !meta?.totalPages || currentPage >= meta.totalPages) return;
    const promoted =
      promotedFilter === 'Promoted' ? true : promotedFilter === 'NotPromoted' ? false : undefined;
    await fetchListings(currentPage + 1, true, 20, statusFilter, promoted);
  }, [loadingMore, meta, currentPage, fetchListings, statusFilter, promotedFilter]);

  const handleAction = useCallback(
    async (id: string, action: 'publish' | 'pause' | 'close') => {
      if (action === 'close') {
        setListingToClose(id);
        setIsCloseConfirmOpen(true);
        return;
      }
      if (action === 'publish') await listingActions.publishListing(id);
      else await listingActions.pauseListing(id);
    },
    [listingActions],
  );

  const handleCloseConfirm = useCallback(async () => {
    if (!listingToClose) return;
    try {
      await listingActions.closeListing(listingToClose);
    } finally {
      setIsCloseConfirmOpen(false);
      setListingToClose(null);
    }
  }, [listingToClose, listingActions]);

  const handleRefreshDates = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await listingActions.refreshAllDates();
    } finally {
      setIsRefreshing(false);
    }
  }, [listingActions]);

  const checkPromotionHistory = useCallback(async () => {
    try {
      const res = await listingsApi.hasPromotionHistory();
      setHasPromotionHistory(res.data.hasHistory);
    } catch {
      setHasPromotionHistory(false);
    }
  }, []);

  const loadPromotionHistory = useCallback(
    async (page: number = 1) => {
      setLoadingHistory(true);
      try {
        const res = await listingsApi.getPromotionHistory(page, 50);
        setPromotionHistory(res.data.data);
        setPromotionHistoryMeta(res.data.meta);
        setPromotionHistoryPage(page);
      } catch {
        const { toast } = await import('react-hot-toast');
        toast.error(t('promotion.history.loadError'));
      } finally {
        setLoadingHistory(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (user) void checkPromotionHistory();
  }, [user, checkPromotionHistory]);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await listingsApi.getPromotionAccess();
        setCanPromote(res.data.canPromote);
      } catch {
        setCanPromote(false);
      }
    };
    void run();
  }, []);

  const handlePromoteClick = useCallback((id: string) => {
    setSelectedListingId(id);
    setPromotionModalOpen(true);
  }, []);

  const handlePromotionSelect = useCallback(
    async (days: number | null) => {
      if (!selectedListingId) return;
      await listingActions.togglePromotion(selectedListingId, true, days ?? undefined);
      setPromotionModalOpen(false);
      setSelectedListingId(null);
    },
    [selectedListingId, listingActions],
  );

  const formattedTime = useMemo(
    () =>
      timeUntilRefresh === null || timeUntilRefresh <= 0
        ? null
        : listingActions.formatTimeRemaining(timeUntilRefresh),
    [timeUntilRefresh, listingActions],
  );

  const hasActiveListings = useMemo(() => listings.some((l) => l.status === 'Active'), [listings]);

  const handleStatusFilterChange = useCallback(
    (newStatus: 'All' | 'Active' | 'Paused' | 'Closed') => {
      setStatusFilter(newStatus);
      if (promotedFilter !== 'All') setPromotedFilter('All');
      setCurrentPage(1);
      void fetchListings(1, false, 20, newStatus, undefined);
    },
    [fetchListings, promotedFilter],
  );

  const handlePromotedFilterToggle = useCallback(() => {
    const newPromoted = promotedFilter === 'Promoted' ? 'All' : 'Promoted';
    setPromotedFilter(newPromoted);
    const newStatus = newPromoted === 'Promoted' ? 'All' : statusFilter;
    if (newPromoted === 'Promoted') setStatusFilter('All');
    setCurrentPage(1);
    void fetchListings(1, false, 20, newStatus, newPromoted === 'Promoted' ? true : undefined);
  }, [fetchListings, promotedFilter, statusFilter]);

  const statusCounts = useMemo(() => {
    const source = allListingsForCount.length > 0 ? allListingsForCount : listings;
    return {
      Active: source.filter((l) => l.status === 'Active').length,
      Paused: source.filter((l) => l.status === 'Paused').length,
      Closed: source.filter((l) => l.status === 'Closed').length,
    };
  }, [listings, allListingsForCount]);

  const isLoadingContent = loading || !hasLoadedRef.current;
  const { visible: showSkeleton } = useLoadingState({
    isLoading: isLoadingContent,
    immediate: true,
    showDelay: 0,
    minDisplayTime: 1000,
  });

  return {
    user,
    isLoading,
    isAuthorized,
    listings,
    showSkeleton,
    statusFilter,
    statusCounts,
    allListingsForCount,
    meta,
    currentPage,
    loadingMore,
    isRefreshing,
    timeUntilRefresh,
    formattedTime,
    hasActiveListings,
    canPromote,
    hasPromotionHistory,
    isCloseConfirmOpen,
    listingToClose,
    setIsCloseConfirmOpen,
    setListingToClose,
    promotionModalOpen,
    setPromotionModalOpen,
    selectedListingId,
    setSelectedListingId,
    promotionHistoryModalOpen,
    setPromotionHistoryModalOpen,
    promotionHistory,
    promotionHistoryMeta,
    promotionHistoryPage,
    loadingHistory,
    loadPromotionHistory,
    handleStatusFilterChange,
    handlePromotedFilterToggle,
    handleAction,
    handleCloseConfirm,
    handleRefreshDates,
    handleLoadMore,
    handlePromoteClick,
    handlePromotionSelect,
    listingActions,
    promotedFilter,
  };
}
