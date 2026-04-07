'use client';

import { useEffect } from 'react';

import type { Listing } from '@/lib/api';
import { sessionStorageGetItem, sessionStorageRemoveItem } from '@/lib/browser-session-storage';
import { toast } from '@/lib/toast';

export function useListingPageCreatedToast(
  isHydrated: boolean,
  listing: Listing | null,
  t: (key: string, values?: Record<string, string | number>) => string,
): void {
  useEffect(() => {
    if (!isHydrated || !listing) return;
    const toastMessage = sessionStorageGetItem('listingCreatedToast');
    if (!toastMessage) return;
    sessionStorageRemoveItem('listingCreatedToast');
    try {
      const parsed = JSON.parse(toastMessage) as {
        created?: string;
        partnerRewardAwarded?: number;
      };
      if (parsed.created) {
        toast.success(parsed.created);
      } else {
        toast.success(toastMessage);
      }
      if (parsed.partnerRewardAwarded && parsed.partnerRewardAwarded > 0) {
        toast.success(t('listings.partnerRewardToast', { count: parsed.partnerRewardAwarded }));
      }
    } catch {
      toast.success(toastMessage);
    }
  }, [isHydrated, listing, t]);
}
