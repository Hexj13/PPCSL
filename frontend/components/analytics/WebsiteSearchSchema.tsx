import { getMetadataLocale } from '@/lib/i18n';
import { loadSiteConfigSync } from '@/lib/site-config';
import { absoluteUrlWithLocalePrefix } from '@/lib/url-locale';
import { getCountry, toSafeJsonLdHtml } from '@/lib/utils';

export async function WebsiteSearchSchema() {
  const siteConfig = loadSiteConfigSync(getCountry());
  const siteUrl = siteConfig.siteUrl;
  const locale = await getMetadataLocale();
  const sitePageUrl = absoluteUrlWithLocalePrefix(siteUrl, '/', locale);
  const searchTemplate = absoluteUrlWithLocalePrefix(
    siteUrl,
    '/?title={search_term_string}',
    locale,
  );
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: sitePageUrl,
    inLanguage: locale,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: searchTemplate,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      id="structured-data-website-search"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: toSafeJsonLdHtml(schemaData) }}
    />
  );
}
