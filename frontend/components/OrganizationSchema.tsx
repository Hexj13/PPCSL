'use client';

import { useEffect } from 'react';

export function OrganizationSchema() {
  useEffect(() => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.club';

    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Kupito',
      url: siteUrl,
      logo: `${siteUrl}/logo.png`,
      description: 'Купете или продадете авто на Kupito!',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'MK',
      },
      sameAs: [],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'Customer Service',
        areaServed: 'MK',
        availableLanguage: 'Macedonian',
      },
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'structured-data-organization';
    script.text = JSON.stringify(schemaData, null, 0);
    document.head.appendChild(script);

    return () => {
      const existingScript = document.getElementById('structured-data-organization');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  return null;
}
