import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Suspense } from 'react';

import { BackgroundDecorations } from '@/components/BackgroundDecorations';
import { HomeHero } from '@/components/HomeHero';
import { ConversionEvent } from '@/components/analytics/ConversionEvent';
import { getSearchStructuredData } from '@/components/analytics/SearchStructuredData';
import { ListingGrid } from '@/components/listing/ListingGrid';
import { ScrollToFiltersButton } from '@/components/search/ScrollToFiltersButton';
import { SearchFilters } from '@/components/search/SearchFilters';
import { SearchFiltersLimitToast } from '@/components/search/SearchFiltersLimitToast';
import {
  fetchBrands,
  fetchModelsByBrands,
  getListings,
  withListingGridDefaultLimit,
} from '@/lib/api';
import { isReservedBrandLandingSegment } from '@/lib/brand-landing-reserved-segments';
import { getMetadataLocale, getServerTranslations } from '@/lib/i18n';
import {
  brandLandingRedirectHref,
  brandLandingVehicleTypeQs,
  needsBrandLandingPathRedirect,
} from '@/lib/search/brand-landing-canonical';
import {
  buildLandingTitle,
  fillTemplate,
  getListingPriceLabel,
} from '@/lib/search/landing-metadata';
import { loadSiteConfigSync } from '@/lib/site-config';
import {
  canonicalForLocaleFromRo,
  hreflangLanguagesFromRoCanonical,
  isLanguageSwitcherEnabled,
} from '@/lib/url-locale';
import { createSlug, getCountry } from '@/lib/utils';

const siteConfig = loadSiteConfigSync(getCountry());
const siteUrl = siteConfig.siteUrl;

export const revalidate = 3600;
export const dynamicParams = true;

function SearchFiltersWrapper({ brandSlug, modelSlug }: { brandSlug: string; modelSlug: string }) {
  return (
    <Suspense fallback={<div className="card p-4 md:p-5 mb-6 animate-pulse h-64" />}>
      <SearchFilters landingBrandSlug={brandSlug} landingModelSlug={modelSlug} />
    </Suspense>
  );
}

async function ListingGridServer({
  brandSlug,
  modelSlug,
  searchParams,
}: {
  brandSlug: string;
  modelSlug: string;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}) {
  const raw = (await (searchParams ?? Promise.resolve(undefined))) ?? {};
  const merged = { ...raw, brand: brandSlug, model: modelSlug };
  const initialData = await getListings(withListingGridDefaultLimit(merged));
  return <ListingGrid initialData={initialData} />;
}

function ListingGridWrapper({
  brandSlug,
  modelSlug,
  searchParams,
}: {
  brandSlug: string;
  modelSlug: string;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}) {
  return (
    <Suspense fallback={<div className="animate-pulse h-96" />}>
      <ListingGridServer brandSlug={brandSlug} modelSlug={modelSlug} searchParams={searchParams} />
    </Suspense>
  );
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ brand: string; model: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}): Promise<Metadata> {
  const locale = await getMetadataLocale();
  const t = getServerTranslations(locale);
  const { brand: brandSlug, model: modelSlug } = await params;
  const sp = (await (searchParams ?? Promise.resolve(undefined))) ?? {};

  if (isReservedBrandLandingSegment(brandSlug)) {
    return { title: t.metadata.site.defaultTitle };
  }

  const brands = await fetchBrands();
  const brand = brands.find((b) => createSlug(b.name) === brandSlug.toLowerCase());
  if (!brand) {
    return {
      title: t.metadata.listing.notFoundTitle,
      robots: { index: false, follow: true },
    };
  }

  const modelsByBrand = await fetchModelsByBrands([brand.id]);
  const models = modelsByBrand[brand.id] ?? [];
  const model = models.find((m) => createSlug(m.name) === modelSlug.toLowerCase());
  if (!model) {
    return {
      title: t.metadata.listing.notFoundTitle,
      robots: { index: false, follow: true },
    };
  }

  const hasExtra = Object.keys(sp).some((k) => {
    if (k === 'brand' || k === 'model' || k === 'vehicleType') return false;
    return sp[k] !== undefined;
  });

  const canonicalBrandSlug = createSlug(brand.name);
  const canonicalModelSlug = createSlug(model.name);
  const canonicalQs = brandLandingVehicleTypeQs(sp);
  const roCanonical = `${siteUrl}/${canonicalBrandSlug}/${canonicalModelSlug}${canonicalQs}`;

  if (
    needsBrandLandingPathRedirect(
      brandSlug,
      modelSlug,
      canonicalBrandSlug,
      canonicalModelSlug,
      sp,
      hasExtra,
    )
  ) {
    permanentRedirect(brandLandingRedirectHref(canonicalBrandSlug, canonicalModelSlug, sp, locale));
  }

  const canonical = canonicalForLocaleFromRo(roCanonical, locale);
  const alternates = isLanguageSwitcherEnabled()
    ? { canonical, languages: hreflangLanguagesFromRoCanonical(roCanonical) }
    : { canonical };

  const priceData = await getListings({
    ...sp,
    brand: canonicalBrandSlug,
    model: canonicalModelSlug,
    limit: '1',
    sortBy: 'price',
    sortOrder: 'ASC',
  });
  const title = buildLandingTitle(t.metadata.brandModelLanding, {
    brand: brand.name,
    model: model.name,
    price: getListingPriceLabel(priceData.data[0]) ?? '',
  });
  const description = fillTemplate(t.metadata.brandModelLanding.description, {
    brand: brand.name,
    model: model.name,
  });
  const ogAlt = fillTemplate(t.metadata.brandModelLanding.ogAlt, {
    brand: brand.name,
    model: model.name,
  });

  if (hasExtra) {
    return {
      title,
      description,
      robots: { index: false, follow: true },
      alternates,
    };
  }

  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: canonical,
      images: [{ url: `${siteUrl}/og-image.jpg`, alt: ogAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: `${siteUrl}/og-image.jpg`, alt: ogAlt }],
    },
  };
}

export default async function BrandModelLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ brand: string; model: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}) {
  const locale = await getMetadataLocale();
  const { brand: brandSlug, model: modelSlug } = await params;
  if (isReservedBrandLandingSegment(brandSlug)) {
    notFound();
  }

  const brands = await fetchBrands();
  const brand = brands.find((b) => createSlug(b.name) === brandSlug.toLowerCase());
  if (!brand) {
    notFound();
  }

  const modelsByBrand = await fetchModelsByBrands([brand.id]);
  const models = modelsByBrand[brand.id] ?? [];
  const model = models.find((m) => createSlug(m.name) === modelSlug.toLowerCase());
  if (!model) {
    notFound();
  }

  const canonicalBrandSlug = createSlug(brand.name);
  const canonicalModelSlug = createSlug(model.name);
  const sp = (await (searchParams ?? Promise.resolve(undefined))) ?? {};
  const hasExtra = Object.keys(sp).some((k) => {
    if (k === 'brand' || k === 'model' || k === 'vehicleType') return false;
    return sp[k] !== undefined;
  });

  if (
    needsBrandLandingPathRedirect(
      brandSlug,
      modelSlug,
      canonicalBrandSlug,
      canonicalModelSlug,
      sp,
      hasExtra,
    )
  ) {
    permanentRedirect(brandLandingRedirectHref(canonicalBrandSlug, canonicalModelSlug, sp, locale));
  }

  const t = getServerTranslations(locale);
  const merged: Record<string, string | string[] | undefined> = {
    ...sp,
    brand: canonicalBrandSlug,
    model: canonicalModelSlug,
  };
  const category = typeof merged.category === 'string' ? merged.category : null;
  const initialData = await getListings(withListingGridDefaultLimit(merged));
  const searchStructuredData = await getSearchStructuredData({
    brand: canonicalBrandSlug,
    model: canonicalModelSlug,
    category,
    listings: initialData.data,
    brandName: brand.name,
    modelName: model.name,
  });

  const heroTitle = fillTemplate(t.home.titleWithBrandModel, {
    brand: brand.name,
    model: model.name,
  });

  return (
    <div>
      <BackgroundDecorations />
      <ConversionEvent />
      <SearchFiltersLimitToast />
      <HomeHero
        title={heroTitle}
        subtitle={t.home.subtitle}
        subtitleBold={t.home.subtitleBold}
        subtitle2={t.home.subtitle2}
        subtitle3={t.home.subtitle3}
      />
      <SearchFiltersWrapper brandSlug={canonicalBrandSlug} modelSlug={canonicalModelSlug} />
      <ListingGridWrapper
        brandSlug={canonicalBrandSlug}
        modelSlug={canonicalModelSlug}
        searchParams={searchParams}
      />
      <Suspense fallback={null}>
        <ScrollToFiltersButton />
      </Suspense>
      {searchStructuredData}
    </div>
  );
}
