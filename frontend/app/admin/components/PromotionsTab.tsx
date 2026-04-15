'use client';

import Link from 'next/link';
import { useCallback } from 'react';

import { usePaginatedData } from '@/hooks/usePaginatedData';
import { useRefreshWhenVisible } from '@/hooks/useRefreshWhenVisible';
import { useTranslation } from '@/hooks/useTranslation';
import type { PromotionHistory } from '@/lib/api';
import { adminApi } from '@/lib/api';
import { Pagination } from '@/ui';

import { AdminFilterButton } from './AdminButtons';
import {
  AdminCopyValueCell,
  AdminDateTimeCell,
  AdminSearchInput,
  AdminTableState,
  adminTableCenteredCellClassName,
  adminTableCenteredSecondaryCellClassName,
  adminTableHeaderClassName,
} from './AdminTableShared';

interface PromotionsFilters {
  searchQuery: string;
  timeFilter: 'All' | 'day' | 'week' | 'month';
}

interface PromotionsTabProps {
  isActive: boolean;
}

export function PromotionsTab({ isActive }: PromotionsTabProps) {
  const { t } = useTranslation();

  const getFromDate = useCallback((filter: 'All' | 'day' | 'week' | 'month'): Date | undefined => {
    if (filter === 'All') return undefined;
    const now = new Date();
    const fromDate = new Date();
    if (filter === 'day') {
      fromDate.setDate(now.getDate() - 1);
    } else if (filter === 'week') {
      fromDate.setDate(now.getDate() - 7);
    } else if (filter === 'month') {
      fromDate.setMonth(now.getMonth() - 1);
    }
    return fromDate;
  }, []);

  const {
    data: promotions,
    loading,
    meta,
    page,
    filters,
    setFilters,
    setPage,
    reload,
  } = usePaginatedData<PromotionHistory, PromotionsFilters>({
    fetchFn: async (pageNum, limitNum, filtersData) => {
      const listingId = filtersData.searchQuery ? filtersData.searchQuery : undefined;
      const userId = filtersData.searchQuery ? filtersData.searchQuery : undefined;
      const fromDate = getFromDate(filtersData.timeFilter);
      const response = await adminApi.getAllPromotions(
        pageNum,
        limitNum,
        listingId,
        userId,
        fromDate,
      );
      return {
        data: response.data.data,
        meta: response.data.meta,
      };
    },
    limit: 50,
    initialFilters: {
      searchQuery: '',
      timeFilter: 'All',
    },
    showLoadingDelay: 300,
    debounceFilters: ['searchQuery'],
    debounceMs: 500,
  });

  useRefreshWhenVisible(isActive, () => {
    reload(true);
  });

  return (
    <div>
      <div className="mb-4 md:mb-6 flex flex-col gap-4">
        <AdminSearchInput
          value={filters.searchQuery}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              searchQuery: e.target.value,
            }))
          }
          placeholder={t('admin.promotionsTab.searchPlaceholder')}
        />

        <div className="pt-4 border-t border-primary-500/20 sm:border-t-0 sm:pt-0">
          <div className="flex flex-wrap gap-2 md:gap-3">
            {(['All', 'day', 'week', 'month'] as const).map((filter) => (
              <AdminFilterButton
                key={filter}
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    timeFilter: filter,
                  }))
                }
                active={filters.timeFilter === filter}
              >
                {filter === 'All'
                  ? t('admin.promotionsTab.allTime')
                  : filter === 'day'
                    ? t('admin.promotionsTab.lastDay')
                    : filter === 'week'
                      ? t('admin.promotionsTab.lastWeek')
                      : t('admin.promotionsTab.lastMonth')}
              </AdminFilterButton>
            ))}
          </div>
        </div>
      </div>

      <AdminTableState
        loading={loading}
        isEmpty={promotions.length === 0}
        loadingText={t('common.loading')}
        emptyText={
          filters.searchQuery
            ? t('admin.promotionsTab.noResults')
            : t('admin.promotionsTab.noPromotions')
        }
        emptyClassName="py-8"
      >
        <>
          <div className="mb-3 md:mb-4 text-sm md:text-base text-primary-900">
            {t('admin.promotionsTab.totalPromotions')}:{' '}
            <span className="font-semibold text-primary-900">{meta?.total || 0}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse [&_tbody_tr:nth-child(even)]:bg-primary-500/5">
              <thead>
                <tr className="border-b border-primary-700/30">
                  <th className="text-center py-3 px-4 text-sm font-semibold text-primary-900">
                    {t('admin.promotionsTab.listingTitle')}
                  </th>
                  <th className={`${adminTableHeaderClassName} text-center`}>
                    {t('admin.promotionsTab.status')}
                  </th>
                  <th className={`${adminTableHeaderClassName} text-center`}>
                    {t('admin.promotionsTab.days')}
                  </th>
                  <th className={`${adminTableHeaderClassName} text-center`}>
                    {t('admin.promotionsTab.startDate')}
                  </th>
                  <th className={`${adminTableHeaderClassName} text-center`}>
                    {t('admin.promotionsTab.endDate')}
                  </th>
                  <th className={`${adminTableHeaderClassName} text-center`}>
                    {t('admin.promotionsTab.userId')}
                  </th>
                  <th className={`${adminTableHeaderClassName} text-center`}>
                    {t('admin.promotionsTab.listingId')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((promotion) => (
                  <tr key={promotion.id} className="border-b border-primary-700/10">
                    <td className="py-3 px-4 text-sm text-center">
                      <Link
                        href={`/listings/${promotion.listing_id}`}
                        className="text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:underline transition-colors"
                      >
                        {promotion.listing_title}
                      </Link>
                    </td>
                    <td className={adminTableCenteredCellClassName}>
                      <span
                        className={
                          promotion.listing_status === 'Active'
                            ? 'text-primary-700 font-semibold'
                            : promotion.listing_status === 'Paused'
                              ? 'text-blue-500 font-semibold'
                              : 'text-text-secondary font-semibold'
                        }
                      >
                        {promotion.listing_status === 'Active'
                          ? t('userListings.active')
                          : promotion.listing_status === 'Paused'
                            ? t('userListings.paused')
                            : t('userListings.closed')}
                      </span>
                    </td>
                    <td className={adminTableCenteredSecondaryCellClassName}>{promotion.days}</td>
                    <AdminDateTimeCell value={promotion.started_at} />
                    <AdminDateTimeCell value={promotion.ended_at} />
                    <td className={adminTableCenteredCellClassName}>
                      <AdminCopyValueCell
                        value={promotion.user_id}
                        label={t('admin.promotionsTab.userId')}
                      />
                    </td>
                    <td className={adminTableCenteredCellClassName}>
                      <AdminCopyValueCell
                        value={promotion.listing_id}
                        label={t('admin.promotionsTab.listingId')}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(meta?.totalPages ?? 0) > 1 && (
            <Pagination
              currentPage={page}
              totalPages={meta?.totalPages ?? 1}
              onPageChange={setPage}
            />
          )}
        </>
      </AdminTableState>
    </div>
  );
}
