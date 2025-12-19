import { loadSiteConfigSync } from '@/lib/site-config';

export function OrganizationSchema() {
  const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';
  const siteConfig = loadSiteConfigSync(country);

  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.siteUrl,
    logo: `${siteConfig.siteUrl}/logo.png`,
    description:
      'Купете или продадете авто на Kupito! Објавете оглас бесплатно. Платформа за купување и продавање автомобили онлајн во Македонија. Автомобили огласи Македонија.',
    address: {
      '@type': 'PostalAddress',
      addressCountry: siteConfig.countryCode,
    },
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      areaServed: siteConfig.countryCode,
      availableLanguage: 'Macedonian',
    },
  };

  return (
    <script
      id="structured-data-organization"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}
