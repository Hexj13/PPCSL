'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import { EmptyState } from '@/components/EmptyState';
import { ListingManagementCard } from '@/components/ListingManagementCard';
import { ListingManagementCardSkeleton } from '@/components/ListingManagementCardSkeleton';
import { LoadMoreButton } from '@/components/LoadMoreButton';
import { Modal } from '@/components/Modal';
import { PromotionHistoryModal } from '@/components/PromotionHistoryModal';
import { PromotionModal } from '@/components/PromotionModal';
import { SkeletonContainer } from '@/components/SkeletonContainer';
import { StatusFilterButtons } from '@/components/StatusFilterButtons';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { listingsApi, Listing, PaginationMeta, PromotionHistory } from '@/lib/api';
import { normalizeListingResponse } from '@/lib/api-utils';

export default function MyListingsPage() {
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

        const normalized = normalizeListingResponse(responseData, page, limit);
        const newListings = normalized.data;
        const responseMeta = normalized.meta;

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
    if (!isAuthorized || !user) {
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
  }, [user, isAuthorized, fetchListings]);

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

  if (isLoading || !isAuthorized) {
    return null;
  }

  return (
    <>
      <SkeletonContainer isLoading={loading || !hasLoadedRef.current}>
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
      </SkeletonContainer>

      {!loading && hasLoadedRef.current && (
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
              <LoadMoreButton
                onClick={handleRefreshDates}
                disabled={
                  isRefreshing ||
                  (timeUntilRefresh !== null && timeUntilRefresh > 0) ||
                  !hasActiveListings
                }
                variant="inline"
                className="w-full sm:w-auto"
              >
                {isRefreshing ? (
                  <>
                    <div className="w-3.5 h-3.5 md:w-4 md:h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                    {t('myListings.refreshing')}
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    {formattedTime ? (
                      <>{t('myListings.refreshDateWithTime', { time: formattedTime })}</>
                    ) : (
                      t('myListings.refreshDate')
                    )}
                  </>
                )}
              </LoadMoreButton>
              {listings && listings.length > 0 && canPromote && (
                <LoadMoreButton
                  onClick={() => {
                    setPromotionHistoryModalOpen(true);
                    loadPromotionHistory(1);
                  }}
                  disabled={!hasPromotionHistory}
                  variant="inline"
                  className="w-full sm:w-auto"
                >
                  <svg
                    className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {t('myListings.promotionHistory')}
                </LoadMoreButton>
              )}
              {(!listings || listings.length === 0) && (
                <a
                  href="/listings/new"
                  className="w-full sm:w-auto text-primary-400 font-medium text-sm md:text-base hover:text-primary-500 transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-4 py-2.5 md:py-3 rounded-lg border-2 border-primary-400/20 hover:border-primary-400/40 bg-primary-500/10 hover:bg-primary-500/20 inline-block text-center"
                >
                  {t('myListings.createListing')}
                </a>
              )}
            </div>
          </div>

          {listings && listings.length > 0 && (
            <div className="mb-6">
              <StatusFilterButtons
                currentFilter={statusFilter}
                onFilterChange={(status) => {
                  setStatusFilter(status);
                  if (promotedFilter !== 'All') {
                    setPromotedFilter('All');
                  }
                }}
                counts={statusCounts}
                showPromoted={canPromote}
                promotedCount={
                  (allListingsForCount.length > 0 ? allListingsForCount : listings).filter(
                    (l) => l.is_promoted === true
                  ).length
                }
                promotedActive={promotedFilter === 'Promoted'}
                onPromotedClick={() => {
                  const newPromotedFilter = promotedFilter === 'Promoted' ? 'All' : 'Promoted';
                  setPromotedFilter(newPromotedFilter);
                  if (newPromotedFilter === 'Promoted') {
                    setStatusFilter('All');
                  }
                }}
                translationPrefix="myListings"
              />
            </div>
          )}

          {!listings || listings.length === 0 ? (
            <EmptyState message={t('myListings.noListingsYet')} />
          ) : (
            <>
              {filteredListings.length === 0 ? (
                <EmptyState message={t('myListings.noListingsWithStatus')} />
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
                  <p className="mt-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
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
                      shouldShow && <LoadMoreButton onClick={handleLoadMore} />
                    );
                  })()}

                  {meta &&
                    meta.totalPages &&
                    currentPage >= meta.totalPages &&
                    listings.length > 0 && (
                      <div className="text-center pt-8 pb-0">
                        <p style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                          {t('myListings.noMoreListings')}
                        </p>
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
                <p className="text-base leading-relaxed text-text-secondary">
                  {t('myListings.closeConfirmQuestion')}
                </p>
                <ol className="list-decimal list-inside space-y-2 text-base leading-relaxed text-text-secondary">
                  <li>{t('myListings.closeConfirmWarning1')}</li>
                  <li>{t('myListings.closeConfirmWarning2')}</li>
                  {listingToClose && listings.find((l) => l.id === listingToClose)?.is_promoted && (
                    <>
                      <li>{t('myListings.closeConfirmWarning3')}</li>
                      <li>{t('myListings.closeConfirmWarning4')}</li>
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
                  className="flex-1 sm:flex-none btn-secondary"
                >
                  {t('myListings.closeConfirmCancel')}
                </button>
                <button onClick={handleCloseConfirm} className="flex-1 sm:flex-none btn-primary">
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
      )}
    </>
  );
}
