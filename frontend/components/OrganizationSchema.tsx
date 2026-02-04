import { getMetadataLocale, getServerTranslations } from '@/lib/i18n';
import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils';

export async function OrganizationSchema() {
  const country = getCountry();
  const siteConfig = loadSiteConfigSync(country);
  const locale = await getMetadataLocale();
  const t = getServerTranslations(locale);

  const localeTag = siteConfig.locale;
  const languageNames: Record<string, string> = {
    'ro-MD': 'Romanian',
    'ru-MD': 'Russian',
  };
  const availableLanguage = languageNames[localeTag] || 'Romanian';

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
