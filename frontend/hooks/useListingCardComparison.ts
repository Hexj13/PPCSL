import { useCallback, useEffect, useState } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import { comparisonApi } from '@/lib/api';
import type { Listing } from '@/lib/api';
import { publishCrossTabEvent } from '@/lib/cross-tab-events';
import { useAuthStore, useComparisonStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { isTireListing } from '@/lib/utils';

export function useListingCardComparison(listing: Listing, displayTitle: string) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const tire = isTireListing(listing);
  const comparisons = useComparisonStore((s) => (tire ? s.tireComparisons : s.vehicleComparisons));
  const addComparison = useComparisonStore((s) => (tire ? s.addTire : s.addVehicle));
  const removeComparison = useComparisonStore((s) => (tire ? s.removeTire : s.removeVehicle));

  const storeIsInComparison = comparisons.includes(listing.id);
  const [localInComparison, setLocalInComparison] = useState(storeIsInComparison);

  useEffect(() => {
    setLocalInComparison(storeIsInComparison);
  }, [storeIsInComparison]);

  const toastApiError = useCallback(
    (err: unknown) => {
      const fromApi =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message ===
          'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : null;
      toast.error(fromApi ?? t('common.error'));
    },
    [t],
  );

  const handleToggleComparison = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (localInComparison) {
        if (user) {
          try {
            await comparisonApi.remove(listing.id);
          } catch (err) {
            toastApiError(err);
            return;
          }
        }
        removeComparison(listing.id);
        setLocalInComparison(false);
        publishCrossTabEvent({
          type: 'comparison-changed',
          listingId: listing.id,
          action: 'remove',
          bucket: tire ? 'tire' : 'vehicle',
          isAuthenticated: !!user,
          at: Date.now(),
        });
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
      if (!added) {
        toast.error(
          tire
            ? t('listingDetail.alreadyInComparisonErrorTire')
            : t('listingDetail.alreadyInComparisonError'),
        );
        return;
      }
      if (user) {
        try {
          await comparisonApi.add(listing.id);
        } catch (err) {
          removeComparison(listing.id);
          toastApiError(err);
          return;
        }
      }
      setLocalInComparison(true);
      publishCrossTabEvent({
        type: 'comparison-changed',
        listingId: listing.id,
        action: 'add',
        bucket: tire ? 'tire' : 'vehicle',
        isAuthenticated: !!user,
        at: Date.now(),
      });
      analytics.addToComparison(listing.id, {
        title: displayTitle,
        price: listing.price,
        listing_category: tire ? 'tire' : 'vehicle',
        item_category: tire ? 'Tire' : 'Vehicle',
      });
      toast.success(t('listingDetail.addedToComparison'));
    },
    [
      listing,
      tire,
      user,
      localInComparison,
      comparisons.length,
      addComparison,
      removeComparison,
      displayTitle,
      t,
      toastApiError,
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
