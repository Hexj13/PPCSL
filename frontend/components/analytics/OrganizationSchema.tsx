import { getVersionedAssetPath } from '@/lib/assets';
import { getMetadataLocale, getServerTranslations } from '@/lib/i18n';
import { loadSiteConfigSync } from '@/lib/site-config';
import { absoluteUrlWithLocalePrefix } from '@/lib/url-locale';
import { getCountry, toSafeJsonLdHtml } from '@/lib/utils';

export async function OrganizationSchema() {
  const country = getCountry();
  const siteConfig = loadSiteConfigSync(country);
  const locale = await getMetadataLocale();
  const t = getServerTranslations(locale);

  const sitePageUrl = absoluteUrlWithLocalePrefix(siteConfig.siteUrl, '/', locale);
  const logoUrl = `${siteConfig.siteUrl}${getVersionedAssetPath('/logo.png', siteConfig.assetVersion)}`;

  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: sitePageUrl,
    inLanguage: locale,
    logo: logoUrl,
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
      availableLanguage: ['Romanian', 'Russian'],
    },
  };

  return (
    <script
      id="structured-data-organization"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: toSafeJsonLdHtml(schemaData) }}
    />
  );
}
