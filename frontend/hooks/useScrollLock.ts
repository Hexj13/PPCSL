'use client';

import { useEffect } from 'react';

export function useScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const scrollY = window.scrollY;
    const body = document.body;
    const originalPosition = body.style.position;
    const originalTop = body.style.top;
    const originalWidth = body.style.width;
    const originalLeft = body.style.left;

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.width = '100%';

    return () => {
      body.style.position = originalPosition;
      body.style.top = originalTop;
      body.style.width = originalWidth;
      body.style.left = originalLeft;
      window.scrollTo(0, scrollY);
    };
  }, [enabled]);
}
