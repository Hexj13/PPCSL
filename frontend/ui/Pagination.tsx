'use client';

import { useTranslation } from '@/hooks/useTranslation';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (_page: number) => void;
  disabled?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  const { t } = useTranslation();

  if (totalPages <= 1) {
    return null;
  }

  const handlePageChange = (newPage: number) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onPageChange(newPage);
  };

  return (
    <div className="flex justify-center items-center gap-4 mt-6 md:mt-8">
      <button
        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1 || disabled}
        className="px-4 py-2 rounded-lg bg-primary-500/10 border-2 border-primary-700 text-primary-700 hover:text-primary-900 hover:border-primary-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {t('common.previous')}
      </button>
      <span className="text-sm md:text-base" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
        {t('common.pageOf', { page: currentPage, totalPages })}
      </span>
      <button
        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages || disabled}
        className="px-4 py-2 rounded-lg bg-primary-500/10 border-2 border-primary-700 text-primary-700 hover:text-primary-900 hover:border-primary-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {t('common.next')}
      </button>
    </div>
  );
}
