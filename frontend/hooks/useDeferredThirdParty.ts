'use client';

import { useEffect, useState } from 'react';

const IDLE_TIMEOUT_MS = 2500;

export function useDeferredLoadAfterIdle(timeoutMs: number = IDLE_TIMEOUT_MS): boolean {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const timeoutId = window.setTimeout(() => setShouldLoad(true), timeoutMs);

    const onIdle = () => {
      setShouldLoad(true);
    };

    if (typeof requestIdleCallback !== 'undefined' && typeof cancelIdleCallback !== 'undefined') {
      const id = requestIdleCallback(onIdle, { timeout: Math.min(timeoutMs, 3000) });
      return () => {
        cancelIdleCallback(id);
        clearTimeout(timeoutId);
      };
    }

    return () => clearTimeout(timeoutId);
  }, [timeoutMs]);

  return shouldLoad;
}
