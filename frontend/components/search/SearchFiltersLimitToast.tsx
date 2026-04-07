'use client';

import { useEffect } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { sessionStorageGetItem, sessionStorageRemoveItem } from '@/lib/browser-session-storage';
import { SEARCH_FILTERS_LIMIT_ERROR_TOAST_KEY } from '@/lib/constants';
import { toast } from '@/lib/toast';

export function SearchFiltersLimitToast() {
  const { t } = useTranslation();

  useEffect(() => {
    const pendingToastKey = sessionStorageGetItem(SEARCH_FILTERS_LIMIT_ERROR_TOAST_KEY);
    if (!pendingToastKey) {
      return;
    }
    sessionStorageRemoveItem(SEARCH_FILTERS_LIMIT_ERROR_TOAST_KEY);
    toast.error(t(pendingToastKey));
  }, [t]);

  return null;
}
