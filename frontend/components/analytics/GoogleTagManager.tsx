'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

import { useDeferredLoadAfterIdle } from '@/hooks/useDeferredThirdParty';
import { useTranslation } from '@/hooks/useTranslation';

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

const getProductionHostname = () => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return null;
  try {
    const url = new URL(siteUrl);
    return url.hostname;
  } catch {
    return null;
  }
};

export function GoogleTagManager() {
  const [isProd, setIsProd] = useState(false);
  const productionHostname = getProductionHostname();
  const deferredReady = useDeferredLoadAfterIdle(2500);

  useEffect(() => {
    if (productionHostname) {
      setIsProd(isProductionHostname(window.location.hostname));
    } else {
      setIsProd(isProduction());
    }
  }, [productionHostname]);

  const shouldLoad = isProd && deferredReady;

  return (
    <div suppressHydrationWarning>
      {shouldLoad && (
        <Script
          id="google-tag-manager"
          strategy="lazyOnload"
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
  const { t } = useTranslation();
  const productionHostname = getProductionHostname();
  const shouldLoad = productionHostname
    ? isProductionHostname(productionHostname)
    : process.env.NODE_ENV === 'production';

  if (!shouldLoad) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        title={t('common.googleTagManager')}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
      />
    </noscript>
  );
}
