import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

import { BackgroundDecorations } from '@/components/BackgroundDecorations';
import { HomeHero } from '@/components/HomeHero';
import { ConversionEvent } from '@/components/analytics/ConversionEvent';
import { getSearchStructuredData } from '@/components/analytics/SearchStructuredData';
import { DynamicPageTitle } from '@/components/common/DynamicPageTitle';
import { ListingGrid } from '@/components/listing/ListingGrid';
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
import { getMetadataLocaleFromParams, getServerTranslations, type Translations } from '@/lib/i18n';
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
import {
  buildHomeBrandTitle,
  buildHomeCategoryTitle,
  createSlug,
  getCountry,
  slugMatches,
  slugToName,
  type HomePageCategory,
} from '@/lib/utils';

const SearchFilters = dynamic(
  () => import('@/components/search/SearchFilters').then((mod) => mod.SearchFilters),
  {
    loading: () => <div className="card p-4 md:p-5 mb-6 animate-pulse h-64" />,
  },
);

const ScrollToFiltersButton = dynamic(
  () =>
    import('@/components/search/ScrollToFiltersButton').then((mod) => mod.ScrollToFiltersButton),
  { loading: () => null },
);

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

async function resolveTitleValueWithBrandsApi(
  brandSlugs: string[],
  modelSlugs: string[],
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
        return parts.join(', ');
      }
    }
  }

  const brandsTitle = foundBrands.length === 1 ? foundBrands[0] : foundBrands.join(', ');
  return brandsTitle;
}

function resolveTitleValueWithPopularBrands(
  brandSlugs: string[],
  modelSlugs: string[],
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
      return foundModels.join(', ');
    }

    if (popularBrands.length === 1 && modelSlugs.length > 0) {
      return `${popularBrands[0]} ${modelSlugs.map((s) => slugToName(s)).join(', ')}`;
    }
  }

  const popularBrandsTitle =
    popularBrands.length === 1 ? popularBrands[0] : popularBrands.join(', ');
  return popularBrandsTitle;
}

type ResolvedHomeTitle = {
  title: string;
  value: string | null;
};

async function getTitleFromParams(
  brandParam: string | string[] | undefined,
  modelParam: string | string[] | undefined,
  bodyTypesParam: string | string[] | undefined,
  vehicleTypeParam: string | string[] | undefined,
  defaultTitle: string,
  translations: Translations,
): Promise<ResolvedHomeTitle> {
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
    const bodyTitleValue = getBodyTypesTitle(bodyTypes, '', translations);
    if (bodyTitleValue) {
      return {
        title: withVehicleTypeSuffix(bodyTitleValue, vehicleTypeLabel),
        value: bodyTitleValue,
      };
    }
  }

  if (!brand && !model) {
    return {
      title: vehicleTypeLabel ? vehicleTypeLabel : defaultTitle,
      value: null,
    };
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
    const value = await resolveTitleValueWithBrandsApi(brandSlugs, modelSlugs, '');
    if (value) {
      return {
        title: withVehicleTypeSuffix(value, vehicleTypeLabel),
        value,
      };
    }
  } catch {
    const value = resolveTitleValueWithPopularBrands(brandSlugs, modelSlugs, '');
    if (value) {
      return {
        title: withVehicleTypeSuffix(value, vehicleTypeLabel),
        value,
      };
    }
  }

  return {
    title: defaultTitle,
    value: null,
  };
}

function buildFullHomeSeoTitle(
  translations: Translations,
  category: HomePageCategory,
  value: string | null,
): string {
  const tFn = (key: string) => getTranslationValue(translations, key);
  if (value) {
    return buildHomeBrandTitle(tFn, value);
  }
  return buildHomeCategoryTitle(tFn, category);
}

function getHomePageCategory(
  isTireCategory: boolean,
  vehicleType: 'car' | 'truck' | 'moto',
): HomePageCategory {
  if (isTireCategory) return 'tire';
  return vehicleType;
}

export async function generateMetadata({
  params: routeParams,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}): Promise<Metadata> {
  const locale = await getMetadataLocaleFromParams(routeParams);
  const t = getServerTranslations(locale);
  const homeSiteMeta = { url: siteUrl, name: siteConfig.name, locale: siteConfig.locale };
  const sp = (await (searchParams ?? Promise.resolve(undefined))) ?? {};
  const pageParam = sp.page;
  const page =
    typeof pageParam === 'string' && pageParam.trim() !== '' ? parseInt(pageParam, 10) : 1;
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const hasNonIndexableParams = hasNonIndexableHomeSearchParams(sp);

  const isTireCategory = typeof sp.category === 'string' && sp.category === 'tire';

  const listings = await getListings(withListingGridDefaultLimit(sp));
  const totalPages = listings?.meta?.totalPages ?? 0;

  if (isTireCategory) {
    const tiresBaseTitle = t.metadata.site.tiresDefaultTitle;
    const tireMeta = await fetchTireSearchMetadata({
      tire_brand_ids: typeof sp.tire_brand_ids === 'string' ? sp.tire_brand_ids : undefined,
      tire_model_ids: typeof sp.tire_model_ids === 'string' ? sp.tire_model_ids : undefined,
      locale,
    });
    const title = tireMeta.title ?? tiresBaseTitle;
    const homeCategory: HomePageCategory = 'tire';
    const titleValue = tireMeta.title ?? null;
    const fullTitle = buildFullHomeSeoTitle(t, homeCategory, titleValue);
    const description = tireMeta.description ?? t.metadata.site.tiresHomePageDescription;
    const { urlSuffix, canonicalUrl, canonicalParams } = buildHomeMetaUrls(
      siteUrl,
      sp,
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

  const brandParam = sp.brand;
  const modelParam = sp.model;
  const bodyTypesParam = sp.body_types;
  const vehicleTypeParam = sp.vehicleType;
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
  const resolvedTitle = metadataFromApi.title
    ? { title: metadataFromApi.title, value: metadataFromApi.title }
    : await getTitleFromParams(
        brandParam,
        modelParam,
        bodyTypesParam,
        vehicleTypeParam,
        baseTitle,
        t,
      );
  const title = resolvedTitle.title;
  const homeCategory = getHomePageCategory(false, vehicleType);
  const titleValue = resolvedTitle.value;
  const fullTitle = buildFullHomeSeoTitle(t, homeCategory, titleValue);

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
    sp,
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
  locale,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
  locale: Awaited<ReturnType<typeof getMetadataLocaleFromParams>>;
}) {
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
    locale,
  });

  const heroTitle = await getHomeHeroTitle(params, t);

  const vehicleTypeParam = params.vehicleType;
  const vehicleTypeForBrands = (
    isIndexableVehicleTypeParam(vehicleTypeParam) ? vehicleTypeParam : 'car'
  ) as 'car' | 'truck' | 'moto';
  const homeCategory = getHomePageCategory(category === 'tire', vehicleTypeForBrands);
  const heroCategoryWord = t.home.heroCategory[homeCategory];
  const subtitleWithCategory = t.home.subtitle.replaceAll('{category}', heroCategoryWord);
  const subtitle2WithCategory = t.home.subtitle2.replaceAll('{category}', heroCategoryWord);
  const initialBrands = await fetchBrands(vehicleTypeForBrands);

  return (
    <div>
      <BackgroundDecorations />
      <ConversionEvent />
      <SearchFiltersLimitToast />
      <DynamicPageTitleWrapper />
      <HomeHero
        title={heroTitle}
        subtitle={subtitleWithCategory}
        subtitleBold={t.home.subtitleBold}
        subtitle2={subtitle2WithCategory}
        subtitle3={t.home.subtitle3}
        descriptionIntro={t.home.descriptionIntro}
        descriptionDetails={t.home.descriptionDetails}
        expandLabel={t.home.descriptionExpand}
        collapseLabel={t.home.descriptionCollapse}
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

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}) {
  const locale = await getMetadataLocaleFromParams(params);

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
      <HomeContent searchParams={searchParams} locale={locale} />
    </Suspense>
  );
}
