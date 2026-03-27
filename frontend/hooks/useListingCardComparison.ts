import { useCallback, useEffect, useState } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import type { Listing } from '@/lib/api';
import { useComparisonStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { isTireListing } from '@/lib/utils';

export function useListingCardComparison(listing: Listing, displayTitle: string) {
  const { t } = useTranslation();
  const tire = isTireListing(listing);
  const comparisons = useComparisonStore((s) => (tire ? s.tireComparisons : s.vehicleComparisons));
  const addComparison = useComparisonStore((s) => (tire ? s.addTire : s.addVehicle));
  const removeComparison = useComparisonStore((s) => (tire ? s.removeTire : s.removeVehicle));

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
        analytics.removeFromComparison(listing.id, {
          listing_category: tire ? 'tire' : 'vehicle',
        });
        toast.success(t('listingDetail.removedFromComparison'));
        return;
      }
      if (comparisons.length >= 3) {
        toast.warning(
          tire ? t('listingDetail.cannotCompareMoreTires') : t('listingDetail.cannotCompareMore'),
        );
        return;
      }
      const added = addComparison(listing.id);
      if (added) {
        setLocalInComparison(true);
        analytics.addToComparison(listing.id, {
          title: displayTitle,
          price: listing.price,
          listing_category: tire ? 'tire' : 'vehicle',
          item_category: tire ? 'Tire' : 'Vehicle',
        });
        toast.success(t('listingDetail.addedToComparison'));
      } else {
        toast.error(
          tire
            ? t('listingDetail.alreadyInComparisonErrorTire')
            : t('listingDetail.alreadyInComparisonError'),
        );
      }
    },
    [
      listing,
      tire,
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
