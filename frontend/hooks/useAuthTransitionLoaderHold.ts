'use client';

import { useEffect, useState } from 'react';

import {
  clearAuthTransitionLoader,
  getAuthTransitionLoaderRemainingMs,
} from '@/lib/auth-transition-loader';

export function useAuthTransitionLoaderHold(): boolean {
  const [hold, setHold] = useState(() => getAuthTransitionLoaderRemainingMs() > 0);

  useEffect(() => {
    const remaining = getAuthTransitionLoaderRemainingMs();
    if (remaining <= 0) {
      clearAuthTransitionLoader();
      setHold(false);
      return;
    }
    setHold(true);
    const timeoutId = setTimeout(() => {
      clearAuthTransitionLoader();
      setHold(false);
    }, remaining);
    return () => clearTimeout(timeoutId);
  }, []);

  return hold;
}
