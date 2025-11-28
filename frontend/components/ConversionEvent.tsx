'use client';

import { useEffect, useRef, useState } from 'react';

import { useCookieConsent } from '@/hooks/useCookieConsent';

export function ConversionEvent() {
  const [isGtagReady, setIsGtagReady] = useState(false);
  const { consent, isLoading } = useCookieConsent();
  const hasFiredRef = useRef(false);

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
    if (
      hasFiredRef.current ||
      !isGtagReady ||
      isLoading ||
      consent !== 'granted' ||
      typeof window === 'undefined' ||
      typeof window.gtag !== 'function'
    )
      return;

    window.gtag('event', 'conversion_event_page_view', {});
    hasFiredRef.current = true;
  }, [isGtagReady, consent, isLoading]);

  return null;
}
