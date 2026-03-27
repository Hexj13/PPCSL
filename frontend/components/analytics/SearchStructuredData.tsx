import Script from 'next/script';
import type { ReactNode } from 'react';

import type { Listing } from '@/lib/api';
import { POPULAR_BRANDS, POPULAR_MODELS_BY_BRAND } from '@/lib/content/popular-brands';
import { getMetadataLocale, getServerTranslations } from '@/lib/i18n';
import { loadSiteConfigSync } from '@/lib/site-config';
import { createSlug, getCountry, toSafeJsonLdHtml } from '@/lib/utils';

type BreadcrumbItem = { '@type': string; position: number; name: string; item: string };
type SearchActionItem = {
  '@type': string;
  target: { '@type': string; urlTemplate: string; inLanguage: string };
  result: { '@type': string; name: string };
};

function buildBreadcrumbItemList(
  brandParam: string | null,
  modelParam: string | null,
  siteUrl: string,
  t: ReturnType<typeof getServerTranslations>,
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    { '@type': 'ListItem', position: 1, name: t.breadcrumbs.home, item: siteUrl },
    { '@type': 'ListItem', position: 2, name: t.home.title, item: `${siteUrl}/` },
  ];
  if (brandParam) {
    const brandName =
      POPULAR_BRANDS.find((b) => createSlug(b) === brandParam.toLowerCase()) || brandParam;
    items.push({
      '@type': 'ListItem',
      position: items.length + 1,
      name: brandName,
      item: `${siteUrl}/?brand=${brandParam}`,
    });
  }
  if (modelParam && brandParam) {
    const brandName =
      POPULAR_BRANDS.find((b) => createSlug(b) === brandParam.toLowerCase()) || brandParam;
    const models = POPULAR_MODELS_BY_BRAND[brandName] || [];
    const modelName = models.find((m) => createSlug(m) === modelParam.toLowerCase()) || modelParam;
    items.push({
      '@type': 'ListItem',
      position: items.length + 1,
      name: modelName,
      item: `${siteUrl}/?brand=${brandParam}&model=${modelParam}`,
    });
  }
  return items;
}

function buildPotentialActions(
  brandParam: string | null,
  modelParam: string | null,
  siteUrl: string,
  localeTag: `${string}-${string}`,
  t: ReturnType<typeof getServerTranslations>,
): SearchActionItem[] {
  const actions: SearchActionItem[] = [];
  if (!brandParam) {
    POPULAR_BRANDS.forEach((brand) => {
      actions.push({
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${siteUrl}/?brand=${createSlug(brand)}`,
          inLanguage: localeTag,
        },
        result: { '@type': 'ItemList', name: `${brand} ${t.home.title}` },
      });
    });
    return actions;
  }
  if (!modelParam) {
    const brandName = POPULAR_BRANDS.find((b) => createSlug(b) === brandParam.toLowerCase());
    if (brandName) {
      const models = POPULAR_MODELS_BY_BRAND[brandName] || [];
      models.forEach((model) => {
        actions.push({
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${siteUrl}/?brand=${brandParam}&model=${createSlug(model)}`,
            inLanguage: localeTag,
          },
          result: { '@type': 'ItemList', name: `${brandName} ${model}` },
        });
      });
    }
  }
  return actions;
}

function buildItemListSchema(
  listings: Listing[] | undefined,
  maxItems: number,
  siteUrl: string,
): {
  '@context': string;
  '@type': string;
  numberOfItems: number;
  itemListElement: Array<{ '@type': string; position: number; url: string; name: string }>;
} | null {
  if (!listings || listings.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: Math.min(listings.length, maxItems),
    itemListElement: listings.slice(0, maxItems).map((listing, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `${siteUrl}/listings/${listing.id}`,
      name: listing.title || `${siteUrl}/listings/${listing.id}`,
    })),
  };
}

function buildCollectionPageSchema(
  brandParam: string | null,
  modelParam: string | null,
  breadcrumbSchema: { '@context': string; '@type': string; itemListElement: BreadcrumbItem[] },
  itemListSchema: {
    itemListElement: Array<{ '@type': string; position: number; url: string; name: string }>;
  } | null,
  siteUrl: string,
  t: ReturnType<typeof getServerTranslations>,
): Record<string, unknown> | null {
  if (!brandParam && !modelParam) return null;
  const brandName = brandParam
    ? POPULAR_BRANDS.find((b) => createSlug(b) === brandParam.toLowerCase()) || brandParam
    : null;
  const modelName =
    modelParam && brandName
      ? POPULAR_MODELS_BY_BRAND[brandName]?.find(
          (m) => createSlug(m) === modelParam.toLowerCase(),
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

  const url =
    brandParam && modelParam
      ? `${siteUrl}/?brand=${brandParam}&model=${modelParam}`
      : brandParam
        ? `${siteUrl}/?brand=${brandParam}`
        : siteUrl;

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: pageTitle,
    description: pageDescription,
    url,
    breadcrumb: breadcrumbSchema,
    mainEntity: {
      '@type': 'ItemList',
      name: pageTitle,
      description: pageDescription,
      itemListElement: itemListSchema?.itemListElement,
    },
  };
}

export async function getSearchStructuredData({
  brand,
  model,
  category,
  listings,
  maxItems = 12,
}: {
  brand?: string | null;
  model?: string | null;
  category?: string | null;
  listings?: Listing[];
  maxItems?: number;
}): Promise<ReactNode> {
  const country = getCountry();
  const siteConfig = loadSiteConfigSync(country);
  const locale = await getMetadataLocale();
  const t = getServerTranslations(locale);
  const siteUrl = siteConfig.siteUrl;
  const brandParam = brand || null;
  const modelParam = model || null;
  const localeTag = `${locale}-${siteConfig.locale.split('-')[1] || 'MD'}` as `${string}-${string}`;

  if (category === 'tire') {
    const tireBreadcrumbItems = [
      { '@type': 'ListItem', position: 1, name: t.breadcrumbs.home, item: siteUrl },
      { '@type': 'ListItem', position: 2, name: t.home.title, item: `${siteUrl}/` },
    ] as BreadcrumbItem[];
    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: tireBreadcrumbItems,
    };
    const itemListSchema = buildItemListSchema(listings, maxItems, siteUrl);
    return (
      <>
        <Script
          id="structured-data-search-breadcrumb"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toSafeJsonLdHtml(breadcrumbSchema) }}
        />
        {itemListSchema && (
          <Script
            id="structured-data-search-itemlist"
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: toSafeJsonLdHtml(itemListSchema) }}
          />
        )}
      </>
    );
  }

  const itemListElements = buildBreadcrumbItemList(brandParam, modelParam, siteUrl, t);
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: itemListElements,
  };

  const potentialActions = buildPotentialActions(brandParam, modelParam, siteUrl, localeTag, t);
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteUrl,
    potentialAction: potentialActions.length > 0 ? potentialActions : undefined,
  };

  const itemListSchema = buildItemListSchema(listings, maxItems, siteUrl);
  const collectionPageSchema = buildCollectionPageSchema(
    brandParam,
    modelParam,
    breadcrumbSchema,
    itemListSchema,
    siteUrl,
    t,
  );

  return (
    <>
      <Script
        id="structured-data-search-breadcrumb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toSafeJsonLdHtml(breadcrumbSchema) }}
      />
      {potentialActions.length > 0 && (
        <Script
          id="structured-data-search-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toSafeJsonLdHtml(websiteSchema) }}
        />
      )}
      {itemListSchema && (
        <Script
          id="structured-data-search-itemlist"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toSafeJsonLdHtml(itemListSchema) }}
        />
      )}
      {collectionPageSchema && (
        <Script
          id="structured-data-search-collection"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toSafeJsonLdHtml(collectionPageSchema) }}
        />
      )}
    </>
  );
}
