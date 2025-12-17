export function OrganizationSchema() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.club';

  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Kupito',
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    description:
      'Купете или продадете авто на Kupito! Објавете оглас бесплатно. Платформа за купување и продавање автомобили онлајн во Македонија. Автомобили огласи Македонија.',
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

  return (
    <script
      id="structured-data-organization"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}
