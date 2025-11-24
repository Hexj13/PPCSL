'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

const GTM_ID = 'GTM-K527X5WK';

const isProductionHostname = (hostname: string) => {
  return (
    hostname !== 'localhost' &&
    hostname !== '127.0.0.1' &&
    !hostname.startsWith('192.168.') &&
    !hostname.startsWith('10.') &&
    hostname !== '0.0.0.0'
  );
};

const isProduction = () => {
  if (typeof window === 'undefined') return false;
  return isProductionHostname(window.location.hostname);
};

const isProductionFromEnv = () => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return process.env.NODE_ENV === 'production';
  try {
    const url = new URL(siteUrl);
    return isProductionHostname(url.hostname);
  } catch {
    return process.env.NODE_ENV === 'production';
  }
};

export function GoogleTagManager() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    setShouldLoad(isProduction());
  }, []);

  return (
    <div suppressHydrationWarning>
      {shouldLoad && (
        <Script
          id="google-tag-manager"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
          }}
        />
      )}
    </div>
  );
}

export function GoogleTagManagerNoscript() {
  const shouldLoad = isProductionFromEnv();

  if (!shouldLoad) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
      />
    </noscript>
  );
}
