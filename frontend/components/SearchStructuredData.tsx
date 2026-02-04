import type { Listing } from '@/lib/api';
import { getMetadataLocale, getServerTranslations } from '@/lib/i18n';
import { POPULAR_BRANDS, POPULAR_MODELS_BY_BRAND } from '@/lib/popular-brands';
import { loadSiteConfigSync } from '@/lib/site-config';
import { createSlug, getCountry } from '@/lib/utils';

export async function SearchStructuredData({
  brand,
  model,
  listings,
  maxItems = 12,
}: {
  brand?: string | null;
  model?: string | null;
  listings?: Listing[];
  maxItems?: number;
}) {
  const country = getCountry();
  const siteConfig = loadSiteConfigSync(country);
  const locale = await getMetadataLocale();
  const t = getServerTranslations(locale);
  const siteUrl = siteConfig.siteUrl;
  const brandParam = brand || null;
  const modelParam = model || null;
  const localeTag = `${locale}-${siteConfig.locale.split('-')[1] || 'MD'}` as `${string}-${string}`;

  const itemListElements: Array<{
    '@type': string;
    position: number;
    name: string;
    item: string;
  }> = [
    {
      '@type': 'ListItem',
      position: 1,
      name: t.breadcrumbs.home,
      item: siteUrl,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: t.home.title,
      item: `${siteUrl}/`,
    },
  ];

  if (brandParam) {
    const brandName =
      POPULAR_BRANDS.find((b) => createSlug(b) === brandParam.toLowerCase()) || brandParam;
    itemListElements.push({
      '@type': 'ListItem',
      position: itemListElements.length + 1,
      name: brandName,
      item: `${siteUrl}/?brand=${brandParam}`,
    });
  }

  if (modelParam && brandParam) {
    const brandName =
      POPULAR_BRANDS.find((b) => createSlug(b) === brandParam.toLowerCase()) || brandParam;
    const models = POPULAR_MODELS_BY_BRAND[brandName] || [];
    const modelName = models.find((m) => createSlug(m) === modelParam.toLowerCase()) || modelParam;
    itemListElements.push({
      '@type': 'ListItem',
      position: itemListElements.length + 1,
      name: modelName,
      item: `${siteUrl}/?brand=${brandParam}&model=${modelParam}`,
    });
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: itemListElements,
  };

  const potentialActions: Array<{
    '@type': string;
    target: {
      '@type': string;
      urlTemplate: string;
      inLanguage: string;
    };
    result: {
      '@type': string;
      name: string;
    };
  }> = [];

  if (!brandParam) {
    POPULAR_BRANDS.forEach((brand) => {
      const brandSlug = createSlug(brand);
      potentialActions.push({
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${siteUrl}/?brand=${brandSlug}`,
          inLanguage: localeTag,
        },
        result: {
          '@type': 'ItemList',
          name: `${brand} ${t.home.title}`,
        },
      });
    });
  } else if (!modelParam) {
    const brandName = POPULAR_BRANDS.find((b) => createSlug(b) === brandParam.toLowerCase());
    if (brandName) {
      const models = POPULAR_MODELS_BY_BRAND[brandName] || [];
      models.forEach((model) => {
        const modelSlug = createSlug(model);
        potentialActions.push({
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${siteUrl}/?brand=${brandParam}&model=${modelSlug}`,
            inLanguage: localeTag,
          },
          result: {
            '@type': 'ItemList',
            name: `${brandName} ${model}`,
          },
        });
      });
    }
  }

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteUrl,
    potentialAction: potentialActions.length > 0 ? potentialActions : undefined,
  };

  const itemListSchema: {
    '@context': 'https://schema.org';
    '@type': 'ItemList';
    numberOfItems: number;
    itemListElement: Array<{
      '@type': 'ListItem';
      position: number;
      url: string;
      name: string;
    }>;
  } | null =
    listings && listings.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          numberOfItems: Math.min(listings.length, maxItems),
          itemListElement: listings.slice(0, maxItems).map((listing, idx) => ({
            '@type': 'ListItem',
            position: idx + 1,
            url: `${siteUrl}/listings/${listing.id}`,
            name: listing.title || `${siteUrl}/listings/${listing.id}`,
          })),
        }
      : null;

  let collectionPageSchema: Record<string, unknown> | null = null;
  if (brandParam || modelParam) {
    const brandName = brandParam
      ? POPULAR_BRANDS.find((b) => createSlug(b) === brandParam.toLowerCase()) || brandParam
      : null;
    const modelName =
      modelParam && brandName
        ? POPULAR_MODELS_BY_BRAND[brandName]?.find(
            (m) => createSlug(m) === modelParam.toLowerCase()
          ) || modelParam
        : null;

    let pageTitle = t.metadata.site.defaultTitle;
    let pageDescription = t.metadata.site.defaultDescription;

    if (modelName && brandName) {
      pageTitle = `${brandName} ${modelName} - ${t.metadata.site.defaultTitle}`;
      pageDescription = t.metadata.site.homePageDescriptionWithBrandModel
        .replace('{brand}', brandName)
        .replace('{model}', modelName);
    } else if (brandName) {
      pageTitle = `${brandName} - ${t.metadata.site.defaultTitle}`;
      pageDescription = t.metadata.site.homePageDescriptionWithBrand.replace('{brand}', brandName);
    }

    collectionPageSchema = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: pageTitle,
      description: pageDescription,
      url:
        brandParam && modelParam
          ? `${siteUrl}/?brand=${brandParam}&model=${modelParam}`
          : brandParam
            ? `${siteUrl}/?brand=${brandParam}`
            : siteUrl,
      breadcrumb: breadcrumbSchema,
      mainEntity: {
        '@type': 'ItemList',
        name: pageTitle,
        description: pageDescription,
        itemListElement: itemListSchema?.itemListElement,
      },
    };
  }

  return (
    <>
      <script
        id="structured-data-search-breadcrumb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {potentialActions.length > 0 && (
        <script
          id="structured-data-search-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      )}
      {itemListSchema && (
        <script
          id="structured-data-search-itemlist"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
        />
      )}
      {collectionPageSchema && (
        <script
          id="structured-data-search-collection"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageSchema) }}
        />
      )}
    </>
  );
}
