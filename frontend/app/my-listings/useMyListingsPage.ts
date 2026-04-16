'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCrossTabMyListingsRefetch } from '@/hooks/useCrossTabMyListingsRefetch';
import { useListingActions } from '@/hooks/useListingActions';
import { useLoadingState } from '@/hooks/useLoadingState';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useTranslation } from '@/hooks/useTranslation';
import type { Listing, PaginationMeta, PromotionAccessStatus, PromotionHistory } from '@/lib/api';
import { listingsApi, normalizeListingResponse } from '@/lib/api';
import { sessionStorageGetItem, sessionStorageRemoveItem } from '@/lib/browser-session-storage';
import { silentCatch } from '@/lib/utils';

import { useMyListingsRefreshCooldownTimer } from './useMyListingsRefreshCooldownTimer';
import { useMyListingsUpdatedToast } from './useMyListingsUpdatedToast';

type StatusFilter = 'All' | 'Active' | 'Paused' | 'Closed';
type PromotedFilter = 'All' | 'Promoted' | 'NotPromoted';
type PromotionHistoryMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

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

function extractListings(data: unknown): Listing[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
    return data.data as Listing[];
  }
  return [];
}

function mergeUniqueListings(prev: Listing[], next: Listing[]) {
  const existingIds = new Set(prev.map((listing) => listing.id));
  const unique = next.filter((listing) => !existingIds.has(listing.id));
  return [...prev, ...unique];
}

function getStatusCounts(source: Listing[]) {
  return {
    Active: source.filter((listing) => listing.status === 'Active').length,
    Paused: source.filter((listing) => listing.status === 'Paused').length,
    Closed: source.filter((listing) => listing.status === 'Closed').length,
  };
}

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

async function fetchPromotionAccess(): Promise<PromotionAccessStatus> {
  try {
    const res = await listingsApi.getPromotionAccess();
    return res.data;
  } catch {
    return {
      access: 'disabled',
      enabled: false,
      isAdmin: false,
      canPromote: false,
      isPartner: false,
      freePromotionBalance: 0,
      partnerListingProgress: 0,
      listingsUntilNextFreePromotion: null,
    };
  }
}

async function fetchPromotionHistoryAvailability() {
  try {
    const res = await listingsApi.hasPromotionHistory();
    return res.data.hasHistory;
  } catch {
    return false;
  }
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

export function useMyListingsPage() {
  const { user, isLoading, isAuthorized } = useRequireAuth();
  const { t } = useTranslation();
  const [listings, setListings] = useState<Listing[]>([]);
  const [allListingsForCount, setAllListingsForCount] = useState<Listing[]>([]);
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
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [promotionHistoryModalOpen, setPromotionHistoryModalOpen] = useState(false);
  const [hasPromotionHistory, setHasPromotionHistory] = useState(false);
  const [promotionHistory, setPromotionHistory] = useState<PromotionHistory[]>([]);
  const [promotionHistoryPage, setPromotionHistoryPage] = useState(1);
  const [promotionHistoryMeta, setPromotionHistoryMeta] = useState<PromotionHistoryMeta | null>(
    null,
  );
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [promotionAccess, setPromotionAccess] = useState<PromotionAccessStatus | null>(null);
  const [hasActiveListingsOverall, setHasActiveListingsOverall] = useState(false);
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

  const refetchAllForCount = useCallback(async () => {
    const generation = ++countsGenerationRef.current;
    try {
      const q = toApiSearch(searchQuery);
      const res = await listingsApi.getMy(1, 1000, undefined, undefined, q);
      if (countsGenerationRef.current !== generation) return;
      setAllListingsForCount(extractListings(res.data));
    } catch {}
  }, [searchQuery]);

  const refetchHasActiveListingsOverall = useCallback(async () => {
    setHasActiveListingsOverall(await fetchHasActiveListingsOverall());
  }, []);

  const loadPromotionAccess = useCallback(async () => {
    setPromotionAccess(await fetchPromotionAccess());
  }, []);

  const listingActions = useListingActions(
    {
      refreshCooldownMs: meta?.refreshCooldownMs ?? 0,
      lastRefreshAt: meta?.last_listing_refresh_at ?? null,
      timeUntilRefresh,
      setTimeUntilRefresh,
      canPromote: (promotionAccess?.canPromote ?? false) || (promotionAccess?.isPartner ?? false),
      userId: user?.id,
      statusFilter,
      promotedFilter,
      searchQuery,
    },
    {
      setListings,
      setAllListingsForCount,
      listingsRef,
      fetchListings,
      refetchAllForCount,
    },
  );

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
        void refetchAllForCount();
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, isAuthorized, fetchListings, refetchAllForCount]);

  useEffect(() => {
    if (!isAuthorized || !user) return;
    const shouldRefresh = sessionStorageGetItem('refreshMyListings');
    if (shouldRefresh === 'true') {
      sessionStorageRemoveItem('refreshMyListings');
      hasLoadedRef.current = false;
    }
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      void fetchListings(1, false);
      void refetchAllForCount();
      void refetchHasActiveListingsOverall();
    }
  }, [user, isAuthorized, fetchListings, refetchAllForCount, refetchHasActiveListingsOverall]);

  useEffect(() => {
    const check = () => {
      if (sessionStorageGetItem('refreshMyListings') === 'true' && user) {
        sessionStorageRemoveItem('refreshMyListings');
        hasLoadedRef.current = false;
        void fetchListings(1, false);
        void refetchAllForCount();
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
  }, [user, fetchListings, refetchAllForCount, refetchHasActiveListingsOverall]);

  useCrossTabMyListingsRefetch({
    user,
    hasLoadedRef,
    fetchListings,
    refetchAllForCount,
    refetchHasActiveListingsOverall,
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

  const checkPromotionHistory = useCallback(async () => {
    setHasPromotionHistory(await fetchPromotionHistoryAvailability());
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
        const { toast } = await import('@/lib/toast');
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
    void loadPromotionAccess();
  }, [loadPromotionAccess]);

  const handlePromoteClick = useCallback((id: string) => {
    setSelectedListingId(id);
    setPromotionModalOpen(true);
  }, []);

  const handlePromotionSelect = useCallback(
    async (days: number | null) => {
      if (!selectedListingId) return;
      await listingActions.togglePromotion(
        selectedListingId,
        true,
        days,
        days === null ? 'partner_balance' : 'default',
      );
      await loadPromotionAccess();
      await checkPromotionHistory();
      setPromotionModalOpen(false);
      setSelectedListingId(null);
    },
    [selectedListingId, listingActions, loadPromotionAccess, checkPromotionHistory],
  );

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

  const statusCounts = useMemo(() => getStatusCounts(allListingsForCount), [allListingsForCount]);

  const isLoadingContent = !initialListingsLoadDone && (loading || !hasLoadedRef.current);
  const { visible: showSkeleton } = useLoadingState({
    isLoading: isLoadingContent,
    immediate: true,
    showDelay: 0,
    minDisplayTime: 1000,
  });

  const canPromote =
    (promotionAccess?.canPromote ?? false) || (promotionAccess?.isPartner ?? false);

  return {
    user,
    isLoading,
    isAuthorized,
    listings,
    showSkeleton,
    listingsRefreshing,
    statusFilter,
    statusCounts,
    allListingsForCount,
    meta,
    currentPage,
    loadingMore,
    isRefreshing,
    timeUntilRefresh,
    formattedTime,
    hasActiveListingsOverall,
    canPromote,
    promotionAccess,
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
    searchQuery,
    setSearchQuery,
  };
}
