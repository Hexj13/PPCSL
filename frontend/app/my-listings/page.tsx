'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ListingManagementCard } from '@/components/ListingManagementCard';
import { ListingManagementCardSkeleton } from '@/components/ListingManagementCardSkeleton';
import { Modal } from '@/components/Modal';
import { PromotionHistoryModal } from '@/components/PromotionHistoryModal';
import { PromotionModal } from '@/components/PromotionModal';
import { useTranslation } from '@/hooks/useTranslation';
import { listingsApi, Listing, PaginationMeta, PromotionHistory } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function MyListingsPage() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
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

        if ('caches' in window && newListings.length > 0) {
          caches.open('kupito-data-v1').then((cache) => {
            newListings.forEach((listing) => {
              cache.add(`/listings/${listing.id}`).catch(() => {});
            });
          });
        }
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

        listingsApi
          .getMy(1, 1000)
          .then((res) => {
            const responseData = res.data;
            let allListings: Listing[] = [];
            if (Array.isArray(responseData)) {
              allListings = responseData;
            } else if (responseData && typeof responseData === 'object') {
              allListings = responseData.data || [];
            }
            setAllListingsForCount(allListings);
          })
          .catch(() => {});

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
      if (action === 'close') {
        setListingToClose(id);
        setIsCloseConfirmOpen(true);
        return;
      }

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
        }

        setListings((prev) => {
          const updated = prev.map((listing) => {
            if (listing.id === id) {
              const statusMap: Record<'publish' | 'pause', 'Active' | 'Paused'> = {
                publish: 'Active',
                pause: 'Paused',
              };
              return { ...listing, status: statusMap[action] };
            }
            return listing;
          });
          listingsRef.current = updated;
          setAllListingsForCount((prevAll) => {
            const found = prevAll.find((listing) => listing.id === id);
            if (found) {
              const statusMap: Record<'publish' | 'pause', 'Active' | 'Paused'> = {
                publish: 'Active',
                pause: 'Paused',
              };
              return prevAll.map((listing) => {
                if (listing.id === id) {
                  return { ...listing, status: statusMap[action] };
                }
                return listing;
              });
            } else {
              listingsApi
                .getMy(1, 1000)
                .then((res) => {
                  const responseData = res.data;
                  let allListings: Listing[] = [];
                  if (Array.isArray(responseData)) {
                    allListings = responseData;
                  } else if (responseData && typeof responseData === 'object') {
                    allListings = responseData.data || [];
                  }
                  setAllListingsForCount(allListings);
                })
                .catch(() => {});
              return prevAll;
            }
          });
          return updated;
        });
      } catch {
        toast.error(t('myListings.statusUpdateError'));
      }
    },
    [t]
  );

  const handleCloseConfirm = useCallback(async () => {
    if (!listingToClose) return;

    try {
      await listingsApi.close(listingToClose);
      toast.success(t('myListings.closedMessage'));

      setListings((prev) => {
        const updated = prev.map((listing) => {
          if (listing.id === listingToClose) {
            return {
              ...listing,
              status: 'Closed' as const,
              is_promoted: false,
              promoted_until: null,
            };
          }
          return listing;
        });
        listingsRef.current = updated;
        setAllListingsForCount((prevAll) => {
          const found = prevAll.find((listing) => listing.id === listingToClose);
          if (found) {
            return prevAll.map((listing) => {
              if (listing.id === listingToClose) {
                return {
                  ...listing,
                  status: 'Closed' as const,
                  is_promoted: false,
                  promoted_until: null,
                };
              }
              return listing;
            });
          } else {
            listingsApi
              .getMy(1, 1000)
              .then((res) => {
                const responseData = res.data;
                let allListings: Listing[] = [];
                if (Array.isArray(responseData)) {
                  allListings = responseData;
                } else if (responseData && typeof responseData === 'object') {
                  allListings = responseData.data || [];
                }
                setAllListingsForCount(allListings);
              })
              .catch(() => {});
            return prevAll;
          }
        });
        return updated;
      });
    } catch {
      toast.error(t('myListings.statusUpdateError'));
    } finally {
      setIsCloseConfirmOpen(false);
      setListingToClose(null);
    }
  }, [listingToClose, t]);

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
        toast.error(t('promotion.history.loadError'));
      } finally {
        setLoadingHistory(false);
      }
    },
    [t]
  );

  useEffect(() => {
    if (user) {
      checkPromotionHistory();
    }
  }, [user, checkPromotionHistory]);

  useEffect(() => {
    const checkPromotionAccess = async () => {
      try {
        const res = await listingsApi.getPromotionAccess();
        setCanPromote(res.data.canPromote);
      } catch {
        setCanPromote(false);
      }
    };
    checkPromotionAccess();
  }, []);

  const handlePromoteClick = useCallback((id: string) => {
    setSelectedListingId(id);
    setPromotionModalOpen(true);
  }, []);

  const handlePromotionSelect = useCallback(
    async (days: number | null) => {
      if (!selectedListingId) return;
      if (days === null) {
        toast.error(t('listings.promotionNotAvailable'));
        return;
      }

      try {
        await listingsApi.togglePromotion(selectedListingId, true, days);
        toast.success(t('listings.promotionEnabled'));
        fetchListings(1, false);
      } catch (error: unknown) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 403) {
          toast.error(t('listings.promotionNotAvailable'));
        } else if (axiosError.response?.status === 400) {
          toast.error(t('listings.promotionOnlyActive'));
        } else {
          toast.error(t('listings.promotionError'));
        }
      } finally {
        setPromotionModalOpen(false);
        setSelectedListingId(null);
      }
    },
    [selectedListingId, fetchListings, t]
  );

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
    let filtered = listings;

    if (statusFilter !== 'All') {
      filtered = filtered.filter((l) => l.status === statusFilter);
    }

    if (promotedFilter === 'Promoted') {
      filtered = filtered.filter((l) => l.is_promoted === true);
    } else if (promotedFilter === 'NotPromoted') {
      filtered = filtered.filter((l) => l.is_promoted !== true);
    }

    return filtered;
  }, [listings, statusFilter, promotedFilter]);

  const statusCounts = useMemo(() => {
    const sourceListings = allListingsForCount.length > 0 ? allListingsForCount : listings;
    return {
      Active: sourceListings.filter((l) => l.status === 'Active').length,
      Paused: sourceListings.filter((l) => l.status === 'Paused').length,
      Closed: sourceListings.filter((l) => l.status === 'Closed').length,
    };
  }, [listings, allListingsForCount]);

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
          {listings && listings.length > 0 && canPromote && (
            <button
              onClick={() => {
                setPromotionHistoryModalOpen(true);
                loadPromotionHistory(1);
              }}
              disabled={!hasPromotionHistory}
              className={`w-full sm:w-auto h-[52px] min-h-[52px] px-4 rounded-lg text-base font-semibold transition-colors flex items-center justify-center ${
                hasPromotionHistory
                  ? 'bg-primary-500/20 border-2 border-primary-500/40 text-primary-300 hover:bg-primary-500/30 hover:border-primary-500/60'
                  : 'bg-bg-light border-2 border-primary-500/20 text-gray-500 cursor-not-allowed opacity-50'
              }`}
            >
              {t('myListings.promotionHistory')}
            </button>
          )}
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
                onClick={() => {
                  setStatusFilter(status);
                  if (promotedFilter !== 'All') {
                    setPromotedFilter('All');
                  }
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors bg-bg-light hover:bg-bg-dark border ${
                  statusFilter === status
                    ? 'border-primary-500 text-white'
                    : 'border-primary-500/20'
                }`}
                style={statusFilter !== status ? { color: 'rgb(243, 243, 243)' } : undefined}
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
            {canPromote && (
              <button
                onClick={() => {
                  const newPromotedFilter = promotedFilter === 'Promoted' ? 'All' : 'Promoted';
                  setPromotedFilter(newPromotedFilter);
                  if (newPromotedFilter === 'Promoted') {
                    setStatusFilter('All');
                  }
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors bg-bg-light hover:bg-bg-dark border ${
                  promotedFilter === 'Promoted'
                    ? 'border-primary-500 text-white'
                    : 'border-primary-500/20'
                }`}
                style={promotedFilter !== 'Promoted' ? { color: 'rgb(243, 243, 243)' } : undefined}
              >
                {t('myListings.promoted')}
                <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-500/20 text-xs">
                  {
                    (allListingsForCount.length > 0 ? allListingsForCount : listings).filter(
                      (l) => l.is_promoted === true
                    ).length
                  }
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {!listings || listings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg" style={{ color: 'rgb(243, 243, 243)' }}>
            {t('myListings.noListingsYet')}
          </p>
        </div>
      ) : (
        <>
          {filteredListings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg" style={{ color: 'rgb(243, 243, 243)' }}>
                {t('myListings.noListingsWithStatus')}
              </p>
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
                    onPromoteClick={canPromote ? handlePromoteClick : undefined}
                  />
                ))}
              </div>
            </>
          )}

          {loadingMore && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-2" style={{ color: 'rgb(243, 243, 243)' }}>
                {t('common.loading')}
              </p>
            </div>
          )}

          {filteredListings.length > 0 && (
            <>
              {(() => {
                const noFilters = statusFilter === 'All' && promotedFilter === 'All';
                const allFilteredMatch = filteredListings.length === listings.length;
                const shouldShow = noFilters || allFilteredMatch;

                return (
                  meta &&
                  meta.totalPages &&
                  currentPage < meta.totalPages &&
                  !loadingMore &&
                  shouldShow && (
                    <div className="flex justify-center py-8">
                      <button
                        onClick={handleLoadMore}
                        className="btn-primary px-8 py-3 text-lg font-semibold"
                      >
                        {t('myListings.loadMore')}
                      </button>
                    </div>
                  )
                );
              })()}

              {meta && meta.totalPages && currentPage >= meta.totalPages && listings.length > 0 && (
                <div className="text-center py-8">
                  <p style={{ color: 'rgb(243, 243, 243)' }}>{t('myListings.noMoreListings')}</p>
                </div>
              )}
            </>
          )}
        </>
      )}

      <Modal
        isOpen={isCloseConfirmOpen}
        onClose={() => {
          setIsCloseConfirmOpen(false);
          setListingToClose(null);
        }}
        title={t('myListings.closeConfirmTitle')}
        size="medium"
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-base leading-relaxed" style={{ color: 'rgb(243, 243, 243)' }}>
              {t('myListings.closeConfirmQuestion')}
            </p>
            <ol
              className="list-decimal list-inside space-y-2 text-base leading-relaxed"
              style={{ color: 'rgb(243, 243, 243)' }}
            >
              <li>{t('myListings.closeConfirmWarning1')}</li>
              {listingToClose && listings.find((l) => l.id === listingToClose)?.is_promoted && (
                <>
                  <li>{t('myListings.closeConfirmWarning2')}</li>
                  <li>{t('myListings.closeConfirmWarning3')}</li>
                </>
              )}
            </ol>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button
              onClick={() => {
                setIsCloseConfirmOpen(false);
                setListingToClose(null);
              }}
              className="px-6 py-2.5 bg-bg-light border-2 border-primary-500/30 text-white hover:bg-bg-dark hover:border-primary-500/50 rounded-lg font-semibold transition-colors"
            >
              {t('myListings.closeConfirmCancel')}
            </button>
            <button
              onClick={handleCloseConfirm}
              className="px-6 py-2.5 bg-primary-600 text-white hover:bg-primary-700 rounded-lg font-semibold transition-colors"
            >
              {t('myListings.closeConfirmOk')}
            </button>
          </div>
        </div>
      </Modal>

      <PromotionModal
        isOpen={promotionModalOpen}
        onClose={() => {
          setPromotionModalOpen(false);
          setSelectedListingId(null);
        }}
        onSelect={handlePromotionSelect}
        isAdmin={false}
      />

      <PromotionHistoryModal
        isOpen={promotionHistoryModalOpen}
        onClose={() => setPromotionHistoryModalOpen(false)}
        history={promotionHistory}
        meta={promotionHistoryMeta}
        currentPage={promotionHistoryPage}
        loading={loadingHistory}
        onPageChange={loadPromotionHistory}
      />
    </div>
  );
}
