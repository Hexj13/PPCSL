import type { Metadata } from 'next';
import { Suspense } from 'react';

import { BackgroundDecorations } from '@/components/BackgroundDecorations';
import { ConversionEvent } from '@/components/ConversionEvent';
import { DynamicPageTitle } from '@/components/DynamicPageTitle';
import { HomeHero } from '@/components/HomeHero';
import { ListingGrid } from '@/components/ListingGrid';
import { ScrollToFiltersButton } from '@/components/ScrollToFiltersButton';
import { SearchFilters } from '@/components/SearchFilters';
import { SearchStructuredData } from '@/components/SearchStructuredData';
import { getMetadataLocale, getServerTranslations, type Translations } from '@/lib/i18n';
import { POPULAR_BRANDS, POPULAR_MODELS_BY_BRAND } from '@/lib/popular-brands';
import {
  fetchBrands,
  fetchModelsByBrands,
  fetchSearchMetadata,
  getListings,
} from '@/lib/server-api';
import { loadSiteConfigSync } from '@/lib/site-config';
import { createSlug, getCountry, slugMatches, slugToName } from '@/lib/utils';

export const dynamic = 'force-dynamic';

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

async function getTitleFromParams(
  brandParam: string | string[] | undefined,
  modelParam: string | string[] | undefined,
  bodyTypesParam: string | string[] | undefined,
  vehicleTypeParam: string | string[] | undefined,
  defaultTitle: string,
  translations: Translations
): Promise<string> {
  const brand = typeof brandParam === 'string' ? brandParam : undefined;
  const model = typeof modelParam === 'string' ? modelParam : undefined;
  const bodyTypes = typeof bodyTypesParam === 'string' ? bodyTypesParam : undefined;
  const vehicleType =
    typeof vehicleTypeParam === 'string' && ['car', 'truck', 'moto'].includes(vehicleTypeParam)
      ? vehicleTypeParam
      : 'car';

  const getVehicleTypeLabel = (type: string): string => {
    const key = `listings.vehicleTypeFull.${type}`;
    const value = getTranslationValue(translations, key);
    return value === key ? '' : value;
  };

  const vehicleTypeLabel = getVehicleTypeLabel(vehicleType);

  if (bodyTypes && !brand && !model) {
    const bodyTypeValues = bodyTypes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (bodyTypeValues.length > 0) {
      const bodyTypeLabels = bodyTypeValues
        .map((bt) => {
          try {
            return getTranslationValue(translations, `vehicleOptions.bodyType.${bt}`);
          } catch {
            return null;
          }
        })
        .filter((label): label is string => Boolean(label));

      if (bodyTypeLabels.length > 0) {
        const bodyTypeTitle = bodyTypeLabels.join(', ');
        return vehicleTypeLabel ? `${bodyTypeTitle} | ${vehicleTypeLabel}` : bodyTypeTitle;
      }
    }
  }

  if (!brand && !model) {
    return vehicleTypeLabel ? `${vehicleTypeLabel} | ${defaultTitle}` : defaultTitle;
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
    const allBrands = await fetchBrands();
    const foundBrands = brandSlugs
      .map((slug) => {
        const bySlug = allBrands.find((b) => createSlug(b.name) === slug);
        if (bySlug) return bySlug.name;
        const byName = allBrands.find((b) => b.name.toLowerCase() === slug);
        return byName?.name;
      })
      .filter((name): name is string => name !== undefined);

    if (foundBrands.length === 0) {
      return defaultTitle;
    }

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
                  slugMatches(modelSlug, m.name)
              );
              if (model) {
                brandParts.push(`${brandName} ${model.name}`);
              }
            });
          }

          if (brandParts.length === 0) {
            const popularModels = POPULAR_MODELS_BY_BRAND[brandName] || [];
            modelSlugs.forEach((modelSlug) => {
              const model = popularModels.find(
                (m) =>
                  m.toLowerCase() === modelSlug ||
                  createSlug(m) === modelSlug ||
                  slugMatches(modelSlug, m)
              );
              if (model) {
                brandParts.push(`${brandName} ${model}`);
              }
            });
          }

          if (brandParts.length > 0) {
            parts.push(...brandParts);
          } else if (foundBrands.length === 1 && modelSlugs.length > 0) {
            const fallbackModels = modelSlugs.map((s) => slugToName(s)).join(', ');
            parts.push(`${brandName} ${fallbackModels}`);
          } else {
            parts.push(brandName);
          }
        });

        if (parts.length > 0) {
          const modelsTitle = parts.join(', ');
          return vehicleTypeLabel ? `${modelsTitle} | ${vehicleTypeLabel}` : modelsTitle;
        }
      }
    }

    const brandsTitle = foundBrands.length === 1 ? foundBrands[0] : foundBrands.join(', ');
    return vehicleTypeLabel ? `${brandsTitle} | ${vehicleTypeLabel}` : brandsTitle;
  } catch {
    const popularBrands = brandSlugs
      .map((slug) => {
        return POPULAR_BRANDS.find((b) => b.toLowerCase() === slug || createSlug(b) === slug);
      })
      .filter((name): name is string => name !== undefined);

    if (popularBrands.length === 0) {
      return defaultTitle;
    }

    if (modelSlugs.length > 0 && popularBrands.length > 0) {
      const foundModels: string[] = [];
      popularBrands.forEach((brandName) => {
        const models = POPULAR_MODELS_BY_BRAND[brandName] || [];
        modelSlugs.forEach((modelSlug) => {
          const model = models.find(
            (m) =>
              m.toLowerCase() === modelSlug ||
              createSlug(m) === modelSlug ||
              slugMatches(modelSlug, m)
          );
          if (model) {
            foundModels.push(`${brandName} ${model}`);
          }
        });
      });

      if (foundModels.length > 0) {
        const modelsTitle = foundModels.join(', ');
        return vehicleTypeLabel ? `${modelsTitle} | ${vehicleTypeLabel}` : modelsTitle;
      }

      if (popularBrands.length === 1 && modelSlugs.length > 0) {
        const slugBasedTitle = `${popularBrands[0]} ${modelSlugs.map((s) => slugToName(s)).join(', ')}`;
        return vehicleTypeLabel ? `${slugBasedTitle} | ${vehicleTypeLabel}` : slugBasedTitle;
      }
    }

    const popularBrandsTitle =
      popularBrands.length === 1 ? popularBrands[0] : popularBrands.join(', ');
    return vehicleTypeLabel ? `${popularBrandsTitle} | ${vehicleTypeLabel}` : popularBrandsTitle;
  }
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}): Promise<Metadata> {
  const locale = await getMetadataLocale();
  const t = getServerTranslations(locale);
  const params = (await (searchParams ?? Promise.resolve(undefined))) ?? {};
  const brandParam = params.brand;
  const modelParam = params.model;
  const bodyTypesParam = params.body_types;
  const vehicleTypeParam = params.vehicleType;
  const pageParam = params.page;
  const baseTitle = t.metadata.site.defaultTitle;

  const vehicleType = (
    typeof vehicleTypeParam === 'string' && ['car', 'truck', 'moto'].includes(vehicleTypeParam)
      ? vehicleTypeParam
      : 'car'
  ) as 'car' | 'truck' | 'moto';
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
      t
    ));
  const fullTitle = title === baseTitle ? title : `${title} | ${baseTitle}`;

  const page =
    typeof pageParam === 'string' && pageParam.trim() !== '' ? parseInt(pageParam, 10) : 1;
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;

  const isValidVehicleType = (value: string | string[] | undefined): value is string => {
    return typeof value === 'string' && ['car', 'truck', 'moto'].includes(value);
  };

  const hasNonIndexableParams = Object.entries(params).some(([key, value]) => {
    if (value === undefined) return false;
    if (key === 'brand' || key === 'model' || key === 'page' || key === 'body_types') return false;
    if (key === 'vehicleType') {
      return !isValidVehicleType(value);
    }
    return true;
  });

  let description: string;
  if (metadataFromApi.description) {
    description = metadataFromApi.description;
  } else if (title === baseTitle) {
    description = t.metadata.site.homePageDescription;
  } else {
    const brandParamValue = typeof brandParam === 'string' ? brandParam : null;
    const modelParamValue = typeof modelParam === 'string' ? modelParam : null;
    const apiBrandName = metadataFromApi.brandName;
    const apiModelName =
      metadataFromApi.modelNames && metadataFromApi.modelNames.length === 1
        ? metadataFromApi.modelNames[0]
        : undefined;

    if (apiBrandName && apiModelName) {
      description = t.metadata.site.homePageDescriptionWithBrandModel
        .replaceAll('{brand}', apiBrandName)
        .replaceAll('{model}', apiModelName);
    } else if (apiBrandName) {
      description = t.metadata.site.homePageDescriptionWithBrand.replaceAll(
        '{brand}',
        apiBrandName
      );
    } else if (brandParamValue && brandParamValue.includes(',')) {
      description = t.metadata.site.homePageDescription;
    } else if (modelParamValue && brandParamValue) {
      const brandName =
        POPULAR_BRANDS.find((b) => createSlug(b) === brandParamValue.toLowerCase()) ||
        brandParamValue;
      const models = POPULAR_MODELS_BY_BRAND[brandName] || [];
      const modelSlugFallback = modelParamValue.split(',')[0]?.trim() ?? modelParamValue;
      const modelName =
        models.find((m) => createSlug(m) === modelSlugFallback.toLowerCase()) ||
        slugToName(modelSlugFallback);

      description = t.metadata.site.homePageDescriptionWithBrandModel
        .replaceAll('{brand}', brandName)
        .replaceAll('{model}', modelName);
    } else {
      const brandName = brandParamValue
        ? POPULAR_BRANDS.find((b) => createSlug(b) === brandParamValue.toLowerCase()) ||
          brandParamValue
        : title;

      description = t.metadata.site.homePageDescriptionWithBrand.replaceAll('{brand}', brandName);
    }
  }

  const queryParams = new URLSearchParams();
  if (brandParam && typeof brandParam === 'string') {
    queryParams.set('brand', brandParam);
  }
  if (modelParam && typeof modelParam === 'string') {
    queryParams.set('model', modelParam);
  }
  if (
    vehicleTypeParam &&
    typeof vehicleTypeParam === 'string' &&
    ['car', 'truck', 'moto'].includes(vehicleTypeParam)
  ) {
    queryParams.set('vehicleType', vehicleTypeParam);
  }
  if (bodyTypesParam && typeof bodyTypesParam === 'string') {
    queryParams.set('body_types', bodyTypesParam);
  }
  if (!hasNonIndexableParams && safePage > 1) {
    queryParams.set('page', String(safePage));
  }
  const queryString = queryParams.toString();
  const urlSuffix = queryString ? `?${queryString}` : '';

  const canonicalParams = new URLSearchParams();
  if (brandParam && typeof brandParam === 'string') canonicalParams.set('brand', brandParam);
  if (modelParam && typeof modelParam === 'string') canonicalParams.set('model', modelParam);
  if (
    vehicleTypeParam &&
    typeof vehicleTypeParam === 'string' &&
    ['car', 'truck', 'moto'].includes(vehicleTypeParam)
  ) {
    canonicalParams.set('vehicleType', vehicleTypeParam);
  }
  if (bodyTypesParam && typeof bodyTypesParam === 'string') {
    canonicalParams.set('body_types', bodyTypesParam);
  }
  const canonicalQuery = canonicalParams.toString();
  const canonicalUrl = `${siteUrl}${canonicalQuery ? `?${canonicalQuery}` : ''}`;

  let prevUrl: string | undefined;
  let nextUrl: string | undefined;

  if (!hasNonIndexableParams && safePage > 1) {
    const prevParams = new URLSearchParams(canonicalParams.toString());
    if (safePage - 1 > 1) {
      prevParams.set('page', String(safePage - 1));
    }
    const prevQuery = prevParams.toString();
    prevUrl = `${siteUrl}${prevQuery ? `?${prevQuery}` : ''}`;
  }

  if (!hasNonIndexableParams) {
    const listings = await getListings(params);
    const totalPages = listings?.meta?.totalPages ?? 0;
    if (typeof totalPages === 'number' && totalPages > 0 && safePage < totalPages) {
      const nextParams = new URLSearchParams(canonicalParams.toString());
      nextParams.set('page', String(safePage + 1));
      const nextQuery = nextParams.toString();
      nextUrl = `${siteUrl}${nextQuery ? `?${nextQuery}` : ''}`;
    }
  }

  return {
    title: fullTitle,
    description,
    keywords: [title, ...t.metadata.site.keywords],
    robots: hasNonIndexableParams
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : undefined,
    openGraph: {
      type: 'website',
      url: `${siteUrl}${urlSuffix}`,
      title: fullTitle,
      description,
      images: [
        {
          url: `${siteUrl}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: siteConfig.name,
        },
      ],
      siteName: siteConfig.name,
      locale: siteConfig.locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [`${siteUrl}/og-image.jpg`],
    },
    alternates: {
      canonical: hasNonIndexableParams ? canonicalUrl : `${siteUrl}${urlSuffix}`,
      ...(prevUrl ? { prev: prevUrl } : {}),
      ...(nextUrl ? { next: nextUrl } : {}),
    },
  };
}

function SearchFiltersWrapper() {
  return (
    <Suspense fallback={<div className="card p-4 md:p-5 mb-6 animate-pulse h-64" />}>
      <SearchFilters />
    </Suspense>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}) {
  const params = (await (searchParams ?? Promise.resolve(undefined))) ?? {};
  const brand = typeof params.brand === 'string' ? params.brand : null;
  const model = typeof params.model === 'string' ? params.model : null;
  const initialData = await getListings(params);

  return (
    <div>
      <BackgroundDecorations />
      <ConversionEvent />
      <DynamicPageTitle />
      <SearchStructuredData brand={brand} model={model} listings={initialData.data} />
      <HomeHero />

      <SearchFiltersWrapper />

      <ListingGrid initialData={initialData} />

      <ScrollToFiltersButton />
    </div>
  );
}
