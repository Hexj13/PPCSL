'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

const TAWK_PROPERTY_ID = '69830de3fd3ee61c36a89a48';
const TAWK_WIDGET_ID = '1jgjusgv7';

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

export function TawkTo() {
  const [shouldLoad, setShouldLoad] = useState(false);
  const productionHostname = getProductionHostname();

  useEffect(() => {
    if (productionHostname) {
      setShouldLoad(isProductionHostname(window.location.hostname));
    } else {
      setShouldLoad(isProduction());
    }
  }, [productionHostname]);

  if (!shouldLoad) return null;

  return (
    <Script
      id="tawk-to"
      strategy="lazyOnload"
      dangerouslySetInnerHTML={{
        __html: `
var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
(function(){
var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
s1.async=true;
s1.src='https://embed.tawk.to/${TAWK_PROPERTY_ID}/${TAWK_WIDGET_ID}';
s1.charset='UTF-8';
s1.setAttribute('crossorigin','*');
s0.parentNode.insertBefore(s1,s0);
})();
        `.trim(),
      }}
    />
  );
}
