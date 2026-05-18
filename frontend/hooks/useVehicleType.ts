import type { useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, startTransition } from 'react';

import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { analytics } from '@/lib/analytics';
import { localStorageGetItem, localStorageSetItem } from '@/lib/browser-local-storage';
import { VEHICLE_TYPE_BY_BODY_TYPE } from '@/lib/constants';
import { isBrowser } from '@/lib/utils';

import type { FilterState } from './useSearchFilters';

const VEHICLE_TYPE_STORAGE_KEY = 'kupito_vehicle_type';

const saveVehicleTypeToStorage = (vehicleType: 'car' | 'moto' | 'truck') => {
  if (isBrowser) {
    localStorageSetItem(VEHICLE_TYPE_STORAGE_KEY, vehicleType);
  }
};

const getVehicleTypeFromStorage = (): 'car' | 'moto' | 'truck' | null => {
  if (isBrowser) {
    const stored = localStorageGetItem(VEHICLE_TYPE_STORAGE_KEY);
    if (stored && ['car', 'truck', 'moto'].includes(stored)) {
      return stored as 'car' | 'moto' | 'truck';
    }
  }
  return null;
};

export function getVehicleTypeFromUrlAndBodyTypesOnly(searchParams: {
  get: (name: string) => string | null;
}): 'car' | 'moto' | 'truck' {
  const vehicleTypeParam = searchParams.get('vehicleType');
  if (vehicleTypeParam && ['car', 'truck', 'moto'].includes(vehicleTypeParam)) {
    return vehicleTypeParam as 'car' | 'truck' | 'moto';
  }
  const bodyTypesParam = searchParams.get('body_types');
  if (bodyTypesParam) {
    const bodyTypes = bodyTypesParam.split(',').map((bt) => bt.trim());
    const categories = bodyTypes.map((bt) => VEHICLE_TYPE_BY_BODY_TYPE[bt]).filter(Boolean);
    if (categories.length > 0 && categories.every((cat) => cat === categories[0])) {
      return categories[0];
    }
  }
  return 'car';
}

interface UseVehicleTypeParams {
  searchParams: ReturnType<typeof useSearchParams>;
  resetToVehicleSearchDefaults: () => void;
  setLastAppliedFilters: React.Dispatch<React.SetStateAction<FilterState | null>>;
  setActiveTab: (_tab: 'basic' | 'advanced' | 'equipment' | 'popular') => void;
  scrollTabsToStart?: () => void;
}

export function useVehicleType({
  searchParams,
  resetToVehicleSearchDefaults,
  setLastAppliedFilters,
  setActiveTab,
  scrollTabsToStart,
}: UseVehicleTypeParams) {
  const { replace } = useLocalizedNavigation();

  const [vehicleType, setVehicleType] = useState<'car' | 'moto' | 'truck'>(() =>
    getVehicleTypeFromUrlAndBodyTypesOnly(searchParams),
  );

  useEffect(() => {
    if (searchParams.get('category') === 'tire') {
      return;
    }
    const vehicleTypeParam = searchParams.get('vehicleType');
    const urlSpecifiesVehicleType =
      vehicleTypeParam !== null &&
      vehicleTypeParam !== '' &&
      ['car', 'truck', 'moto'].includes(vehicleTypeParam);

    let newVehicleType = getVehicleTypeFromUrlAndBodyTypesOnly(searchParams);

    if (!urlSpecifiesVehicleType && newVehicleType === 'car') {
      const stored = getVehicleTypeFromStorage();
      if (stored) {
        newVehicleType = stored;
      }
    }

    if (newVehicleType !== vehicleType) {
      setVehicleType(newVehicleType);
      saveVehicleTypeToStorage(newVehicleType);
    }
  }, [searchParams, vehicleType]);

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
        resetToVehicleSearchDefaults();
        setLastAppliedFilters(null);
        setActiveTab('basic');
        scrollTabsToStart?.();
        replace(`/?${params.toString()}`, { scroll: false });
      });
    },
    [replace, resetToVehicleSearchDefaults, setLastAppliedFilters, setActiveTab, scrollTabsToStart],
  );

  return {
    vehicleType,
    setVehicleTypeWithStorage,
    handleVehicleTypeChange,
  };
}
