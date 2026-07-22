'use client';

import { useEffect } from 'react';

import { sessionStorageGetItem, sessionStorageRemoveItem } from '@/lib/browser-session-storage';
import { toast } from '@/lib/toast';

const LISTING_UPDATED_TOAST_KEY = 'listingUpdatedToast';

export function useMyListingsUpdatedToast(t: (key: string) => string): void {
  useEffect(() => {
    const shouldShowToast = sessionStorageGetItem(LISTING_UPDATED_TOAST_KEY) === 'true';
    if (!shouldShowToast) return;
    sessionStorageRemoveItem(LISTING_UPDATED_TOAST_KEY);
    toast.success(t('listings.changesSaved'));
  }, [t]);
}
