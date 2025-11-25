'use client';

import { useEffect, useState } from 'react';

export function ConversionEvent() {
  const [isGtagReady, setIsGtagReady] = useState(false);

  useEffect(() => {
    const checkGtag = () => {
      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        setIsGtagReady(true);
        return true;
      }
      return false;
    };

    if (checkGtag()) {
      return;
    }

    const interval = setInterval(() => {
      if (checkGtag()) {
        clearInterval(interval);
      }
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!isGtagReady || typeof window === 'undefined' || typeof window.gtag !== 'function') return;

    window.gtag('event', 'conversion_event_page_view', {});
  }, [isGtagReady]);

  return null;
}
