'use client';

import { useEffect } from 'react';

import { toast } from '@/lib/toast';

const LISTING_UPDATED_TOAST_KEY = 'listingUpdatedToast';

export function useMyListingsUpdatedToast(t: (key: string) => string): void {
  useEffect(() => {
    const shouldShowToast = sessionStorage.getItem(LISTING_UPDATED_TOAST_KEY) === 'true';
    if (!shouldShowToast) return;
    sessionStorage.removeItem(LISTING_UPDATED_TOAST_KEY);
    toast.success(t('listings.changesSaved'));
  }, [t]);
}
