import type { Metadata } from 'next';

import type { SearchMetadataResponse } from '@/lib/api';
import { POPULAR_BRANDS, POPULAR_MODELS_BY_BRAND } from '@/lib/content/popular-brands';
import type { Locale, Translations } from '@/lib/i18n';
import { isSiteNoindex } from '@/lib/robots-metadata';
import {
  appendTireCanonicalParams,
  isIndexableVehicleTypeParam,
} from '@/lib/search/home-page-indexable-params';
import { localizeAbsoluteUrl } from '@/lib/url-locale';
import { createSlug, slugToName } from '@/lib/utils';

export function getHomeMetaDescription(
  metadataFromApi: SearchMetadataResponse,
  title: string,
  baseTitle: string,
  brandParam: string | string[] | undefined,
  modelParam: string | string[] | undefined,
  t: Translations,
): string {
  if (metadataFromApi.description) return metadataFromApi.description;
  if (title === baseTitle) return t.metadata.site.homePageDescription;
  const brandParamValue = typeof brandParam === 'string' ? brandParam : null;
  const modelParamValue = typeof modelParam === 'string' ? modelParam : null;
  const apiBrandName = metadataFromApi.brandName;
  const apiModelName =
    metadataFromApi.modelNames && metadataFromApi.modelNames.length === 1
      ? metadataFromApi.modelNames[0]
      : undefined;
  if (apiBrandName && apiModelName) {
    return t.metadata.site.homePageDescriptionWithBrandModel
      .replaceAll('{brand}', apiBrandName)
      .replaceAll('{model}', apiModelName);
  }
  if (apiBrandName) {
    return t.metadata.site.homePageDescriptionWithBrand.replaceAll('{brand}', apiBrandName);
  }
  if (brandParamValue?.includes(',')) return t.metadata.site.homePageDescription;
  if (modelParamValue && brandParamValue) {
    const brandName =
      POPULAR_BRANDS.find((b) => createSlug(b) === brandParamValue.toLowerCase()) ||
      brandParamValue;
    const models = POPULAR_MODELS_BY_BRAND[brandName] || [];
    const modelSlugFallback = modelParamValue.split(',')[0]?.trim() ?? modelParamValue;
    const modelName =
      models.find((m) => createSlug(m) === modelSlugFallback.toLowerCase()) ||
      slugToName(modelSlugFallback);
    return t.metadata.site.homePageDescriptionWithBrandModel
      .replaceAll('{brand}', brandName)
      .replaceAll('{model}', modelName);
  }
  const brandName = brandParamValue
    ? POPULAR_BRANDS.find((b) => createSlug(b) === brandParamValue.toLowerCase()) || brandParamValue
    : title;
  return t.metadata.site.homePageDescriptionWithBrand.replaceAll('{brand}', brandName);
}

function applyVehicleBrandModelPathCanonical(
  siteUrl: string,
  canonicalUrl: string,
  opts: {
    isTire: boolean;
    hasNonIndexableParams: boolean;
    brandParam: string | string[] | undefined;
    modelParam: string | string[] | undefined;
    bodyTypesParam: string | string[] | undefined;
    vehicleTypeParam: string | string[] | undefined;
  },
): string {
  const brandOnlyString = typeof opts.brandParam === 'string' ? opts.brandParam : '';
  const modelOnlyString = typeof opts.modelParam === 'string' ? opts.modelParam : '';
  const canUsePathCanonical =
    !opts.isTire &&
    !opts.hasNonIndexableParams &&
    brandOnlyString &&
    !brandOnlyString.includes(',') &&
    (!modelOnlyString || !modelOnlyString.includes(',')) &&
    !opts.bodyTypesParam;

  if (!canUsePathCanonical) {
    return canonicalUrl;
  }

  const vtQs =
    isIndexableVehicleTypeParam(opts.vehicleTypeParam) && opts.vehicleTypeParam !== 'car'
      ? `?vehicleType=${opts.vehicleTypeParam}`
      : '';
  if (modelOnlyString && modelOnlyString.trim() !== '') {
    return `${siteUrl}/${encodeURIComponent(brandOnlyString)}/${encodeURIComponent(modelOnlyString)}${vtQs}`;
  }
  return `${siteUrl}/${encodeURIComponent(brandOnlyString)}${vtQs}`;
}

export function buildHomeMetaUrls(
  siteUrl: string,
  params: Record<string, string | string[] | undefined>,
  hasNonIndexableParams: boolean,
  safePage: number,
): { urlSuffix: string; canonicalUrl: string; canonicalParams: URLSearchParams } {
  const brandParam = params.brand;
  const modelParam = params.model;
  const vehicleTypeParam = params.vehicleType;
  const bodyTypesParam = params.body_types;
  const categoryParam = params.category;
  const isTire = typeof categoryParam === 'string' && categoryParam === 'tire';

  const queryParams = new URLSearchParams();
  if (isTire) {
    queryParams.set('category', 'tire');
    appendTireCanonicalParams(params, queryParams);
  } else {
    if (brandParam && typeof brandParam === 'string') queryParams.set('brand', brandParam);
    if (modelParam && typeof modelParam === 'string') queryParams.set('model', modelParam);
    if (isIndexableVehicleTypeParam(vehicleTypeParam))
      queryParams.set('vehicleType', vehicleTypeParam);
    if (bodyTypesParam && typeof bodyTypesParam === 'string') {
      queryParams.set('body_types', bodyTypesParam);
    }
  }
  if (!hasNonIndexableParams && safePage > 1) queryParams.set('page', String(safePage));
  const queryString = queryParams.toString();
  const urlSuffix = queryString ? `?${queryString}` : '';
  const canonicalParams = new URLSearchParams();
  if (isTire) {
    canonicalParams.set('category', 'tire');
    appendTireCanonicalParams(params, canonicalParams);
  } else {
    if (brandParam && typeof brandParam === 'string') canonicalParams.set('brand', brandParam);
    if (modelParam && typeof modelParam === 'string') canonicalParams.set('model', modelParam);
    if (isIndexableVehicleTypeParam(vehicleTypeParam))
      canonicalParams.set('vehicleType', vehicleTypeParam);
    if (bodyTypesParam && typeof bodyTypesParam === 'string') {
      canonicalParams.set('body_types', bodyTypesParam);
    }
  }
  const canonicalQuery = canonicalParams.toString();
  const defaultCanonicalUrl = `${siteUrl}/${canonicalQuery ? `?${canonicalQuery}` : ''}`;
  const canonicalUrl = applyVehicleBrandModelPathCanonical(siteUrl, defaultCanonicalUrl, {
    isTire,
    hasNonIndexableParams,
    brandParam,
    modelParam,
    bodyTypesParam,
    vehicleTypeParam,
  });

  return { urlSuffix, canonicalUrl, canonicalParams };
}

export function getHomePrevNextUrls(
  siteUrl: string,
  hasNonIndexableParams: boolean,
  safePage: number,
  canonicalParams: URLSearchParams,
  totalPages: number,
  locale: Locale,
): { prevUrl?: string; nextUrl?: string } {
  let prevUrl: string | undefined;
  let nextUrl: string | undefined;
  if (!hasNonIndexableParams && safePage > 1) {
    const prevParams = new URLSearchParams(canonicalParams.toString());
    if (safePage - 1 > 1) prevParams.set('page', String(safePage - 1));
    const prevQuery = prevParams.toString();
    prevUrl = localizeAbsoluteUrl(`${siteUrl}/${prevQuery ? `?${prevQuery}` : ''}`, locale);
  }
  if (!hasNonIndexableParams && totalPages > 0 && safePage < totalPages) {
    const nextParams = new URLSearchParams(canonicalParams.toString());
    nextParams.set('page', String(safePage + 1));
    const nextQuery = nextParams.toString();
    nextUrl = localizeAbsoluteUrl(`${siteUrl}/${nextQuery ? `?${nextQuery}` : ''}`, locale);
  }
  return { prevUrl, nextUrl };
}

export function buildHomeMetadata(
  fullTitle: string,
  description: string,
  title: string,
  canonicalUrl: string,
  languages: Record<string, string> | undefined,
  ogUrl: string,
  hasNonIndexableParams: boolean,
  prevUrl: string | undefined,
  nextUrl: string | undefined,
  t: Translations,
  site: { url: string; name: string; locale: string },
): Metadata {
  return {
    title: { absolute: fullTitle },
    description,
    keywords: [title, ...t.metadata.site.keywords],
    robots:
      hasNonIndexableParams || isSiteNoindex()
        ? {
            index: false,
            follow: false,
            googleBot: { index: false, follow: false },
          }
        : undefined,
    openGraph: {
      type: 'website',
      url: ogUrl,
      title: fullTitle,
      description,
      images: [{ url: `${site.url}/og-image.jpg`, width: 1200, height: 630, alt: site.name }],
      siteName: site.name,
      locale: site.locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [{ url: `${site.url}/og-image.jpg`, alt: site.name }],
    },
    alternates: {
      canonical: canonicalUrl,
      ...(languages ? { languages } : {}),
      ...(prevUrl ? { prev: prevUrl } : {}),
      ...(nextUrl ? { next: nextUrl } : {}),
    },
  };
}
