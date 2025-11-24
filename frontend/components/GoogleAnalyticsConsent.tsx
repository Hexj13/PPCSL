import Script from 'next/script';

export function GoogleAnalyticsConsent() {
  return (
    <Script
      id="google-analytics-consent"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            analytics_storage: 'denied',
            ad_storage: 'denied',
          });
        `,
      }}
    />
  );
}
