'use client';

import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useState } from 'react';

import { useCookieConsent } from '@/hooks/useCookieConsent';
import { useDeferredLoadAfterIdle } from '@/hooks/useDeferredThirdParty';
import { invokeGtag } from '@/lib/analytics';

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
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const pathname = usePathname();
  const { consent, isLoading } = useCookieConsent();
  const deferredReady = useDeferredLoadAfterIdle(2500);
  const [isProd, setIsProd] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    setIsProd(isProduction());
  }, []);

  useEffect(() => {
    if (
      !isProd ||
      !gaId ||
      !isScriptLoaded ||
      typeof window === 'undefined' ||
      !window.gtag ||
      isLoading ||
      consent !== 'granted'
    )
      return;
    invokeGtag(() => window.gtag('config', gaId, { page_path: pathname }));
  }, [pathname, gaId, isProd, isScriptLoaded, consent, isLoading]);

  useEffect(() => {
    if (
      !isProd ||
      !gaId ||
      !isScriptLoaded ||
      typeof window === 'undefined' ||
      !window.gtag ||
      isLoading ||
      consent === null
    )
      return;

    const analyticsStorage = consent === 'granted' ? 'granted' : 'denied';

    invokeGtag(() =>
      window.gtag('consent', 'update', {
        analytics_storage: analyticsStorage,
      }),
    );
  }, [consent, isLoading, gaId, isProd, isScriptLoaded]);

  if (!gaId) return null;

  return (
    <div suppressHydrationWarning>
      {isProd && deferredReady && (
        <Script
          id="google-analytics-gtag"
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
          onLoad={() => {
            if (typeof window !== 'undefined' && window.gtag) {
              invokeGtag(() => window.gtag('js', new Date()));
              setIsScriptLoaded(true);
            }
          }}
        />
      )}
    </div>
  );
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
