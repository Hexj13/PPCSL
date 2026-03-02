import type { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, startTransition } from 'react';

import { analytics } from '@/lib/analytics';
import { VEHICLE_TYPE_BY_BODY_TYPE } from '@/lib/constants';
import { isBrowser } from '@/lib/utils';

import type { FilterState } from './useSearchFilters';

const VEHICLE_TYPE_STORAGE_KEY = 'kupito_vehicle_type';

const saveVehicleTypeToStorage = (vehicleType: 'car' | 'moto' | 'truck') => {
  if (isBrowser) {
    try {
      localStorage.setItem(VEHICLE_TYPE_STORAGE_KEY, vehicleType);
    } catch (e) {
      console.error('Failed to save vehicle type to storage:', e);
    }
  }
};

const getVehicleTypeFromStorage = (): 'car' | 'moto' | 'truck' | null => {
  if (isBrowser) {
    try {
      const stored = localStorage.getItem(VEHICLE_TYPE_STORAGE_KEY);
      if (stored && ['car', 'truck', 'moto'].includes(stored)) {
        return stored as 'car' | 'moto' | 'truck';
      }
    } catch (e) {
      console.error('Failed to get vehicle type from storage:', e);
    }
  }
  return null;
};

interface UseVehicleTypeParams {
  searchParams: ReturnType<typeof useSearchParams>;
  resetFilters: () => void;
  setLastAppliedFilters: React.Dispatch<React.SetStateAction<FilterState | null>>;
  setActiveTab: (_tab: 'basic' | 'advanced' | 'equipment' | 'popular') => void;
  scrollTabsToStart?: () => void;
}

export function useVehicleType({
  searchParams,
  resetFilters,
  setLastAppliedFilters,
  setActiveTab,
  scrollTabsToStart,
}: UseVehicleTypeParams) {
  const router = useRouter();

  const getInitialVehicleType = useCallback((): 'car' | 'moto' | 'truck' => {
    const vehicleTypeParam = searchParams.get('vehicleType');
    if (vehicleTypeParam && ['car', 'truck', 'moto'].includes(vehicleTypeParam)) {
      return vehicleTypeParam as 'car' | 'truck' | 'moto';
    }

    const storedVehicleType = getVehicleTypeFromStorage();
    if (storedVehicleType) {
      return storedVehicleType;
    }

    return 'car';
  }, [searchParams]);

  const [vehicleType, setVehicleType] = useState<'car' | 'moto' | 'truck'>(() =>
    getInitialVehicleType(),
  );

  useEffect(() => {
    const vehicleTypeParam = searchParams.get('vehicleType');
    let newVehicleType: 'car' | 'truck' | 'moto' = 'car';

    if (vehicleTypeParam && ['car', 'truck', 'moto'].includes(vehicleTypeParam)) {
      newVehicleType = vehicleTypeParam as 'car' | 'truck' | 'moto';
    } else {
      const bodyTypesParam = searchParams.get('body_types');
      if (bodyTypesParam) {
        const bodyTypes = bodyTypesParam.split(',').map((bt) => bt.trim());
        const categories = bodyTypes.map((bt) => VEHICLE_TYPE_BY_BODY_TYPE[bt]).filter(Boolean);

        if (categories.length > 0 && categories.every((cat) => cat === categories[0])) {
          newVehicleType = categories[0];
        }
      }
    }

    if (newVehicleType !== vehicleType) {
      setVehicleType(newVehicleType);
      saveVehicleTypeToStorage(newVehicleType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setVehicleTypeWithStorage = useCallback((type: 'car' | 'truck' | 'moto') => {
    setVehicleType(type);
    saveVehicleTypeToStorage(type);
  }, []);

  const handleVehicleTypeChange = useCallback(
    (type: 'car' | 'truck' | 'moto') => {
      analytics.selectVehicleType(type);

      const params = new URLSearchParams();
      if (type !== 'car') {
        params.set('vehicleType', type);
      }

      startTransition(() => {
        setVehicleType(type);
        saveVehicleTypeToStorage(type);
        resetFilters();
        setLastAppliedFilters(null);
        setActiveTab('basic');
        scrollTabsToStart?.();
        router.replace(`/?${params.toString()}`, { scroll: false });
      });
    },
    [router, resetFilters, setLastAppliedFilters, setActiveTab, scrollTabsToStart],
  );

  return {
    vehicleType,
    setVehicleTypeWithStorage,
    handleVehicleTypeChange,
  };
}
