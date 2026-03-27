import { useMemo } from 'react';

import type { TireBrand } from '@/lib/api';

import { computeTireSearchFilterFlags } from './search-filter-flags-tire';
import { computeVehicleSearchFilterFlags } from './search-filter-flags-vehicle';
import type { FilterState } from './useSearchFilters';

export function useSearchFilterFlags(
  filters: FilterState,
  currentYear: string,
  tireBrands: TireBrand[] = [],
): {
  hasBasicFilters: boolean;
  hasAdvancedFiltersActive: boolean;
  hasEquipmentFiltersActive: boolean;
  hasTireBasicFilters: boolean;
  hasTirePopularFilters: boolean;
} {
  return useMemo(() => {
    if (filters.listing_category === 'tire') {
      const tireFlags = computeTireSearchFilterFlags(filters, tireBrands);
      return {
        hasBasicFilters: false,
        hasAdvancedFiltersActive: false,
        hasEquipmentFiltersActive: false,
        hasTireBasicFilters: tireFlags.hasTireBasicFilters,
        hasTirePopularFilters: tireFlags.hasTirePopularFilters,
      };
    }

    const vehicleFlags = computeVehicleSearchFilterFlags(filters, currentYear);
    return {
      ...vehicleFlags,
      hasTireBasicFilters: false,
      hasTirePopularFilters: false,
    };
  }, [filters, currentYear, tireBrands]);
}
