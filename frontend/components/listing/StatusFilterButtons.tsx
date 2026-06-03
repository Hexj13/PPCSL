'use client';

import { AdminFilterButton } from '@/app/admin/components/AdminButtons';
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
        <AdminFilterButton
          key={status}
          onClick={() => onFilterChange(status)}
          active={currentFilter === status}
          badge={status !== 'All' ? counts[status] : undefined}
          data-testid={
            translationPrefix === 'myListings'
              ? `my-listings-status-filter-${status.toLowerCase()}`
              : undefined
          }
        >
          {getLabel(status)}
        </AdminFilterButton>
      ))}

      {showPromoted && onPromotedClick && (
        <AdminFilterButton onClick={onPromotedClick} active={promotedActive} badge={promotedCount}>
          {t('myListings.promoted')}
        </AdminFilterButton>
      )}
    </div>
  );
}
