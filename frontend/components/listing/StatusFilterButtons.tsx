'use client';

import { useTranslation } from '@/hooks/useTranslation';

type ListingStatus = 'All' | 'Active' | 'Paused' | 'Closed';

interface StatusFilterButtonsProps {
  currentFilter: ListingStatus;
  onFilterChange: (_status: ListingStatus) => void;
  counts: {
    Active: number;
    Paused: number;
    Closed: number;
  };
  showPromoted?: boolean;
  promotedCount?: number;
  promotedActive?: boolean;
  onPromotedClick?: () => void;
  translationPrefix?: 'myListings' | 'admin.listingsTab';
}

export function StatusFilterButtons({
  currentFilter,
  onFilterChange,
  counts,
  showPromoted = false,
  promotedCount = 0,
  promotedActive = false,
  onPromotedClick,
  translationPrefix = 'myListings',
}: StatusFilterButtonsProps) {
  const { t } = useTranslation();

  const statuses: ListingStatus[] = ['All', 'Active', 'Paused', 'Closed'];

  const getLabel = (status: ListingStatus) => {
    if (status === 'All') {
      return t(`${translationPrefix}.all`);
    }
    if (status === 'Active') {
      return t(`${translationPrefix}.active`);
    }
    if (status === 'Paused') {
      return t(`${translationPrefix}.paused`);
    }
    return t(`${translationPrefix}.closed`);
  };

  return (
    <div className="flex flex-wrap gap-2 md:gap-3">
      {statuses.map((status) => (
        <button
          key={status}
          onClick={() => onFilterChange(status)}
          className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium text-base transition-colors ${
            currentFilter === status
              ? 'bg-primary-500/10 border-2 border-primary-700 text-primary-700'
              : 'bg-bg-secondary hover-only:hover:bg-bg-base border-2 border-primary-700 text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:border-primary-900'
          }`}
        >
          {getLabel(status)}
          {status !== 'All' && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-500/20 text-sm">
              {counts[status]}
            </span>
          )}
        </button>
      ))}

      {showPromoted && onPromotedClick && (
        <button
          onClick={onPromotedClick}
          className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium text-base transition-colors ${
            promotedActive
              ? 'bg-primary-500/10 border-2 border-primary-700 text-primary-700'
              : 'bg-bg-secondary hover-only:hover:bg-bg-base border-2 border-primary-700 text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:border-primary-900'
          }`}
        >
          {t('myListings.promoted')}
          <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-500/20 text-sm">
            {promotedCount}
          </span>
        </button>
      )}
    </div>
  );
}
