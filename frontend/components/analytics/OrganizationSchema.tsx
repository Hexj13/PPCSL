import { getVersionedAssetPath } from '@/lib/assets';
import { getServerTranslations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n-types';
import { resolveLocaleRouting } from '@/lib/locale-routing';
import { loadSiteConfigSync } from '@/lib/site-config';
import { absoluteUrlWithLocalePrefix } from '@/lib/url-locale';
import { getCountry, toSafeJsonLdHtml } from '@/lib/utils';

const SCHEMA_ORG_LANGUAGE_NAMES: Readonly<Record<string, string>> = {
  ro: 'Romanian',
  ru: 'Russian',
  en: 'English',
};

export async function OrganizationSchema({ locale }: { locale: Locale }) {
  const country = getCountry();
  const siteConfig = loadSiteConfigSync(country);
  const routing = resolveLocaleRouting(siteConfig);
  const t = getServerTranslations(locale);

  const sitePageUrl = absoluteUrlWithLocalePrefix(siteConfig.siteUrl, '/', locale);
  const logoUrl = `${siteConfig.siteUrl}${getVersionedAssetPath('/logo.png', siteConfig.assetVersion)}`;
  const availableLanguage = routing.supportedLocales.map(
    (code) => SCHEMA_ORG_LANGUAGE_NAMES[code.toLowerCase()] ?? code,
  );

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
      availableLanguage,
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
