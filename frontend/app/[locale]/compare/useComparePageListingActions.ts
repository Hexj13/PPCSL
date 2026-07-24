import type { Dispatch, SetStateAction } from 'react';
import { flushSync } from 'react-dom';

import { comparisonApi } from '@/lib/api';
import type { Listing } from '@/lib/api';
import { waitForCardExitAnimation } from '@/lib/card-exit-animation';
import { publishCrossTabEvent } from '@/lib/cross-tab-events';
import { toast } from '@/lib/toast';

type CompareBucket = 'vehicle' | 'tire';

type CompareListingActionsParams = {
  user: { id: string } | null | undefined;
  t: (key: string) => string;
  showApiError: () => void;
  exitingIds: Set<string>;
  isClearing: boolean;
  setExitingIds: Dispatch<SetStateAction<Set<string>>>;
  setIsClearing: Dispatch<SetStateAction<boolean>>;
  setListings: Dispatch<SetStateAction<Listing[]>>;
  removeFromStore: (id: string) => void;
  clearBucket: () => void;
  getStoreIds: () => string[];
  bucket: CompareBucket;
};

export function createCompareListingActions({
  user,
  t,
  showApiError,
  exitingIds,
  isClearing,
  setExitingIds,
  setIsClearing,
  setListings,
  removeFromStore,
  clearBucket,
  getStoreIds,
  bucket,
}: CompareListingActionsParams) {
  const handleRemove = async (id: string) => {
    if (exitingIds.has(id) || isClearing) return;

    flushSync(() => {
      setExitingIds((prev) => new Set(prev).add(id));
    });
    await waitForCardExitAnimation();

    if (user) {
      try {
        await comparisonApi.remove(id);
      } catch {
        setExitingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        showApiError();
        return;
      }
    }
    setListings((prev) => prev.filter((listing) => listing.id !== id));
    removeFromStore(id);
    publishCrossTabEvent({
      type: 'comparison-changed',
      listingId: id,
      action: 'remove',
      bucket,
      isAuthenticated: !!user,
      at: Date.now(),
    });
    setExitingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast.success(t('compare.removedFromComparison'));
  };

  const handleClearAll = async () => {
    const ids = [...getStoreIds()];
    if (ids.length === 0 || isClearing) return;

    flushSync(() => {
      setIsClearing(true);
      setExitingIds(new Set(ids));
    });
    await waitForCardExitAnimation();

    if (user) {
      let failed = 0;
      for (const id of ids) {
        try {
          await comparisonApi.remove(id);
          removeFromStore(id);
          publishCrossTabEvent({
            type: 'comparison-changed',
            listingId: id,
            action: 'remove',
            bucket,
            isAuthenticated: true,
            at: Date.now(),
          });
        } catch {
          failed += 1;
        }
      }
      if (failed > 0) {
        setIsClearing(false);
        setExitingIds(new Set());
        showApiError();
        return;
      }
    } else {
      clearBucket();
      for (const id of ids) {
        publishCrossTabEvent({
          type: 'comparison-changed',
          listingId: id,
          action: 'remove',
          bucket,
          isAuthenticated: false,
          at: Date.now(),
        });
      }
    }
    setListings([]);
    setIsClearing(false);
    setExitingIds(new Set());
    toast.success(t('compare.allRemoved'));
  };

  return { handleRemove, handleClearAll };
}
