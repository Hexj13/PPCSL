import Script from 'next/script';

export function GoogleAnalyticsConsent() {
  return (
    <Script
      id="google-analytics-consent"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            if (typeof window === 'undefined') return;
            const hostname = window.location.hostname;
            const isLocalhost = hostname === 'localhost' ||
              hostname === '127.0.0.1' ||
              hostname.startsWith('192.168.') ||
              hostname.startsWith('10.') ||
              hostname === '0.0.0.0';
            if (isLocalhost) return;
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('consent', 'default', {
              analytics_storage: 'denied',
              ad_storage: 'denied',
            });
          })();
        `,
      }}
    />
  );
}
