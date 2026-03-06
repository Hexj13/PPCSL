'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

import { EmptyState } from '@/components/common/EmptyState';
import { ListingManagementCard } from '@/components/listing/ListingManagementCard';
import { ListingManagementCardSkeleton } from '@/components/listing/ListingManagementCardSkeleton';
import { StatusFilterButtons } from '@/components/listing/StatusFilterButtons';
import { PromotionModal } from '@/components/modals/PromotionModal';
import { useLoadingState } from '@/hooks/useLoadingState';
import { usePaginatedData } from '@/hooks/usePaginatedData';
import { useTranslation } from '@/hooks/useTranslation';
import type { Listing } from '@/lib/api';
import { adminApi } from '@/lib/api';
import { Pagination } from '@/ui';

interface ListingsTabProps {
  initialSearchQuery?: string;
}

interface ListingsFilters {
  statusFilter: 'All' | 'Active' | 'Paused' | 'Closed';
  promotedFilter: 'All' | 'Promoted' | 'NotPromoted';
  searchQuery: string;
}

export function ListingsTab({ initialSearchQuery = '' }: ListingsTabProps) {
  const { t } = useTranslation();
  const [statusCounts, setStatusCounts] = useState({
    Active: 0,
    Paused: 0,
    Closed: 0,
    Promoted: 0,
  });
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  const {
    data: listings,
    loading,
    meta,
    page,
    filters,
    setFilters,
    setPage,
    setData,
    reload,
  } = usePaginatedData<Listing, ListingsFilters>({
    fetchFn: async (pageNum, limitNum, filtersData) => {
      const status = filtersData.statusFilter === 'All' ? undefined : filtersData.statusFilter;
      const isPromoted =
        filtersData.promotedFilter === 'All'
          ? undefined
          : filtersData.promotedFilter === 'Promoted';
      const search = filtersData.searchQuery.trim() ? filtersData.searchQuery.trim() : undefined;

      const response = await adminApi.getAllListings(
        pageNum,
        limitNum,
        undefined,
        undefined,
        status,
        isPromoted,
        search,
      );
      return {
        data: response.data.data,
        meta: {
          total: response.data.meta.total || 0,
          page: response.data.meta.page || 1,
          limit: response.data.meta.limit || limitNum,
          totalPages: response.data.meta.totalPages || 1,
        },
      };
    },
    limit: 50,
    initialFilters: {
      statusFilter: 'All',
      promotedFilter: 'All',
      searchQuery: initialSearchQuery,
    },
    showLoadingDelay: 300,
    debounceFilters: ['searchQuery'],
    debounceMs: 500,
    onDataTransform: (data, filtersData) => {
      const userId = filtersData.searchQuery.trim() ? filtersData.searchQuery.trim() : undefined;
      if (userId) {
        return [...data].sort((a, b) => {
          if (a.is_promoted && !b.is_promoted) return -1;
          if (!a.is_promoted && b.is_promoted) return 1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
      }
      return data;
    },
  });

  const { visible: showSkeleton } = useLoadingState({
    isLoading: loading,
    immediate: false,
    showDelay: 200,
    minDisplayTime: 1000,
  });

  const loadStatusCounts = useCallback(async (search?: string) => {
    try {
      const response = await adminApi.getListingsStatusCounts(search);
      setStatusCounts(response.data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!initialSearchQuery) return;
    setFilters((prev) => ({ ...prev, searchQuery: initialSearchQuery }));
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [initialSearchQuery, setFilters]);

  useEffect(() => {
    if (initialSearchQuery && typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        localStorage.removeItem('adminListingsSearchQuery');
        localStorage.removeItem('adminListingsSearchType');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialSearchQuery]);

  useEffect(() => {
    void loadStatusCounts(filters.searchQuery);
  }, [loadStatusCounts, filters.searchQuery]);

  const handleAction = useCallback(
    async (id: string, action: 'publish' | 'pause' | 'close') => {
      const statusMap: Record<'publish' | 'pause' | 'close', 'Active' | 'Paused' | 'Closed'> = {
        publish: 'Active',
        pause: 'Paused',
        close: 'Closed',
      };
      const newStatus = statusMap[action];

      try {
        await adminApi.updateListingStatus(id, newStatus);
        toast.success(t('admin.listingsTab.statusUpdateSuccess'));

        setData((prev) =>
          prev.map((listing) => (listing.id === id ? { ...listing, status: newStatus } : listing)),
        );
        await loadStatusCounts(filters.searchQuery);
      } catch {
        toast.error(t('admin.listingsTab.statusUpdateError'));
      }
    },
    [t, loadStatusCounts, setData, filters.searchQuery],
  );

  const handleUnpromote = useCallback(
    async (id: string) => {
      try {
        await adminApi.toggleListingPromotion(id, false, null);
        toast.success(t('admin.promotionDisabled'));
        await reload(true);
        await loadStatusCounts(filters.searchQuery);
      } catch {
        toast.error(t('admin.promotionError'));
      }
    },
    [t, reload, loadStatusCounts, filters.searchQuery],
  );

  const handlePromoteClick = useCallback(
    (id: string) => {
      const listing = listings.find((l) => l.id === id);
      if (listing?.is_promoted) {
        void handleUnpromote(id);
      } else {
        setSelectedListingId(id);
        setPromotionModalOpen(true);
      }
    },
    [listings, handleUnpromote],
  );

  const handlePromotionSelect = useCallback(
    async (days: number | null) => {
      if (!selectedListingId) return;

      try {
        await adminApi.toggleListingPromotion(selectedListingId, true, days);
        toast.success(t('admin.promotionEnabled'));
        await reload(true);
        await loadStatusCounts(filters.searchQuery);
      } catch {
        toast.error(t('admin.promotionError'));
      } finally {
        setPromotionModalOpen(false);
        setSelectedListingId(null);
      }
    },
    [selectedListingId, t, reload, loadStatusCounts, filters.searchQuery],
  );

  return (
    <>
      {showSkeleton && (
        <div>
          <div className="mb-4 md:mb-6">
            <div className="w-full h-[48px] md:h-[52px] bg-bg-secondary/30 rounded-lg animate-pulse" />
          </div>
          <div className="mb-4 md:mb-6">
            <div className="flex flex-wrap gap-2 md:gap-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-9 md:h-10 w-20 md:w-24 bg-bg-secondary/30 rounded-lg animate-pulse"
                />
              ))}
            </div>
          </div>
          <div className="mb-3 md:mb-4 h-4 md:h-5 bg-bg-secondary/30 rounded-sm w-40 md:w-48 animate-pulse" />
          <div className="space-y-3 md:space-y-4">
            {[...Array(3)].map((_, i) => (
              <ListingManagementCardSkeleton key={i} />
            ))}
          </div>
        </div>
      )}

      {!showSkeleton && (
        <div>
          <div className="mb-4 md:mb-6 flex flex-col gap-4">
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  searchQuery: e.target.value,
                }))
              }
              placeholder={t('admin.listingsTab.searchByIdPlaceholder')}
              className="w-full px-4 py-2.5 md:py-3 rounded-lg bg-bg-secondary border-2 border-primary-700 text-text-primary placeholder:text-text-secondary focus:outline-hidden focus:border-primary-900 transition-all duration-200 h-[48px] md:h-[52px] text-sm md:text-base"
            />

            <div className="pt-4 border-t border-primary-500/20 sm:border-t-0 sm:pt-0">
              <StatusFilterButtons
                currentFilter={filters.statusFilter}
                onFilterChange={(status) => {
                  setFilters((prev) => {
                    if (prev.promotedFilter !== 'All') {
                      return { ...prev, statusFilter: status, promotedFilter: 'All' };
                    }
                    return { ...prev, statusFilter: status };
                  });
                }}
                counts={statusCounts}
                showPromoted={true}
                promotedCount={statusCounts.Promoted}
                promotedActive={filters.promotedFilter === 'Promoted'}
                onPromotedClick={() => {
                  setFilters((prev) => {
                    const newPromotedFilter =
                      prev.promotedFilter === 'Promoted' ? 'All' : 'Promoted';
                    if (newPromotedFilter === 'Promoted') {
                      return { ...prev, promotedFilter: newPromotedFilter, statusFilter: 'All' };
                    }
                    return { ...prev, promotedFilter: newPromotedFilter };
                  });
                }}
                translationPrefix="admin.listingsTab"
              />
            </div>
          </div>

          {listings.length === 0 ? (
            <EmptyState message={t('admin.listingsTab.noListings')} className="py-10 md:py-12" />
          ) : (
            <>
              <div className="mb-3 md:mb-4 text-sm md:text-base text-primary-700">
                {t('admin.listingsTab.totalListings')}:{' '}
                <span className="font-semibold text-primary-900">{meta?.total || 0}</span>
              </div>

              <div className="space-y-3 md:space-y-4">
                {listings.map((listing) => (
                  <ListingManagementCard
                    key={listing.id}
                    listing={listing}
                    mode="admin"
                    onAction={handleAction}
                    onCopyId={() => {}}
                    onPromoteClick={handlePromoteClick}
                  />
                ))}
              </div>

              {meta && meta.totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={meta.totalPages}
                  onPageChange={setPage}
                />
              )}
            </>
          )}

          <PromotionModal
            isOpen={promotionModalOpen}
            onClose={() => {
              setPromotionModalOpen(false);
              setSelectedListingId(null);
            }}
            onSelect={handlePromotionSelect}
            isAdmin={true}
          />
        </div>
      )}
    </>
  );
}
