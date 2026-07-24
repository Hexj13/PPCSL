import { useCallback, useEffect, useRef, useState } from 'react';

import { useApiErrorToast } from '@/hooks/useApiErrorToast';
import { useTranslation } from '@/hooks/useTranslation';
import { comparisonApi, listingsApi } from '@/lib/api';
import type { Listing } from '@/lib/api';
import { localStorageGetItem } from '@/lib/browser-local-storage';
import { useAuthStore, useComparisonStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { isTireListing } from '@/lib/utils';

import { createCompareListingActions } from './useComparePageListingActions';

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
  const [rehydrateComplete, setRehydrateComplete] = useState(false);
  const prevVehicleIdsRef = useRef<string[]>([]);
  const prevTireIdsRef = useRef<string[]>([]);
  const vehicleListingsLengthRef = useRef(0);
  const tireListingsLengthRef = useRef(0);
  const inFlightVehicleIdsRef = useRef<Set<string>>(new Set());
  const inFlightTireIdsRef = useRef<Set<string>>(new Set());
  const hasRehydratedRef = useRef(false);
  const syncGenerationRef = useRef(0);
  const skeletonStartRef = useRef<number | null>(null);
  const vehicleIdsSignature = vehicleComparisons.join(',');
  const tireIdsSignature = tireComparisons.join(',');

  const finishWithMinSkeleton = useCallback(() => {
    const start = skeletonStartRef.current ?? Date.now();
    const elapsed = Date.now() - start;
    const remaining = Math.max(0, 1000 - elapsed);
    setTimeout(() => setHasInitialized(true), remaining);
  }, []);

  const syncVehicleListings = useCallback(
    async (currentIds: string[], isStale?: () => boolean) => {
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
        const alreadySynced =
          prevVehicleIdsRef.current.length === currentIds.length &&
          prevVehicleIdsRef.current.every((id, index) => id === currentIds[index]);
        if (alreadySynced) {
          return;
        }
        setVehicleListings((prev) => {
          const filtered = prev.filter((listing) => currentIdSet.has(listing.id));
          vehicleListingsLengthRef.current = filtered.length;
          return filtered;
        });
        prevVehicleIdsRef.current = currentIds;
        return;
      }

      const requestedIds = newIds.length > 0 ? newIds : currentIds;
      const idsToFetch = requestedIds.filter((id) => !inFlightVehicleIdsRef.current.has(id));
      if (idsToFetch.length === 0) {
        return;
      }
      for (const id of idsToFetch) {
        inFlightVehicleIdsRef.current.add(id);
      }

      let results: (Awaited<ReturnType<typeof listingsApi.getOne>> | null)[] = [];
      try {
        const promises = idsToFetch.map((id) => listingsApi.getOne(id).catch(() => null));
        results = await Promise.all(promises);
      } finally {
        for (const id of idsToFetch) {
          inFlightVehicleIdsRef.current.delete(id);
        }
      }

      if (isStale?.()) {
        return;
      }

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
    async (currentIds: string[], isStale?: () => boolean) => {
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
        const alreadySynced =
          prevTireIdsRef.current.length === currentIds.length &&
          prevTireIdsRef.current.every((id, index) => id === currentIds[index]);
        if (alreadySynced) {
          return;
        }
        setTireListings((prev) => {
          const filtered = prev.filter((listing) => currentIdSet.has(listing.id));
          tireListingsLengthRef.current = filtered.length;
          return filtered;
        });
        prevTireIdsRef.current = currentIds;
        return;
      }

      const requestedIds = newIds.length > 0 ? newIds : currentIds;
      const idsToFetch = requestedIds.filter((id) => !inFlightTireIdsRef.current.has(id));
      if (idsToFetch.length === 0) {
        return;
      }
      for (const id of idsToFetch) {
        inFlightTireIdsRef.current.add(id);
      }

      let results: (Awaited<ReturnType<typeof listingsApi.getOne>> | null)[] = [];
      try {
        const promises = idsToFetch.map((id) => listingsApi.getOne(id).catch(() => null));
        results = await Promise.all(promises);
      } finally {
        for (const id of idsToFetch) {
          inFlightTireIdsRef.current.delete(id);
        }
      }

      if (isStale?.()) {
        return;
      }

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
    if (!comparisonStoreHydrated || hasRehydratedRef.current) return;

    hasRehydratedRef.current = true;
    const run = async () => {
      await rehydrate();
      let vIds = useComparisonStore.getState().vehicleComparisons;
      let tIds = useComparisonStore.getState().tireComparisons;

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
            }
          } catch {
            void 0;
          }
        }
      }

      setRehydrateComplete(true);
    };

    void run();
  }, [comparisonStoreHydrated, rehydrate]);

  useEffect(() => {
    if (!comparisonStoreHydrated || !rehydrateComplete) return;

    skeletonStartRef.current = Date.now();
    const generation = ++syncGenerationRef.current;
    let cancelled = false;
    const isStale = () => cancelled || generation !== syncGenerationRef.current;

    const run = async () => {
      const vIds = useComparisonStore.getState().vehicleComparisons;
      const tIds = useComparisonStore.getState().tireComparisons;

      try {
        await syncVehicleListings(vIds, isStale);
        if (isStale()) return;
        await syncTireListings(tIds, isStale);
      } catch (error) {
        if (isStale()) return;
        console.error('Error fetching listings:', error);
        toast.error(t('compare.loadError'));
      } finally {
        if (!isStale()) {
          finishWithMinSkeleton();
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    comparisonStoreHydrated,
    rehydrateComplete,
    vehicleIdsSignature,
    tireIdsSignature,
    t,
    finishWithMinSkeleton,
    syncVehicleListings,
    syncTireListings,
  ]);

  const { handleRemove: handleRemoveVehicle, handleClearAll: handleClearAllVehicles } =
    createCompareListingActions({
      user,
      t,
      showApiError,
      exitingIds: exitingVehicleIds,
      isClearing: isClearingVehicles,
      setExitingIds: setExitingVehicleIds,
      setIsClearing: setIsClearingVehicles,
      setListings: setVehicleListings,
      removeFromStore: removeVehicle,
      clearBucket: clearVehicleBucket,
      getStoreIds: () => useComparisonStore.getState().vehicleComparisons,
      bucket: 'vehicle',
    });

  const { handleRemove: handleRemoveTire, handleClearAll: handleClearAllTires } =
    createCompareListingActions({
      user,
      t,
      showApiError,
      exitingIds: exitingTireIds,
      isClearing: isClearingTires,
      setExitingIds: setExitingTireIds,
      setIsClearing: setIsClearingTires,
      setListings: setTireListings,
      removeFromStore: removeTire,
      clearBucket: clearTireBucket,
      getStoreIds: () => useComparisonStore.getState().tireComparisons,
      bucket: 'tire',
    });

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
