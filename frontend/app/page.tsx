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
import { getServerTranslations, type Translations } from '@/lib/i18n';
import { POPULAR_BRANDS, POPULAR_MODELS_BY_BRAND } from '@/lib/popular-brands';
import { fetchBrands, fetchModelsByBrands, getListings } from '@/lib/server-api';
import { loadSiteConfigSync } from '@/lib/site-config';
import { createSlug } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';
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
  defaultTitle: string,
  translations: Translations
): Promise<string> {
  const brand = typeof brandParam === 'string' ? brandParam : undefined;
  const model = typeof modelParam === 'string' ? modelParam : undefined;
  const bodyTypes = typeof bodyTypesParam === 'string' ? bodyTypesParam : undefined;

  // Приоритет: brand/model → body_types → default
  if (brand || model) {
    // Существующая логика для brand/model, body_types игнорируется
  } else if (bodyTypes && !brand && !model) {
    // Используем body_types только если нет brand/model
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
        return bodyTypeLabels.join(', ');
      }
    }
  }

  if (!brand && !model) {
    return defaultTitle;
  }

  const brandSlugs = brand ? brand.split(',').map((s) => s.trim().toLowerCase()) : [];
  const modelSlugs = model ? model.split(',').map((s) => s.trim().toLowerCase()) : [];

  try {
    const allBrands = await fetchBrands();
    const foundBrands = brandSlugs
      .map((slug) => {
        const brand = allBrands.find(
          (b) => b.name.toLowerCase() === slug || createSlug(b.name) === slug
        );
        return brand?.name;
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
        const foundModels: string[] = [];

        foundBrands.forEach((brandName) => {
          const brandId = allBrands.find((b) => b.name === brandName)?.id;
          if (brandId) {
            const brandModels = modelsByBrand[brandId] || [];
            modelSlugs.forEach((modelSlug) => {
              const model = brandModels.find(
                (m) => m.name.toLowerCase() === modelSlug || createSlug(m.name) === modelSlug
              );
              if (model) {
                foundModels.push(`${brandName} ${model.name}`);
              }
            });
          }
        });

        if (foundModels.length > 0) {
          return foundModels.join(', ');
        }
      }
    }

    return foundBrands.length === 1 ? foundBrands[0] : foundBrands.join(', ');
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
            (m) => m.toLowerCase() === modelSlug || createSlug(m) === modelSlug
          );
          if (model) {
            foundModels.push(`${brandName} ${model}`);
          }
        });
      });

      if (foundModels.length > 0) {
        return foundModels.join(', ');
      }
    }

    return popularBrands.length === 1 ? popularBrands[0] : popularBrands.join(', ');
  }
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const t = getServerTranslations();
  const params = await searchParams;
  const brandParam = params.brand;
  const modelParam = params.model;
  const bodyTypesParam = params.body_types;
  const pageParam = params.page;
  const baseTitle = t.metadata.site.defaultTitle;
  const title = await getTitleFromParams(brandParam, modelParam, bodyTypesParam, baseTitle, t);
  const fullTitle = title === baseTitle ? title : `${title} | ${baseTitle}`;

  const page =
    typeof pageParam === 'string' && pageParam.trim() !== '' ? parseInt(pageParam, 10) : 1;
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;

  const hasNonIndexableParams = Object.entries(params).some(([key, value]) => {
    if (value === undefined) return false;
    if (key === 'brand' || key === 'model' || key === 'page') return false;
    return true;
  });

  const description =
    title === baseTitle
      ? 'Купете или продадете авто на Kupito! Објавете оглас бесплатно. Платформа за купување и продавање автомобили онлајн во Македонија. Автомобили огласи Македонија - бесплатно објавување огласи за приватни лица и авто-плацови.'
      : `Купете ${title} на Kupito! Најдете најдобри цени и избор на ${title} автомобили во Македонија.`;

  const queryParams = new URLSearchParams();
  if (brandParam && typeof brandParam === 'string') {
    queryParams.set('brand', brandParam);
  }
  if (modelParam && typeof modelParam === 'string') {
    queryParams.set('model', modelParam);
  }
  if (!hasNonIndexableParams && safePage > 1) {
    queryParams.set('page', String(safePage));
  }
  const queryString = queryParams.toString();
  const urlSuffix = queryString ? `?${queryString}` : '';

  const canonicalParams = new URLSearchParams();
  if (brandParam && typeof brandParam === 'string') canonicalParams.set('brand', brandParam);
  if (modelParam && typeof modelParam === 'string') canonicalParams.set('model', modelParam);
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
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = getServerTranslations();
  const params = await searchParams;
  const brand = typeof params.brand === 'string' ? params.brand : null;
  const model = typeof params.model === 'string' ? params.model : null;
  const initialData = await getListings(params);

  return (
    <div>
      <BackgroundDecorations />
      <ConversionEvent />
      <DynamicPageTitle />
      <SearchStructuredData brand={brand} model={model} listings={initialData.data} />
      <HomeHero
        title={t.home.title}
        subtitle={t.home.subtitle}
        subtitleBold={t.home.subtitleBold}
        subtitle2={t.home.subtitle2}
        subtitle3={t.home.subtitle3}
      />

      <SearchFiltersWrapper />

      <ListingGrid initialData={initialData} />

      <ScrollToFiltersButton />
    </div>
  );
}
