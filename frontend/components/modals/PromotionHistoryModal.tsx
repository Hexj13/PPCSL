'use client';

import Link from 'next/link';

import { Modal } from '@/components/modals/Modal';
import { useTranslation } from '@/hooks/useTranslation';
import { PromotionHistory } from '@/lib/api';
import { formatDateShort } from '@/lib/utils';

interface PromotionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: PromotionHistory[];
  meta: { total: number; page: number; limit: number; totalPages: number } | null;
  currentPage: number;
  loading: boolean;
  onPageChange: (_page: number) => void;
}

export function PromotionHistoryModal({
  isOpen,
  onClose,
  history,
  meta,
  currentPage,
  loading,
  onPageChange,
}: PromotionHistoryModalProps) {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('promotion.historyTitle')} size="large">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-primary-700/30">
              <th className="text-left py-3 px-4 text-sm font-semibold text-primary-900">
                {t('promotion.history.listingTitle')}
              </th>
              <th className="text-center py-3 px-4 text-sm font-semibold text-primary-900">
                {t('promotion.history.status')}
              </th>
              <th className="text-center py-3 px-4 text-sm font-semibold text-primary-900">
                {t('promotion.history.days')}
              </th>
              <th className="text-center py-3 px-4 text-sm font-semibold text-primary-900">
                {t('promotion.history.startDate')}
              </th>
              <th className="text-center py-3 px-4 text-sm font-semibold text-primary-900">
                {t('promotion.history.endDate')}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-text-secondary">
                  {t('common.loading')}
                </td>
              </tr>
            ) : history.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-text-secondary">
                  {t('promotion.history.empty')}
                </td>
              </tr>
            ) : (
              history.map((item) => (
                <tr key={item.id} className="border-b border-primary-700/10">
                  <td className="py-3 px-4 text-sm">
                    <Link
                      href={`/listings/${item.listing_id}`}
                      className="text-primary-700 hover:text-primary-900 hover:underline transition-colors"
                    >
                      {item.listing_title}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-sm text-center">
                    <span
                      className={
                        item.listing_status === 'Active'
                          ? 'text-primary-700 font-semibold'
                          : item.listing_status === 'Paused'
                            ? 'text-blue-500 font-semibold'
                            : 'text-text-secondary font-semibold'
                      }
                    >
                      {item.listing_status === 'Active'
                        ? t('userListings.active')
                        : item.listing_status === 'Paused'
                          ? t('userListings.paused')
                          : t('userListings.closed')}
                    </span>
                  </td>
                  <td
                    className="py-3 px-4 text-sm text-center"
                    style={{ color: 'rgb(var(--text-secondary-rgb))' }}
                  >
                    {item.days}
                  </td>
                  <td
                    className="py-3 px-4 text-sm text-center"
                    style={{ color: 'rgb(var(--text-secondary-rgb))' }}
                  >
                    {formatDateShort(item.started_at)}
                  </td>
                  <td
                    className="py-3 px-4 text-sm text-center"
                    style={{ color: 'rgb(var(--text-secondary-rgb))' }}
                  >
                    {item.ended_at ? formatDateShort(item.ended_at) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary-500/10 border-2 border-primary-700 text-primary-700 hover:text-primary-900 hover:border-primary-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.previous')}
          </button>
          <span className="text-sm" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
            {t('common.page')} {currentPage} {t('common.of')} {meta.totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= meta.totalPages || loading}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary-500/10 border-2 border-primary-700 text-primary-700 hover:text-primary-900 hover:border-primary-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.next')}
          </button>
        </div>
      )}
    </Modal>
  );
}
