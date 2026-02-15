'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

import { EmptyState } from '@/components/common/EmptyState';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { ListingManagementCard } from '@/components/listing/ListingManagementCard';
import { ListingManagementCardSkeleton } from '@/components/listing/ListingManagementCardSkeleton';
import { LoadMoreButton } from '@/components/listing/LoadMoreButton';
import { StatusFilterButtons } from '@/components/listing/StatusFilterButtons';
import { Modal } from '@/components/modals/Modal';
import { PromotionHistoryModal } from '@/components/modals/PromotionHistoryModal';
import { PromotionModal } from '@/components/modals/PromotionModal';
import { useListingActions } from '@/hooks/useListingActions';
import { useLoadingState } from '@/hooks/useLoadingState';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { listingsApi, Listing, PaginationMeta, PromotionHistory } from '@/lib/api';
import { normalizeListingResponse } from '@/lib/api';

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

  const isLoadingContent = loading || !hasLoadedRef.current;
  const { visible: showSkeleton } = useLoadingState({
    isLoading: isLoadingContent,
    immediate: true,
    showDelay: 0,
    minDisplayTime: 1000,
  });

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

  const refetchAllForCount = useCallback(async () => {
    try {
      const res = await listingsApi.getMy(1, 1000);
      const responseData = res.data;
      let allListings: Listing[] = [];
      if (Array.isArray(responseData)) {
        allListings = responseData;
      } else if (responseData && typeof responseData === 'object') {
        allListings = responseData.data || [];
      }
      setAllListingsForCount(allListings);
    } catch {}
  }, []);

  const listingActions = useListingActions(
    {
      refreshCooldownMs: meta?.refreshCooldownMs ?? 0,
      lastRefreshAt: meta?.last_listing_refresh_at ?? null,
      timeUntilRefresh,
      setTimeUntilRefresh,
      canPromote,
      userId: user?.id,
    },
    {
      setListings,
      setAllListingsForCount,
      listingsRef,
      fetchListings,
      refetchAllForCount,
    }
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
      if (action === 'publish') {
        await listingActions.publishListing(id);
      } else {
        await listingActions.pauseListing(id);
      }
    },
    [listingActions]
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
      await listingActions.togglePromotion(selectedListingId, true, days ?? undefined);
      setPromotionModalOpen(false);
      setSelectedListingId(null);
    },
    [selectedListingId, listingActions]
  );

  const formattedTime = useMemo(() => {
    if (timeUntilRefresh === null || timeUntilRefresh <= 0) return null;
    return listingActions.formatTimeRemaining(timeUntilRefresh);
  }, [timeUntilRefresh, listingActions]);

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
    <div className="min-h-[calc(100vh-200px)]">
      <div
        className={`transition-opacity duration-300 ${showSkeleton ? 'opacity-100' : 'opacity-0 hidden'}`}
      >
        <Breadcrumbs
          items={[{ label: t('myListings.home'), href: '/' }, { label: t('myListings.title') }]}
          className="mb-6"
        />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-primary-900">
            {t('myListings.title')}
          </h1>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-[48px] rounded-lg bg-primary-500/10 animate-pulse min-w-[140px] sm:min-w-[180px]"
              />
            ))}
          </div>
        </div>
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 md:gap-3">
            <div className="h-9 md:h-10 w-14 rounded-lg bg-primary-500/10 animate-pulse" />
            <div className="h-9 md:h-10 w-20 rounded-lg bg-primary-500/10 animate-pulse" />
            <div className="h-9 md:h-10 w-20 rounded-lg bg-primary-500/10 animate-pulse" />
            <div className="h-9 md:h-10 w-20 rounded-lg bg-primary-500/10 animate-pulse" />
            <div className="h-9 md:h-10 w-24 rounded-lg bg-primary-500/10 animate-pulse" />
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <ListingManagementCardSkeleton key={i} />
          ))}
        </div>
      </div>

      <div
        className={`transition-opacity duration-300 ${!showSkeleton ? 'opacity-100' : 'opacity-0 hidden'}`}
      >
        <Breadcrumbs
          items={[{ label: t('myListings.home'), href: '/' }, { label: t('myListings.title') }]}
          className="mb-6"
        />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-primary-900">
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
                  <div className="w-3.5 h-3.5 md:w-4 md:h-4 border-2 border-primary-700 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
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
            {user?.boardSlug && (
              <Link
                href={`/board/${user.boardSlug}`}
                className="w-full sm:w-auto h-[48px] text-primary-700 font-medium text-base hover:text-primary-900 transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-4 rounded-lg border-2 border-primary-700 hover:border-primary-900 bg-primary-500/10 select-none inline-block"
              >
                <svg
                  className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                {t('myListings.myBoard')}
              </Link>
            )}
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
                className="w-full sm:w-auto h-[48px] text-primary-700 font-medium text-base hover:text-primary-900 transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-4 rounded-lg border-2 border-primary-700 hover:border-primary-900 bg-primary-500/10 select-none inline-block text-center"
              >
                <svg
                  className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                {t('myListings.createListing')}
              </a>
            )}
          </div>
        </div>

        {listings && listings.length > 0 && (
          <div className="mb-6 pt-4 border-t border-primary-500/20 sm:border-t-0 sm:pt-0">
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
    </div>
  );
}
