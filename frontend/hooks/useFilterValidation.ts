import { useCallback } from 'react';
import { toast } from 'react-hot-toast';

import { useTranslation } from '@/hooks/useTranslation';

import { FilterState } from './useSearchFilters';

export function useFilterValidation(filters: FilterState) {
  const { t } = useTranslation();

  const validateRanges = useCallback((): boolean => {
    if (filters.year_gte && filters.year_lte) {
      const yearGte = parseInt(filters.year_gte, 10);
      const yearLte = parseInt(filters.year_lte, 10);
      if (!isNaN(yearGte) && !isNaN(yearLte) && yearGte > yearLte) {
        toast.error(t('searchFilters.yearFromGreaterThanTo'));
        return false;
      }
    }

    if (filters.price_gte && filters.price_lte) {
      const priceGte = parseInt(filters.price_gte, 10);
      const priceLte = parseInt(filters.price_lte, 10);
      if (!isNaN(priceGte) && !isNaN(priceLte) && priceGte > priceLte) {
        toast.error(t('searchFilters.priceFromGreaterThanTo'));
        return false;
      }
    }

    if (filters.mileage_gte && filters.mileage_lte) {
      const mileageGte = parseInt(filters.mileage_gte, 10);
      const mileageLte = parseInt(filters.mileage_lte, 10);
      if (!isNaN(mileageGte) && !isNaN(mileageLte) && mileageGte > mileageLte) {
        toast.error(t('searchFilters.mileageFromGreaterThanTo'));
        return false;
      }
    }

    if (filters.engine_displ_l_gte && filters.engine_displ_l_lte) {
      const engineGte = parseFloat(filters.engine_displ_l_gte);
      const engineLte = parseFloat(filters.engine_displ_l_lte);
      if (!isNaN(engineGte) && !isNaN(engineLte) && engineGte > engineLte) {
        toast.error(t('searchFilters.engineFromGreaterThanTo'));
        return false;
      }
    }

    if (filters.horsepower_gte && filters.horsepower_lte) {
      const hpGte = parseInt(filters.horsepower_gte, 10);
      const hpLte = parseInt(filters.horsepower_lte, 10);
      if (!isNaN(hpGte) && !isNaN(hpLte) && hpGte > hpLte) {
        toast.error(t('searchFilters.horsepowerFromGreaterThanTo'));
        return false;
      }
    }

    return true;
  }, [filters, t]);

  return { validateRanges };
}
