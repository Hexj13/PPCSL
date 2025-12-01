'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ListingManagementCard } from '@/components/ListingManagementCard';
import { ListingManagementCardSkeleton } from '@/components/ListingManagementCardSkeleton';
import { useTranslation } from '@/hooks/useTranslation';
import { listingsApi, Listing, PaginationMeta } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function MyListingsPage() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const { t } = useTranslation();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Paused' | 'Closed'>('All');
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const showLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listingsRef = useRef<Listing[]>([]);

  const fetchListings = useCallback(
    async (page: number, append: boolean = false, limit: number = 20) => {
      if (append && loadingMoreRef.current) {
        return;
      }
      if (!append && loadingRef.current) {
        return;
      }

      if (append) {
        setLoadingMore(true);
        loadingMoreRef.current = true;
      } else {
        const hasExistingData = listingsRef.current.length > 0;
        if (!hasExistingData) {
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
        const res = await listingsApi.getMy(page, limit);
        const responseData = res.data;

        let newListings: Listing[] = [];
        let responseMeta: PaginationMeta | null = null;

        if (Array.isArray(responseData)) {
          newListings = responseData.slice((page - 1) * limit, page * limit);
          const total = responseData.length;
          const totalPages = Math.ceil(total / limit);
          responseMeta = {
            total,
            page,
            limit,
            totalPages,
          };
        } else if (responseData && typeof responseData === 'object') {
          newListings = responseData.data || [];
          responseMeta = responseData.meta || null;
        }

        if (newListings.length > limit) {
          newListings = newListings.slice(0, limit);
        }

        if (append) {
          setListings((prev) => {
            const existingIds = new Set(prev.map((l) => l.id));
            const uniqueNewListings = newListings.filter((l) => !existingIds.has(l.id));
            const updated = [...prev, ...uniqueNewListings];
            listingsRef.current = updated;
            return updated;
          });
          setCurrentPage(page);
        } else {
          setListings(newListings);
          listingsRef.current = newListings;
          setCurrentPage(page);
        }
        setMeta(responseMeta);
      } catch {
        if (!append) {
          setListings([]);
          listingsRef.current = [];
        }
      } finally {
        if (showLoadingTimeoutRef.current) {
          clearTimeout(showLoadingTimeoutRef.current);
          showLoadingTimeoutRef.current = null;
        }
        setLoadingMore(false);
        loadingMoreRef.current = false;
        setLoading(false);
        loadingRef.current = false;
      }
    },
    []
  );

  useEffect(() => {
    if (!isInitialized && !user) {
      return;
    }

    if (isInitialized && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      const shouldRefresh = sessionStorage.getItem('refreshMyListings');
      if (shouldRefresh === 'true') {
        sessionStorage.removeItem('refreshMyListings');
        hasLoadedRef.current = false;
      }

      if (!hasLoadedRef.current) {
        hasLoadedRef.current = true;
        fetchListings(1, false);

        const lastRefreshKey = `lastRefreshDate_${user.id}`;
        const lastRefreshStr = localStorage.getItem(lastRefreshKey);
        if (lastRefreshStr) {
          const lastRefresh = parseInt(lastRefreshStr, 10);
          const now = Date.now();
          const twoDays = 48 * 60 * 60 * 1000;
          const timePassed = now - lastRefresh;

          if (timePassed < twoDays) {
            const remaining = twoDays - timePassed;
            setTimeUntilRefresh(remaining);
          }
        }
      }
    }
  }, [user, isInitialized, router, fetchListings]);

  useEffect(() => {
    const checkAndRefresh = () => {
      const shouldRefresh = sessionStorage.getItem('refreshMyListings');
      if (shouldRefresh === 'true' && user) {
        sessionStorage.removeItem('refreshMyListings');
        hasLoadedRef.current = false;
        fetchListings(1, false);
      }
    };

    checkAndRefresh();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndRefresh();
      }
    };

    const handleFocus = () => {
      checkAndRefresh();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, fetchListings]);

  useEffect(() => {
    if (timeUntilRefresh === null || timeUntilRefresh <= 0) return;

    const interval = setInterval(() => {
      setTimeUntilRefresh((prev) => {
        if (prev === null || prev <= 1000) {
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeUntilRefresh]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !meta || !meta.totalPages || currentPage >= meta.totalPages) {
      return;
    }

    const nextPage = currentPage + 1;
    await fetchListings(nextPage, true);
  }, [loadingMore, meta, currentPage, fetchListings]);

  const handleAction = useCallback(
    async (id: string, action: 'publish' | 'pause' | 'close') => {
      try {
        switch (action) {
          case 'publish':
            await listingsApi.publish(id);
            toast.success(t('myListings.published'));
            break;
          case 'pause':
            await listingsApi.pause(id);
            toast.success(t('myListings.pausedMessage'));
            break;
          case 'close':
            await listingsApi.close(id);
            toast.success(t('myListings.closedMessage'));
            break;
        }

        setListings((prev) => {
          const updated = prev.map((listing) => {
            if (listing.id === id) {
              const statusMap: Record<
                'publish' | 'pause' | 'close',
                'Active' | 'Paused' | 'Closed'
              > = {
                publish: 'Active',
                pause: 'Paused',
                close: 'Closed',
              };
              return { ...listing, status: statusMap[action] };
            }
            return listing;
          });
          listingsRef.current = updated;
          return updated;
        });
      } catch {
        toast.error(t('myListings.statusUpdateError'));
      }
    },
    [t]
  );

  const handleRefreshDates = useCallback(async () => {
    if (timeUntilRefresh !== null && timeUntilRefresh > 0) {
      toast.error(t('myListings.refreshDateLimit'));
      return;
    }

    setIsRefreshing(true);
    try {
      const res = await listingsApi.refreshDates();
      toast.success(t('myListings.datesUpdated', { count: res.data.updated }));

      const lastRefreshKey = `lastRefreshDate_${user?.id}`;
      localStorage.setItem(lastRefreshKey, Date.now().toString());
      setTimeUntilRefresh(48 * 60 * 60 * 1000);

      fetchListings(1, false);
    } catch {
    } finally {
      setIsRefreshing(false);
    }
  }, [timeUntilRefresh, user?.id, fetchListings, t]);

  const formatTimeRemaining = useCallback((ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const formattedTime = useMemo(() => {
    if (timeUntilRefresh === null || timeUntilRefresh <= 0) return null;
    return formatTimeRemaining(timeUntilRefresh);
  }, [timeUntilRefresh, formatTimeRemaining]);

  const hasActiveListings = useMemo(() => {
    return listings.some((listing) => listing.status === 'Active');
  }, [listings]);

  const filteredListings = useMemo(() => {
    if (statusFilter === 'All') {
      return listings;
    }
    return listings.filter((listing) => listing.status === statusFilter);
  }, [listings, statusFilter]);

  const statusCounts = useMemo(() => {
    return {
      Active: listings.filter((l) => l.status === 'Active').length,
      Paused: listings.filter((l) => l.status === 'Paused').length,
      Closed: listings.filter((l) => l.status === 'Closed').length,
    };
  }, [listings]);

  if (!isInitialized && !user) {
    return null;
  }

  if (!user) {
    return null;
  }

  if (loading || !hasLoadedRef.current) {
    return (
      <div>
        <Breadcrumbs
          items={[{ label: t('myListings.home'), href: '/' }, { label: t('myListings.title') }]}
          className="mb-6"
        />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
            {t('myListings.title')}
          </h1>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <ListingManagementCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[{ label: t('myListings.home'), href: '/' }, { label: t('myListings.title') }]}
        className="mb-6"
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
          {t('myListings.title')}
        </h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={handleRefreshDates}
            disabled={
              isRefreshing ||
              (timeUntilRefresh !== null && timeUntilRefresh > 0) ||
              !hasActiveListings
            }
            className="w-full sm:w-auto btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            {isRefreshing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {t('myListings.refreshing')}
              </>
            ) : formattedTime ? (
              <>{t('myListings.refreshDateWithTime', { time: formattedTime })}</>
            ) : (
              t('myListings.refreshDate')
            )}
          </button>
          {(!listings || listings.length === 0) && (
            <a
              href="/listings/new"
              className="w-full sm:w-auto btn-primary inline-block text-center"
            >
              {t('myListings.createListing')}
            </a>
          )}
        </div>
      </div>

      {listings && listings.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-3">
            {(['All', 'Active', 'Paused', 'Closed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-primary-600 text-white'
                    : 'bg-bg-light text-gray-300 hover:bg-bg-dark border border-primary-500/20'
                }`}
              >
                {status === 'All'
                  ? t('myListings.all')
                  : status === 'Active'
                    ? t('myListings.active')
                    : status === 'Paused'
                      ? t('myListings.paused')
                      : t('myListings.closed')}
                {status !== 'All' && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-500/20 text-xs">
                    {statusCounts[status]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {!listings || listings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-300 text-lg">{t('myListings.noListingsYet')}</p>
        </div>
      ) : (
        <>
          {filteredListings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-300 text-lg">{t('myListings.noListingsWithStatus')}</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {filteredListings.map((listing) => (
                  <ListingManagementCard
                    key={listing.id}
                    listing={listing}
                    mode="my-listings"
                    onAction={handleAction}
                  />
                ))}
              </div>
            </>
          )}

          {loadingMore && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-gray-300">{t('common.loading')}</p>
            </div>
          )}

          {filteredListings.length > 0 && (
            <>
              {meta && meta.totalPages && currentPage < meta.totalPages && !loadingMore && (
                <div className="flex justify-center py-8">
                  <button
                    onClick={handleLoadMore}
                    className="btn-primary px-8 py-3 text-lg font-semibold"
                  >
                    {t('myListings.loadMore')}
                  </button>
                </div>
              )}

              {meta && meta.totalPages && currentPage >= meta.totalPages && listings.length > 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-300">{t('myListings.noMoreListings')}</p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
