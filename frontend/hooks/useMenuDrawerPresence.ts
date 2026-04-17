'use client';

import { useLayoutEffect, useRef, useState } from 'react';

export const MOBILE_MENU_EXIT_ANIM_MS = 280;

export const MOBILE_MENU_ENTER_ANIM_MS = 260;

export function useMenuDrawerPresence(wantOpen: boolean) {
  const [mounted, setMounted] = useState(wantOpen);
  const [exiting, setExiting] = useState(false);
  const mountedRef = useRef(mounted);
  mountedRef.current = mounted;

  useLayoutEffect(() => {
    if (wantOpen) {
      setMounted(true);
      setExiting(false);
      return undefined;
    }
    if (!mountedRef.current) {
      return undefined;
    }
    setExiting(true);
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = reduced ? 0 : MOBILE_MENU_EXIT_ANIM_MS;
    const timer = window.setTimeout(() => {
      setMounted(false);
      setExiting(false);
    }, delay);
    return () => {
      window.clearTimeout(timer);
    };
  }, [wantOpen]);

  return { mounted, exiting };
}
