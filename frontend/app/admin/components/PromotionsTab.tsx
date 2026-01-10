'use client';

import Link from 'next/link';
import { useCallback } from 'react';

import { CopyButton } from '@/components/CopyButton';
import { usePaginatedData } from '@/hooks/usePaginatedData';
import { useTranslation } from '@/hooks/useTranslation';
import { adminApi, PromotionHistory } from '@/lib/api';
import { formatDateShort } from '@/lib/utils';
import { Pagination } from '@/ui';

interface PromotionsFilters {
  searchQuery: string;
  timeFilter: 'All' | 'day' | 'week' | 'month';
}

export function PromotionsTab() {
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
        fromDate
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

  return (
    <div>
      <div className="mb-4 md:mb-6">
        <input
          type="text"
          value={filters.searchQuery}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              searchQuery: e.target.value,
            }))
          }
          placeholder={t('admin.promotionsTab.searchPlaceholder')}
          className="w-full px-4 py-2.5 md:py-3 rounded-lg bg-bg-light border-2 border-primary-500/30 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 h-[48px] md:h-[52px] text-sm md:text-base"
        />
      </div>

      <div className="mb-4 md:mb-6">
        <div className="flex flex-wrap gap-2 md:gap-3">
          {(['All', 'day', 'week', 'month'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  timeFilter: filter,
                }))
              }
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium transition-colors text-sm md:text-base bg-bg-light hover:bg-bg-dark border ${
                filters.timeFilter === filter
                  ? 'border-primary-500 text-white'
                  : 'border-primary-500/20'
              }`}
              style={
                filters.timeFilter !== filter
                  ? { color: 'rgb(var(--text-secondary-rgb))' }
                  : undefined
              }
            >
              {filter === 'All'
                ? t('admin.promotionsTab.allTime')
                : filter === 'day'
                  ? t('admin.promotionsTab.lastDay')
                  : filter === 'week'
                    ? t('admin.promotionsTab.lastWeek')
                    : t('admin.promotionsTab.lastMonth')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">{t('common.loading')}</div>
      ) : promotions.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          {filters.searchQuery
            ? t('admin.promotionsTab.noResults')
            : t('admin.promotionsTab.noPromotions')}
        </div>
      ) : (
        <>
          <div
            className="mb-3 md:mb-4 text-sm md:text-base"
            style={{ color: 'rgb(var(--text-secondary-rgb))' }}
          >
            {t('admin.promotionsTab.totalPromotions')}:{' '}
            <span className="font-semibold text-white">{meta?.total || 0}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-primary-500/30">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-primary-300">
                    {t('admin.promotionsTab.listingTitle')}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-primary-300">
                    {t('admin.promotionsTab.status')}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-primary-300">
                    {t('admin.promotionsTab.days')}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-primary-300">
                    {t('admin.promotionsTab.startDate')}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-primary-300">
                    {t('admin.promotionsTab.endDate')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-primary-300">
                    {t('admin.promotionsTab.userId')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-primary-300">
                    {t('admin.promotionsTab.listingId')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((promotion) => (
                  <tr key={promotion.id} className="border-b border-primary-500/10">
                    <td className="py-3 px-4 text-sm">
                      <Link
                        href={`/listings/${promotion.listing_id}`}
                        className="text-primary-400 hover:text-primary-300 hover:underline transition-colors"
                      >
                        {promotion.listing_title}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-sm text-center">
                      <span
                        className={
                          promotion.listing_status === 'Active'
                            ? 'text-primary-400 font-semibold'
                            : promotion.listing_status === 'Paused'
                              ? 'text-blue-400 font-semibold'
                              : 'text-gray-400 font-semibold'
                        }
                      >
                        {promotion.listing_status === 'Active'
                          ? t('userListings.active')
                          : promotion.listing_status === 'Paused'
                            ? t('userListings.paused')
                            : t('userListings.closed')}
                      </span>
                    </td>
                    <td
                      className="py-3 px-4 text-sm text-center"
                      style={{ color: 'rgb(var(--text-secondary-rgb))' }}
                    >
                      {promotion.days}
                    </td>
                    <td
                      className="py-3 px-4 text-sm text-center"
                      style={{ color: 'rgb(var(--text-secondary-rgb))' }}
                    >
                      {formatDateShort(promotion.started_at)}
                    </td>
                    <td
                      className="py-3 px-4 text-sm text-center"
                      style={{ color: 'rgb(var(--text-secondary-rgb))' }}
                    >
                      {promotion.ended_at ? formatDateShort(promotion.ended_at) : '—'}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-mono text-xs break-all">
                          {promotion.user_id}
                        </span>
                        <CopyButton
                          text={promotion.user_id}
                          label={t('admin.promotionsTab.userId')}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-mono text-xs break-all">
                          {promotion.listing_id}
                        </span>
                        <CopyButton
                          text={promotion.listing_id}
                          label={t('admin.promotionsTab.listingId')}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta && meta.totalPages > 1 && (
            <Pagination currentPage={page} totalPages={meta.totalPages} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
