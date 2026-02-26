'use client';

import { useEffect, useState } from 'react';

const IDLE_TIMEOUT_MS = 2500;
const INTERACTION_IDLE_FALLBACK_MS = 4000;

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

export function useDeferredLoadAfterInteraction(
  fallbackMs: number = INTERACTION_IDLE_FALLBACK_MS,
): boolean {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const fallbackId = window.setTimeout(() => setShouldLoad(true), fallbackMs);

    const onInteraction = () => {
      setShouldLoad(true);
    };

    const opts = { passive: true, capture: true };
    window.addEventListener('click', onInteraction, opts);
    window.addEventListener('touchstart', onInteraction, opts);
    window.addEventListener('keydown', onInteraction, opts);
    window.addEventListener('scroll', onInteraction, opts);

    return () => {
      clearTimeout(fallbackId);
      window.removeEventListener('click', onInteraction, opts);
      window.removeEventListener('touchstart', onInteraction, opts);
      window.removeEventListener('keydown', onInteraction, opts);
      window.removeEventListener('scroll', onInteraction, opts);
    };
  }, [fallbackMs]);

  return shouldLoad;
}
