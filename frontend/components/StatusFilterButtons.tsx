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
          className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium text-xs md:text-sm lg:text-base transition-colors bg-bg-light hover:bg-bg-dark border ${
            currentFilter === status ? 'border-primary-500 text-white' : 'border-primary-500/20'
          }`}
          style={currentFilter !== status ? { color: 'rgb(var(--text-secondary-rgb))' } : undefined}
        >
          {getLabel(status)}
          {status !== 'All' && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-500/20 text-xs">
              {counts[status]}
            </span>
          )}
        </button>
      ))}

      {showPromoted && onPromotedClick && (
        <button
          onClick={onPromotedClick}
          className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium text-xs md:text-sm lg:text-base transition-colors bg-bg-light hover:bg-bg-dark border ${
            promotedActive ? 'border-primary-500 text-white' : 'border-primary-500/20'
          }`}
          style={!promotedActive ? { color: 'rgb(var(--text-secondary-rgb))' } : undefined}
        >
          {t('myListings.promoted')}
          <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-500/20 text-xs">
            {promotedCount}
          </span>
        </button>
      )}
    </div>
  );
}
