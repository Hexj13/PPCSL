'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useCookieConsent } from '@/hooks/useCookieConsent';
import { useDeferredLoadAfterIdle } from '@/hooks/useDeferredThirdParty';

const isProduction = () => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return (
    hostname !== 'localhost' &&
    hostname !== '127.0.0.1' &&
    !hostname.startsWith('192.168.') &&
    !hostname.startsWith('10.') &&
    hostname !== '0.0.0.0'
  );
};

export function GoogleAnalytics() {
  const pathname = usePathname();
  const { consent, isLoading } = useCookieConsent();
  const deferredReady = useDeferredLoadAfterIdle(2500);
  const [isProd, setIsProd] = useState(false);

  useEffect(() => {
    setIsProd(isProduction());
  }, []);

  useEffect(() => {
    if (
      !isProd ||
      !deferredReady ||
      isLoading ||
      consent !== 'granted' ||
      typeof window === 'undefined'
    ) {
      return;
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'page_view',
      page_path: pathname,
    });
  }, [pathname, isProd, deferredReady, consent, isLoading]);

  return null;
}

declare global {
  interface Window {
    gtag: (
      _command: 'config' | 'event' | 'js' | 'set' | 'consent',
      _targetId: string | Date | 'default' | 'update',
      _config?: Record<string, unknown>,
    ) => void;
    dataLayer: unknown[];
  }
}
