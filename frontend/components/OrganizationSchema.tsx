import { getServerTranslations } from '@/lib/i18n';
import { loadSiteConfigSync } from '@/lib/site-config';

export function OrganizationSchema() {
  const country = process.env.NEXT_PUBLIC_COUNTRY || 'md';
  const siteConfig = loadSiteConfigSync(country);
  const t = getServerTranslations();

  const locale = siteConfig.locale;
  const languageNames: Record<string, string> = {
    'ro-MD': 'Romanian',
    'ru-MD': 'Russian',
  };
  const availableLanguage = languageNames[locale] || 'Romanian';

  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.siteUrl,
    logo: `${siteConfig.siteUrl}/logo.png`,
    description: t.metadata.site.organizationDescription,
    address: {
      '@type': 'PostalAddress',
      addressCountry: siteConfig.countryCode,
    },
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      areaServed: siteConfig.countryCode,
      availableLanguage,
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
