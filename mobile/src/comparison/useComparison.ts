import { useCallback, useEffect, useState } from 'react';

import { mobileComparisonApi } from '@/api/comparison';
import { getApiErrorMessage } from '@/api/getApiErrorMessage';
import { useAuth } from '@/auth/AuthContext';
import { showToast } from '@/components/providers/ToastProvider';
import { useI18n } from '@/i18n/I18nContext';

import { comparisonStore, MAX_COMPARE } from './comparisonStore';

export function useComparison() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [vehicleIds, setVehicleIds] = useState<string[]>([]);
  const [tireIds, setTireIds] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    if (user) {
      try {
        const { data } = await mobileComparisonApi.getIds();
        setVehicleIds(data.vehicleListingIds ?? []);
        setTireIds(data.tireListingIds ?? []);
      } catch {
        const local = await comparisonStore.read();
        setVehicleIds(local.vehicleComparisons);
        setTireIds(local.tireComparisons);
      }
      return;
    }
    const local = await comparisonStore.read();
    setVehicleIds(local.vehicleComparisons);
    setTireIds(local.tireComparisons);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const syncOnLogin = useCallback(async () => {
    const local = await comparisonStore.read();
    try {
      const { data } = await mobileComparisonApi.sync({
        vehicleListingIds: local.vehicleComparisons,
        tireListingIds: local.tireComparisons,
      });
      setVehicleIds(data.vehicleListingIds ?? []);
      setTireIds(data.tireListingIds ?? []);
    } catch {
      await refresh();
    }
  }, [refresh]);

  useEffect(() => {
    if (user) syncOnLogin();
  }, [user, syncOnLogin]);

  const count = vehicleIds.length + tireIds.length;

  const toggle = useCallback(
    async (listingId: string, isTire: boolean) => {
      const ids = isTire ? tireIds : vehicleIds;
      const inList = ids.includes(listingId);

      if (user) {
        try {
          if (inList) {
            await mobileComparisonApi.remove(listingId);
          } else {
            if (ids.length >= MAX_COMPARE) {
              showToast(
                'info',
                isTire ? t('listingDetail.cannotCompareMoreTires') : t('listingDetail.cannotCompareMore'),
              );
              return false;
            }
            await mobileComparisonApi.add(listingId);
          }
          await refresh();
          return true;
        } catch (err) {
          showToast('error', getApiErrorMessage(err, t('common.error')));
          return false;
        }
      }

      if (inList) {
        if (isTire) await comparisonStore.removeTire(listingId);
        else await comparisonStore.removeVehicle(listingId);
      } else {
        const ok = isTire
          ? await comparisonStore.addTire(listingId)
          : await comparisonStore.addVehicle(listingId);
        if (!ok) {
          showToast(
            'info',
            isTire ? t('listingDetail.cannotCompareMoreTires') : t('listingDetail.cannotCompareMore'),
          );
          return false;
        }
      }
      await refresh();
      return true;
    },
    [user, vehicleIds, tireIds, refresh, t],
  );

  const check = useCallback(
    (listingId: string, isTire: boolean) => {
      return (isTire ? tireIds : vehicleIds).includes(listingId);
    },
    [vehicleIds, tireIds],
  );

  const remove = useCallback(
    async (listingId: string, isTire: boolean) => {
      if (user) await mobileComparisonApi.remove(listingId);
      else if (isTire) await comparisonStore.removeTire(listingId);
      else await comparisonStore.removeVehicle(listingId);
      await refresh();
    },
    [user, refresh],
  );

  return {
    vehicleIds,
    tireIds,
    count,
    refresh,
    toggle,
    check,
    remove,
  };
}
