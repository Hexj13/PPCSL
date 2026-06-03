import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { useApiErrorToast } from '@/hooks/useApiErrorToast';
import { useTranslation } from '@/hooks/useTranslation';
import { comparisonApi, listingsApi } from '@/lib/api';
import type { Listing } from '@/lib/api';
import { localStorageGetItem } from '@/lib/browser-local-storage';
import { waitForCardExitAnimation } from '@/lib/card-exit-animation';
import { publishCrossTabEvent } from '@/lib/cross-tab-events';
import { useAuthStore, useComparisonStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { isTireListing } from '@/lib/utils';

type PersistedComparisonBackup = {
  state?: {
    vehicleComparisons?: string[];
    tireComparisons?: string[];
    comparisons?: string[];
  };
};

export function useComparePageListings(
  vehicleComparisons: string[],
  tireComparisons: string[],
  comparisonStoreHydrated: boolean,
  rehydrate: () => Promise<void>,
) {
  const { t } = useTranslation();
  const showApiError = useApiErrorToast();
  const user = useAuthStore((s) => s.user);
  const removeVehicle = useComparisonStore((s) => s.removeVehicle);
  const removeTire = useComparisonStore((s) => s.removeTire);
  const clearVehicleBucket = useComparisonStore((s) => s.clearVehicles);
  const clearTireBucket = useComparisonStore((s) => s.clearTires);

  const [vehicleListings, setVehicleListings] = useState<Listing[]>([]);
  const [tireListings, setTireListings] = useState<Listing[]>([]);
  const [exitingVehicleIds, setExitingVehicleIds] = useState<Set<string>>(() => new Set());
  const [exitingTireIds, setExitingTireIds] = useState<Set<string>>(() => new Set());
  const [isClearingVehicles, setIsClearingVehicles] = useState(false);
  const [isClearingTires, setIsClearingTires] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const prevVehicleIdsRef = useRef<string[]>([]);
  const prevTireIdsRef = useRef<string[]>([]);
  const vehicleListingsLengthRef = useRef(0);
  const tireListingsLengthRef = useRef(0);
  const hasRehydratedRef = useRef(false);
  const skeletonStartRef = useRef<number | null>(null);

  const finishWithMinSkeleton = useCallback(() => {
    const start = skeletonStartRef.current ?? Date.now();
    const elapsed = Date.now() - start;
    const remaining = Math.max(0, 1000 - elapsed);
    setTimeout(() => setHasInitialized(true), remaining);
  }, []);

  const syncVehicleListings = useCallback(
    async (currentIds: string[]) => {
      if (currentIds.length === 0) {
        setVehicleListings([]);
        prevVehicleIdsRef.current = [];
        vehicleListingsLengthRef.current = 0;
        return;
      }

      const prevIds = new Set(prevVehicleIdsRef.current);
      const currentIdSet = new Set(currentIds);
      const newIds = currentIds.filter((id) => !prevIds.has(id));

      if (newIds.length === 0 && vehicleListingsLengthRef.current > 0) {
        setVehicleListings((prev) => {
          const filtered = prev.filter((listing) => currentIdSet.has(listing.id));
          vehicleListingsLengthRef.current = filtered.length;
          return filtered;
        });
        prevVehicleIdsRef.current = currentIds;
        return;
      }

      const idsToFetch = newIds.length > 0 ? newIds : currentIds;
      const promises = idsToFetch.map((id) => listingsApi.getOne(id).catch(() => null));
      const results = await Promise.all(promises);
      const validListings = results.filter((r) => r !== null).map((r) => r!.data);
      const tireOnly = validListings.filter((l) => isTireListing(l));
      if (tireOnly.length > 0) {
        let removeApiFailed = false;
        for (const l of tireOnly) {
          if (user) {
            try {
              await comparisonApi.remove(l.id);
            } catch {
              removeApiFailed = true;
            }
          }
          removeVehicle(l.id);
        }
        if (removeApiFailed) {
          showApiError();
        }
        toast.warning(t('compare.removedWrongCategoryFromCompare'));
      }
      const forCompare = validListings.filter((l) => !isTireListing(l));

      if (newIds.length > 0) {
        setVehicleListings((prev) => {
          const existingIds = new Set(prev.map((l) => l.id));
          const newListings = forCompare.filter((l) => !existingIds.has(l.id));
          const updated = [...prev.filter((l) => currentIdSet.has(l.id)), ...newListings];
          vehicleListingsLengthRef.current = updated.length;
          return updated;
        });
      } else {
        setVehicleListings(forCompare);
        vehicleListingsLengthRef.current = forCompare.length;
      }
      prevVehicleIdsRef.current = currentIds;
    },
    [removeVehicle, t, user, showApiError],
  );

  const syncTireListings = useCallback(
    async (currentIds: string[]) => {
      if (currentIds.length === 0) {
        setTireListings([]);
        prevTireIdsRef.current = [];
        tireListingsLengthRef.current = 0;
        return;
      }

      const prevIds = new Set(prevTireIdsRef.current);
      const currentIdSet = new Set(currentIds);
      const newIds = currentIds.filter((id) => !prevIds.has(id));

      if (newIds.length === 0 && tireListingsLengthRef.current > 0) {
        setTireListings((prev) => {
          const filtered = prev.filter((listing) => currentIdSet.has(listing.id));
          tireListingsLengthRef.current = filtered.length;
          return filtered;
        });
        prevTireIdsRef.current = currentIds;
        return;
      }

      const idsToFetch = newIds.length > 0 ? newIds : currentIds;
      const promises = idsToFetch.map((id) => listingsApi.getOne(id).catch(() => null));
      const results = await Promise.all(promises);
      const validListings = results.filter((r) => r !== null).map((r) => r!.data);
      const vehicleOnly = validListings.filter((l) => !isTireListing(l));
      if (vehicleOnly.length > 0) {
        let removeApiFailed = false;
        for (const l of vehicleOnly) {
          if (user) {
            try {
              await comparisonApi.remove(l.id);
            } catch {
              removeApiFailed = true;
            }
          }
          removeTire(l.id);
        }
        if (removeApiFailed) {
          showApiError();
        }
        toast.warning(t('compare.removedWrongCategoryFromCompare'));
      }
      const forCompare = validListings.filter((l) => isTireListing(l));

      if (newIds.length > 0) {
        setTireListings((prev) => {
          const existingIds = new Set(prev.map((l) => l.id));
          const newListings = forCompare.filter((l) => !existingIds.has(l.id));
          const updated = [...prev.filter((l) => currentIdSet.has(l.id)), ...newListings];
          tireListingsLengthRef.current = updated.length;
          return updated;
        });
      } else {
        setTireListings(forCompare);
        tireListingsLengthRef.current = forCompare.length;
      }
      prevTireIdsRef.current = currentIds;
    },
    [removeTire, t, user, showApiError],
  );

  useEffect(() => {
    if (!comparisonStoreHydrated) return;

    skeletonStartRef.current = Date.now();
    const run = async () => {
      let vIds = vehicleComparisons;
      let tIds = tireComparisons;

      if (!hasRehydratedRef.current) {
        hasRehydratedRef.current = true;
        await rehydrate();
        vIds = useComparisonStore.getState().vehicleComparisons;
        tIds = useComparisonStore.getState().tireComparisons;
      }

      if (vIds.length === 0 && tIds.length === 0 && typeof window !== 'undefined') {
        const backupRaw = localStorageGetItem('comparison-storage-backup');
        if (backupRaw) {
          try {
            const parsed = JSON.parse(backupRaw) as PersistedComparisonBackup;
            const st = parsed.state;
            const hasOld =
              (st?.vehicleComparisons?.length ?? 0) > 0 ||
              (st?.tireComparisons?.length ?? 0) > 0 ||
              (st?.comparisons?.length ?? 0) > 0;
            if (hasOld) {
              await rehydrate();
              vIds = useComparisonStore.getState().vehicleComparisons;
              tIds = useComparisonStore.getState().tireComparisons;
            }
          } catch {
            void 0;
          }
        }
      }

      try {
        await syncVehicleListings(vIds);
        await syncTireListings(tIds);
      } catch (error) {
        console.error('Error fetching listings:', error);
        toast.error(t('compare.loadError'));
      } finally {
        finishWithMinSkeleton();
      }
    };

    void run();
  }, [
    comparisonStoreHydrated,
    vehicleComparisons,
    tireComparisons,
    rehydrate,
    t,
    finishWithMinSkeleton,
    syncVehicleListings,
    syncTireListings,
  ]);

  const handleRemoveVehicle = async (id: string) => {
    if (exitingVehicleIds.has(id) || isClearingVehicles) return;

    flushSync(() => {
      setExitingVehicleIds((prev) => new Set(prev).add(id));
    });
    await waitForCardExitAnimation();

    if (user) {
      try {
        await comparisonApi.remove(id);
      } catch {
        setExitingVehicleIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        showApiError();
        return;
      }
    }
    setVehicleListings((prev) => prev.filter((listing) => listing.id !== id));
    removeVehicle(id);
    publishCrossTabEvent({
      type: 'comparison-changed',
      listingId: id,
      action: 'remove',
      bucket: 'vehicle',
      isAuthenticated: !!user,
      at: Date.now(),
    });
    setExitingVehicleIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast.success(t('compare.removedFromComparison'));
  };

  const handleRemoveTire = async (id: string) => {
    if (exitingTireIds.has(id) || isClearingTires) return;

    flushSync(() => {
      setExitingTireIds((prev) => new Set(prev).add(id));
    });
    await waitForCardExitAnimation();

    if (user) {
      try {
        await comparisonApi.remove(id);
      } catch {
        setExitingTireIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        showApiError();
        return;
      }
    }
    setTireListings((prev) => prev.filter((listing) => listing.id !== id));
    removeTire(id);
    publishCrossTabEvent({
      type: 'comparison-changed',
      listingId: id,
      action: 'remove',
      bucket: 'tire',
      isAuthenticated: !!user,
      at: Date.now(),
    });
    setExitingTireIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast.success(t('compare.removedFromComparison'));
  };

  const handleClearAllVehicles = async () => {
    const ids = [...useComparisonStore.getState().vehicleComparisons];
    if (ids.length === 0 || isClearingVehicles) return;

    flushSync(() => {
      setIsClearingVehicles(true);
      setExitingVehicleIds(new Set(ids));
    });
    await waitForCardExitAnimation();

    if (user) {
      let failed = 0;
      for (const id of ids) {
        try {
          await comparisonApi.remove(id);
          removeVehicle(id);
          publishCrossTabEvent({
            type: 'comparison-changed',
            listingId: id,
            action: 'remove',
            bucket: 'vehicle',
            isAuthenticated: true,
            at: Date.now(),
          });
        } catch {
          failed += 1;
        }
      }
      if (failed > 0) {
        setIsClearingVehicles(false);
        setExitingVehicleIds(new Set());
        showApiError();
        return;
      }
    } else {
      clearVehicleBucket();
      for (const id of ids) {
        publishCrossTabEvent({
          type: 'comparison-changed',
          listingId: id,
          action: 'remove',
          bucket: 'vehicle',
          isAuthenticated: false,
          at: Date.now(),
        });
      }
    }
    setVehicleListings([]);
    setIsClearingVehicles(false);
    setExitingVehicleIds(new Set());
    toast.success(t('compare.allRemoved'));
  };

  const handleClearAllTires = async () => {
    const ids = [...useComparisonStore.getState().tireComparisons];
    if (ids.length === 0 || isClearingTires) return;

    flushSync(() => {
      setIsClearingTires(true);
      setExitingTireIds(new Set(ids));
    });
    await waitForCardExitAnimation();

    if (user) {
      let failed = 0;
      for (const id of ids) {
        try {
          await comparisonApi.remove(id);
          removeTire(id);
          publishCrossTabEvent({
            type: 'comparison-changed',
            listingId: id,
            action: 'remove',
            bucket: 'tire',
            isAuthenticated: true,
            at: Date.now(),
          });
        } catch {
          failed += 1;
        }
      }
      if (failed > 0) {
        setIsClearingTires(false);
        setExitingTireIds(new Set());
        showApiError();
        return;
      }
    } else {
      clearTireBucket();
      for (const id of ids) {
        publishCrossTabEvent({
          type: 'comparison-changed',
          listingId: id,
          action: 'remove',
          bucket: 'tire',
          isAuthenticated: false,
          at: Date.now(),
        });
      }
    }
    setTireListings([]);
    setIsClearingTires(false);
    setExitingTireIds(new Set());
    toast.success(t('compare.allRemoved'));
  };

  return {
    vehicleListings,
    tireListings,
    exitingVehicleIds,
    exitingTireIds,
    isClearingVehicles,
    isClearingTires,
    hasInitialized,
    handleRemoveVehicle,
    handleRemoveTire,
    handleClearAllVehicles,
    handleClearAllTires,
  };
}
