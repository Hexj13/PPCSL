import type { Metadata } from 'next';
import { Suspense } from 'react';

import { BackgroundDecorations } from '@/components/BackgroundDecorations';
import { HomeHero } from '@/components/HomeHero';
import { ConversionEvent } from '@/components/analytics/ConversionEvent';
import { getSearchStructuredData } from '@/components/analytics/SearchStructuredData';
import { DynamicPageTitle } from '@/components/common/DynamicPageTitle';
import { ListingGrid } from '@/components/listing/ListingGrid';
import { ScrollToFiltersButton } from '@/components/search/ScrollToFiltersButton';
import { SearchFilters } from '@/components/search/SearchFilters';
import { SearchFiltersLimitToast } from '@/components/search/SearchFiltersLimitToast';
import {
  fetchBrands,
  fetchModelsByBrands,
  fetchSearchMetadata,
  fetchTireSearchMetadata,
  getListings,
  withListingGridDefaultLimit,
} from '@/lib/api';
import type { Brand } from '@/lib/api';
import { POPULAR_BRANDS, POPULAR_MODELS_BY_BRAND } from '@/lib/content/popular-brands';
import { getMetadataLocale, getServerTranslations, type Translations } from '@/lib/i18n';
import { getHomeHeroTitle } from '@/lib/search/home-hero-title';
import {
  hasNonIndexableHomeSearchParams,
  isIndexableVehicleTypeParam,
} from '@/lib/search/home-page-indexable-params';
import {
  buildHomeMetadata,
  buildHomeMetaUrls,
  getHomeMetaDescription,
  getHomePrevNextUrls,
} from '@/lib/search/home-page-metadata';
import { loadSiteConfigSync } from '@/lib/site-config';
import {
  canonicalForLocaleFromRo,
  homeOgAbsoluteUrl,
  hreflangLanguagesFromRoCanonical,
  isLanguageSwitcherEnabled,
} from '@/lib/url-locale';
import { createSlug, getCountry, slugMatches, slugToName } from '@/lib/utils';

export const revalidate = 30;

const country = getCountry();
const siteConfig = loadSiteConfigSync(country);
const siteUrl = siteConfig.siteUrl;

function getTranslationValue(translations: Translations, key: string): string {
  const keys = key.split('.');
  let value: unknown = translations;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }

  if (typeof value !== 'string') {
    return key;
  }

  return value;
}

function withVehicleTypeSuffix(title: string, vehicleTypeLabel: string): string {
  return vehicleTypeLabel ? `${title} | ${vehicleTypeLabel}` : title;
}

function getBodyTypesTitle(
  bodyTypes: string,
  vehicleTypeLabel: string,
  translations: Translations,
): string | null {
  const bodyTypeValues = bodyTypes
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (bodyTypeValues.length === 0) return null;
  const bodyTypeLabels = bodyTypeValues
    .map((bt) => {
      try {
        return getTranslationValue(translations, `vehicleOptions.bodyType.${bt}`);
      } catch {
        return null;
      }
    })
    .filter((label): label is string => Boolean(label));
  if (bodyTypeLabels.length === 0) return null;
  const bodyTypeTitle = bodyTypeLabels.join(', ');
  return withVehicleTypeSuffix(bodyTypeTitle, vehicleTypeLabel);
}

async function resolveTitleWithBrandsApi(
  brandSlugs: string[],
  modelSlugs: string[],
  vehicleTypeLabel: string,
  defaultTitle: string,
): Promise<string> {
  const allBrands = await fetchBrands();
  const foundBrands = brandSlugs
    .map((slug) => {
      const bySlug = allBrands.find((b) => createSlug(b.name) === slug);
      if (bySlug) return bySlug.name;
      const byName = allBrands.find((b) => b.name.toLowerCase() === slug);
      return byName?.name;
    })
    .filter((name): name is string => name !== undefined);

  if (foundBrands.length === 0) return defaultTitle;

  if (modelSlugs.length > 0 && foundBrands.length > 0) {
    const brandIds = foundBrands
      .map((brandName) => allBrands.find((b) => b.name === brandName)?.id)
      .filter((id): id is string => id !== undefined);

    if (brandIds.length > 0) {
      const modelsByBrand = await fetchModelsByBrands(brandIds);
      const parts: string[] = [];

      foundBrands.forEach((brandName) => {
        const brandId = allBrands.find((b) => b.name === brandName)?.id;
        const brandParts: string[] = [];

        if (brandId) {
          const brandModels = modelsByBrand[brandId] || [];
          modelSlugs.forEach((modelSlug) => {
            const model = brandModels.find(
              (m) =>
                m.name.toLowerCase() === modelSlug ||
                createSlug(m.name) === modelSlug ||
                slugMatches(modelSlug, m.name),
            );
            if (model) brandParts.push(`${brandName} ${model.name}`);
          });
        }

        if (brandParts.length === 0) {
          const popularModels = POPULAR_MODELS_BY_BRAND[brandName] || [];
          modelSlugs.forEach((modelSlug) => {
            const model = popularModels.find(
              (m) =>
                m.toLowerCase() === modelSlug ||
                createSlug(m) === modelSlug ||
                slugMatches(modelSlug, m),
            );
            if (model) brandParts.push(`${brandName} ${model}`);
          });
        }

        if (brandParts.length > 0) {
          parts.push(...brandParts);
        } else if (foundBrands.length === 1 && modelSlugs.length > 0) {
          parts.push(`${brandName} ${modelSlugs.map((s) => slugToName(s)).join(', ')}`);
        } else {
          parts.push(brandName);
        }
      });

      if (parts.length > 0) {
        return withVehicleTypeSuffix(parts.join(', '), vehicleTypeLabel);
      }
    }
  }

  const brandsTitle = foundBrands.length === 1 ? foundBrands[0] : foundBrands.join(', ');
  return withVehicleTypeSuffix(brandsTitle, vehicleTypeLabel);
}

function resolveTitleWithPopularBrands(
  brandSlugs: string[],
  modelSlugs: string[],
  vehicleTypeLabel: string,
  defaultTitle: string,
): string {
  const popularBrands = brandSlugs
    .map((slug) => POPULAR_BRANDS.find((b) => b.toLowerCase() === slug || createSlug(b) === slug))
    .filter((name): name is string => name !== undefined);

  if (popularBrands.length === 0) return defaultTitle;

  if (modelSlugs.length > 0 && popularBrands.length > 0) {
    const foundModels: string[] = [];
    popularBrands.forEach((brandName) => {
      const models = POPULAR_MODELS_BY_BRAND[brandName] || [];
      modelSlugs.forEach((modelSlug) => {
        const model = models.find(
          (m) =>
            m.toLowerCase() === modelSlug ||
            createSlug(m) === modelSlug ||
            slugMatches(modelSlug, m),
        );
        if (model) foundModels.push(`${brandName} ${model}`);
      });
    });

    if (foundModels.length > 0) {
      return withVehicleTypeSuffix(foundModels.join(', '), vehicleTypeLabel);
    }

    if (popularBrands.length === 1 && modelSlugs.length > 0) {
      const slugBasedTitle = `${popularBrands[0]} ${modelSlugs.map((s) => slugToName(s)).join(', ')}`;
      return withVehicleTypeSuffix(slugBasedTitle, vehicleTypeLabel);
    }
  }

  const popularBrandsTitle =
    popularBrands.length === 1 ? popularBrands[0] : popularBrands.join(', ');
  return withVehicleTypeSuffix(popularBrandsTitle, vehicleTypeLabel);
}

async function getTitleFromParams(
  brandParam: string | string[] | undefined,
  modelParam: string | string[] | undefined,
  bodyTypesParam: string | string[] | undefined,
  vehicleTypeParam: string | string[] | undefined,
  defaultTitle: string,
  translations: Translations,
): Promise<string> {
  const brand = typeof brandParam === 'string' ? brandParam : undefined;
  const model = typeof modelParam === 'string' ? modelParam : undefined;
  const bodyTypes = typeof bodyTypesParam === 'string' ? bodyTypesParam : undefined;
  const vehicleType =
    typeof vehicleTypeParam === 'string' && ['car', 'truck', 'moto'].includes(vehicleTypeParam)
      ? vehicleTypeParam
      : 'car';

  const key = `listings.vehicleTypeFull.${vehicleType}`;
  const vehicleTypeLabel =
    getTranslationValue(translations, key) === key ? '' : getTranslationValue(translations, key);

  if (bodyTypes && !brand && !model) {
    const bodyTitle = getBodyTypesTitle(bodyTypes, vehicleTypeLabel, translations);
    if (bodyTitle) return bodyTitle;
  }

  if (!brand && !model) {
    return vehicleTypeLabel ? vehicleTypeLabel : defaultTitle;
  }

  const brandSlugs = brand
    ? brand
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : [];
  const modelSlugs = model
    ? model
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : [];

  try {
    return await resolveTitleWithBrandsApi(brandSlugs, modelSlugs, vehicleTypeLabel, defaultTitle);
  } catch {
    return resolveTitleWithPopularBrands(brandSlugs, modelSlugs, vehicleTypeLabel, defaultTitle);
  }
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}): Promise<Metadata> {
  const locale = await getMetadataLocale();
  const t = getServerTranslations(locale);
  const homeSiteMeta = { url: siteUrl, name: siteConfig.name, locale: siteConfig.locale };
  const params = (await (searchParams ?? Promise.resolve(undefined))) ?? {};
  const pageParam = params.page;
  const page =
    typeof pageParam === 'string' && pageParam.trim() !== '' ? parseInt(pageParam, 10) : 1;
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const hasNonIndexableParams = hasNonIndexableHomeSearchParams(params);

  const isTireCategory = typeof params.category === 'string' && params.category === 'tire';

  const listings = await getListings(withListingGridDefaultLimit(params));
  const totalPages = listings?.meta?.totalPages ?? 0;

  if (isTireCategory) {
    const tiresBaseTitle = t.metadata.site.tiresDefaultTitle;
    const tireMeta = await fetchTireSearchMetadata({
      tire_brand_ids: typeof params.tire_brand_ids === 'string' ? params.tire_brand_ids : undefined,
      tire_model_ids: typeof params.tire_model_ids === 'string' ? params.tire_model_ids : undefined,
      locale,
    });
    const title = tireMeta.title ?? tiresBaseTitle;
    const tireTitleSegment =
      title === tiresBaseTitle ? tiresBaseTitle : `${title} | ${tiresBaseTitle}`;
    const fullTitle = `${tireTitleSegment} | ${siteConfig.name}`;
    const description = tireMeta.description ?? t.metadata.site.tiresHomePageDescription;
    const { urlSuffix, canonicalUrl, canonicalParams } = buildHomeMetaUrls(
      siteUrl,
      params,
      hasNonIndexableParams,
      safePage,
    );
    const roCanonical = canonicalUrl;
    const canonical = canonicalForLocaleFromRo(roCanonical, locale);
    const languages = isLanguageSwitcherEnabled()
      ? hreflangLanguagesFromRoCanonical(roCanonical)
      : undefined;
    const ogUrl = homeOgAbsoluteUrl(siteUrl, urlSuffix, locale);
    const { prevUrl, nextUrl } = getHomePrevNextUrls(
      siteUrl,
      hasNonIndexableParams,
      safePage,
      canonicalParams,
      totalPages,
      locale,
    );
    return buildHomeMetadata(
      fullTitle,
      description,
      title,
      canonical,
      languages,
      ogUrl,
      hasNonIndexableParams,
      prevUrl,
      nextUrl,
      t,
      homeSiteMeta,
    );
  }

  const brandParam = params.brand;
  const modelParam = params.model;
  const bodyTypesParam = params.body_types;
  const vehicleTypeParam = params.vehicleType;
  const baseTitle = t.metadata.site.defaultTitle;

  const vehicleType = (isIndexableVehicleTypeParam(vehicleTypeParam) ? vehicleTypeParam : 'car') as
    | 'car'
    | 'truck'
    | 'moto';
  const metadataFromApi = await fetchSearchMetadata({
    brand: typeof brandParam === 'string' ? brandParam : undefined,
    model: typeof modelParam === 'string' ? modelParam : undefined,
    vehicleType,
  });
  const title =
    metadataFromApi.title ??
    (await getTitleFromParams(
      brandParam,
      modelParam,
      bodyTypesParam,
      vehicleTypeParam,
      baseTitle,
      t,
    ));
  const vehicleTitleSegment = title === baseTitle ? baseTitle : `${title} | ${baseTitle}`;
  const fullTitle = `${vehicleTitleSegment} | ${siteConfig.name}`;

  const description = getHomeMetaDescription(
    metadataFromApi,
    title,
    baseTitle,
    brandParam,
    modelParam,
    t,
  );
  const { urlSuffix, canonicalUrl, canonicalParams } = buildHomeMetaUrls(
    siteUrl,
    params,
    hasNonIndexableParams,
    safePage,
  );
  const roCanonical = canonicalUrl;
  const canonical = canonicalForLocaleFromRo(roCanonical, locale);
  const languages = isLanguageSwitcherEnabled()
    ? hreflangLanguagesFromRoCanonical(roCanonical)
    : undefined;
  const ogUrl = homeOgAbsoluteUrl(siteUrl, urlSuffix, locale);
  const { prevUrl, nextUrl } = getHomePrevNextUrls(
    siteUrl,
    hasNonIndexableParams,
    safePage,
    canonicalParams,
    totalPages,
    locale,
  );
  return buildHomeMetadata(
    fullTitle,
    description,
    title,
    canonical,
    languages,
    ogUrl,
    hasNonIndexableParams,
    prevUrl,
    nextUrl,
    t,
    homeSiteMeta,
  );
}

function SearchFiltersWrapper({ initialBrands }: { initialBrands: Brand[] }) {
  return (
    <Suspense fallback={<div className="card p-4 md:p-5 mb-6 animate-pulse h-64" />}>
      <SearchFilters initialBrands={initialBrands} />
    </Suspense>
  );
}
function DynamicPageTitleWrapper() {
  return (
    <Suspense fallback={null}>
      <DynamicPageTitle />
    </Suspense>
  );
}

async function HomeContent({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}) {
  const locale = await getMetadataLocale();
  const t = getServerTranslations(locale);
  const params = (await (searchParams ?? Promise.resolve(undefined))) ?? {};
  const brand = typeof params.brand === 'string' ? params.brand : null;
  const model = typeof params.model === 'string' ? params.model : null;
  const category = typeof params.category === 'string' ? params.category : null;
  const initialData = await getListings(withListingGridDefaultLimit(params));
  const searchStructuredData = await getSearchStructuredData({
    brand,
    model,
    category,
    listings: initialData.data,
  });

  const heroTitle = await getHomeHeroTitle(params, t);

  const vehicleTypeParam = params.vehicleType;
  const vehicleTypeForBrands = (
    isIndexableVehicleTypeParam(vehicleTypeParam) ? vehicleTypeParam : 'car'
  ) as 'car' | 'truck' | 'moto';
  const initialBrands = await fetchBrands(vehicleTypeForBrands);

  return (
    <div>
      <BackgroundDecorations />
      <ConversionEvent />
      <SearchFiltersLimitToast />
      <DynamicPageTitleWrapper />
      <HomeHero
        title={heroTitle}
        subtitle={t.home.subtitle}
        subtitleBold={t.home.subtitleBold}
        subtitle2={t.home.subtitle2}
        subtitle3={t.home.subtitle3}
      />
      <SearchFiltersWrapper initialBrands={initialBrands} />
      <ListingGrid initialData={initialData} />
      <Suspense fallback={null}>
        <ScrollToFiltersButton />
      </Suspense>
      {searchStructuredData}
    </div>
  );
}

export default function Home({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="card animate-pulse h-40" />
          <div className="card p-4 md:p-5 animate-pulse h-64" />
          <div className="card animate-pulse h-96" />
        </div>
      }
    >
      <HomeContent searchParams={searchParams} />
    </Suspense>
  );
}
