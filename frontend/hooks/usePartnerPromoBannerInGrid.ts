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
  const token = useAuthStore((s) => s.token);
  const refreshToken = useAuthStore((s) => s.refreshToken);
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
      setAuth({ ...user, hidePartnerPromoBanner: true }, token, refreshToken);
      try {
        const { data } = await authApi.dismissPartnerPromoBanner();
        const { token: t, refreshToken: rt } = useAuthStore.getState();
        setAuth(data, t ?? null, rt ?? null);
      } catch {
        const { token: t, refreshToken: rt } = useAuthStore.getState();
        setAuth(snapshot, t ?? null, rt ?? null);
      }
    } else {
      setGuestPartnerPromoDismissed();
      setGuestDismissed(true);
    }
  }, [user, setAuth, token, refreshToken]);

  return { showBanner, dismiss };
}
