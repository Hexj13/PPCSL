import { useCallback, useEffect, useState } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import type { Listing } from '@/lib/api';
import { useComparisonStore } from '@/lib/store';
import { toast } from '@/lib/toast';

export function useListingCardComparison(listing: Listing, displayTitle: string) {
  const { t } = useTranslation();
  const comparisons = useComparisonStore((s) => s.comparisons);
  const addComparison = useComparisonStore((s) => s.add);
  const removeComparison = useComparisonStore((s) => s.remove);

  const storeIsInComparison = comparisons.includes(listing.id);
  const [localInComparison, setLocalInComparison] = useState(storeIsInComparison);

  useEffect(() => {
    setLocalInComparison(storeIsInComparison);
  }, [storeIsInComparison]);

  const handleToggleComparison = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (localInComparison) {
        removeComparison(listing.id);
        setLocalInComparison(false);
        analytics.removeFromComparison(listing.id);
        toast.success(t('listingDetail.removedFromComparison'));
        return;
      }
      if (comparisons.length >= 3) {
        toast.warning(t('listingDetail.cannotCompareMore'));
        return;
      }
      const added = addComparison(listing.id);
      if (added) {
        setLocalInComparison(true);
        analytics.addToComparison(listing.id, { title: displayTitle, price: listing.price });
        toast.success(t('listingDetail.addedToComparison'));
      } else {
        toast.error(t('listingDetail.alreadyInComparisonError'));
      }
    },
    [
      listing.id,
      listing.price,
      localInComparison,
      comparisons.length,
      addComparison,
      removeComparison,
      displayTitle,
      t,
    ],
  );

  return { isInComparison: localInComparison, handleToggleComparison };
}

export function getCompareButtonClassName(isInComparison: boolean): string {
  if (isInComparison) {
    return 'opacity-100 hover-only:hover:border-primary-400';
  }
  return 'opacity-60 lg:opacity-0 lg:group-hover:opacity-60 hover-only:hover:opacity-100 hover-only:hover:border-primary-400';
}
