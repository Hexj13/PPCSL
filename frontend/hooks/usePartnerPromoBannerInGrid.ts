'use client';

import { useCallback, useEffect, useState } from 'react';

import { authApi } from '@/lib/api';
import type { User } from '@/lib/api';
import {
  readGuestPartnerPromoDismissed,
  setGuestPartnerPromoDismissed,
} from '@/lib/partner-promo-dismiss-storage';
import { useAuthStore } from '@/lib/store';

export function usePartnerPromoBannerInGrid() {
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [guestDismissed, setGuestDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setGuestDismissed(readGuestPartnerPromoDismissed());
  }, []);

  const dismissedFromGuest = mounted && guestDismissed;
  const showBanner =
    mounted && !user?.isPlatformPartner && !user?.hidePartnerPromoBanner && !dismissedFromGuest;

  const dismiss = useCallback(async () => {
    if (user) {
      const snapshot: User = { ...user };
      setAuth({ ...user, hidePartnerPromoBanner: true });
      try {
        const { data } = await authApi.dismissPartnerPromoBanner();
        setAuth(data);
      } catch {
        setAuth(snapshot);
      }
    } else {
      setGuestPartnerPromoDismissed();
      setGuestDismissed(true);
    }
  }, [user, setAuth]);

  return { showBanner, dismiss, ready: mounted };
}
