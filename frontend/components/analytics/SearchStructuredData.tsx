import Script from 'next/script';
import type { ReactNode } from 'react';

import type { Listing } from '@/lib/api';
import { POPULAR_BRANDS, POPULAR_MODELS_BY_BRAND } from '@/lib/content/popular-brands';
import { getServerTranslations, type Locale } from '@/lib/i18n';
import { loadSiteConfigSync } from '@/lib/site-config';
import { absoluteUrlWithLocalePrefix } from '@/lib/url-locale';
import { createSlug, getCountry, getListingHref, toSafeJsonLdHtml } from '@/lib/utils';

type BreadcrumbItem = { '@type': string; position: number; name: string; item: string };

export function buildBreadcrumbItemList(
  brandParam: string | null,
  modelParam: string | null,
  brandDisplayName: string | null,
  modelDisplayName: string | null,
  siteUrl: string,
  locale: Locale,
  t: ReturnType<typeof getServerTranslations>,
): BreadcrumbItem[] {
  const homeItem: BreadcrumbItem = {
    '@type': 'ListItem',
    position: 1,
    name: t.breadcrumbs.home,
    item: absoluteUrlWithLocalePrefix(siteUrl, '/', locale),
  };

  if (!brandParam) {
    return [homeItem];
  }

  const brandName =
    brandDisplayName ||
    POPULAR_BRANDS.find((b) => createSlug(b) === brandParam.toLowerCase()) ||
    brandParam;

  if (!modelParam) {
    return [
      homeItem,
      {
        '@type': 'ListItem',
        position: 2,
        name: brandName,
        item: absoluteUrlWithLocalePrefix(siteUrl, `/${encodeURIComponent(brandParam)}`, locale),
      },
    ];
  }

  const models = POPULAR_MODELS_BY_BRAND[brandName] || [];
  const modelName =
    modelDisplayName ||
    models.find((m) => createSlug(m) === modelParam.toLowerCase()) ||
    modelParam;

  return [
    homeItem,
    {
      '@type': 'ListItem',
      position: 2,
      name: brandName,
      item: absoluteUrlWithLocalePrefix(siteUrl, `/${encodeURIComponent(brandParam)}`, locale),
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: modelName,
      item: absoluteUrlWithLocalePrefix(
        siteUrl,
        `/${encodeURIComponent(brandParam)}/${encodeURIComponent(modelParam)}`,
        locale,
      ),
    },
  ];
}

function buildItemListSchema(
  listings: Listing[] | undefined,
  maxItems: number,
  siteUrl: string,
  locale: Locale,
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
      url: `${siteUrl}${getListingHref(listing, locale)}`,
      name: listing.title || `${siteUrl}${getListingHref(listing, locale)}`,
    })),
  };
}

function buildCollectionPageSchema(
  brandParam: string | null,
  modelParam: string | null,
  brandDisplayName: string | null,
  modelDisplayName: string | null,
  breadcrumbSchema: { '@context': string; '@type': string; itemListElement: BreadcrumbItem[] },
  itemListSchema: {
    itemListElement: Array<{ '@type': string; position: number; url: string; name: string }>;
  } | null,
  siteUrl: string,
  locale: Locale,
  t: ReturnType<typeof getServerTranslations>,
): Record<string, unknown> | null {
  if (!brandParam && !modelParam) return null;
  const brandName = brandParam
    ? brandDisplayName ||
      POPULAR_BRANDS.find((b) => createSlug(b) === brandParam.toLowerCase()) ||
      brandParam
    : null;
  const modelName =
    modelParam && brandName
      ? modelDisplayName ||
        POPULAR_MODELS_BY_BRAND[brandName]?.find(
          (m) => createSlug(m) === modelParam.toLowerCase(),
        ) ||
        modelParam
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
      ? absoluteUrlWithLocalePrefix(
          siteUrl,
          `/${encodeURIComponent(brandParam)}/${encodeURIComponent(modelParam)}`,
          locale,
        )
      : brandParam
        ? absoluteUrlWithLocalePrefix(siteUrl, `/${encodeURIComponent(brandParam)}`, locale)
        : absoluteUrlWithLocalePrefix(siteUrl, '/', locale);

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
  brandName,
  modelName,
  maxItems = 12,
  locale,
}: {
  brand?: string | null;
  model?: string | null;
  category?: string | null;
  listings?: Listing[];
  brandName?: string | null;
  modelName?: string | null;
  maxItems?: number;
  locale: Locale;
}): Promise<ReactNode> {
  const country = getCountry();
  const siteConfig = loadSiteConfigSync(country);
  const t = getServerTranslations(locale);
  const siteUrl = siteConfig.siteUrl;
  const brandParam = brand || null;
  const modelParam = model || null;
  const brandDisplayName = brandName || null;
  const modelDisplayName = modelName || null;

  if (category === 'tire') {
    const tireSearchUrl = absoluteUrlWithLocalePrefix(siteUrl, '/?category=tire', locale);
    const tireBreadcrumbItems = [
      {
        '@type': 'ListItem',
        position: 1,
        name: t.breadcrumbs.home,
        item: absoluteUrlWithLocalePrefix(siteUrl, '/', locale),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: t.searchFilters.tiresCategory,
        item: tireSearchUrl,
      },
    ] as BreadcrumbItem[];
    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: tireBreadcrumbItems,
    };
    const itemListSchema = buildItemListSchema(listings, maxItems, siteUrl, locale);
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

  const itemListElements = buildBreadcrumbItemList(
    brandParam,
    modelParam,
    brandDisplayName,
    modelDisplayName,
    siteUrl,
    locale,
    t,
  );
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: itemListElements,
  };

  const itemListSchema = buildItemListSchema(listings, maxItems, siteUrl, locale);
  const collectionPageSchema = buildCollectionPageSchema(
    brandParam,
    modelParam,
    brandDisplayName,
    modelDisplayName,
    breadcrumbSchema,
    itemListSchema,
    siteUrl,
    locale,
    t,
  );

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
