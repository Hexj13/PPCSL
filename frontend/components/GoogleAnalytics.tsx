'use client';

import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { useEffect } from 'react';

export function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const pathname = usePathname();

  useEffect(() => {
    if (!gaId || typeof window === 'undefined' || !window.gtag) return;
    window.gtag('config', gaId, { page_path: pathname });
  }, [pathname, gaId]);

  if (!gaId) return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}

declare global {
  interface Window {
    gtag: (
      _command: 'config' | 'event' | 'js' | 'set',
      _targetId: string | Date,
      _config?: Record<string, unknown>
    ) => void;
    dataLayer: unknown[];
  }
}
