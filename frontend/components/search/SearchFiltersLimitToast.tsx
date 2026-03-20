'use client';

import { useEffect } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { SEARCH_FILTERS_LIMIT_ERROR_TOAST_KEY } from '@/lib/constants';
import { toast } from '@/lib/toast';

export function SearchFiltersLimitToast() {
  const { t } = useTranslation();

  useEffect(() => {
    const pendingToastKey = sessionStorage.getItem(SEARCH_FILTERS_LIMIT_ERROR_TOAST_KEY);
    if (!pendingToastKey) {
      return;
    }
    sessionStorage.removeItem(SEARCH_FILTERS_LIMIT_ERROR_TOAST_KEY);
    toast.error(t(pendingToastKey));
  }, [t]);

  return null;
}
