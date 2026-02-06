import { useCallback } from 'react';
import { toast } from 'react-hot-toast';

import { useTranslation } from '@/hooks/useTranslation';
import { getFilterRangesValidationError } from '@/lib/validation';

import { FilterState } from './useSearchFilters';

export function useFilterValidation(filters: FilterState) {
  const { t } = useTranslation();

  const validateRanges = useCallback((): boolean => {
    const errorKey = getFilterRangesValidationError(
      filters as unknown as Record<string, string | undefined>
    );
    if (errorKey) {
      toast.error(t(errorKey));
      return false;
    }
    return true;
  }, [filters, t]);

  return { validateRanges };
}
