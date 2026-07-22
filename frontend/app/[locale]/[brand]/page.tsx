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
import { fetchBrands, getListings, withListingGridDefaultLimit } from '@/lib/api';
import { isReservedBrandLandingSegment } from '@/lib/brand-landing-reserved-segments';
import { getMetadataLocaleFromParams, getServerTranslations } from '@/lib/i18n';
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

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; brand: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const locale = await getMetadataLocaleFromParams(resolvedParams);
  const t = getServerTranslations(locale);
  const { brand: brandSlug } = resolvedParams;
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

  const hasExtra =
    Object.keys(sp).some((k) => {
      if (k === 'brand' || k === 'vehicleType') return false;
      return sp[k] !== undefined;
    }) && Object.keys(sp).length > 0;

  const canonicalBrandSlug = createSlug(brand.name);
  const canonicalQs = brandLandingVehicleTypeQs(sp);
  const roCanonical = `${siteUrl}/${canonicalBrandSlug}${canonicalQs}`;

  if (
    needsBrandLandingPathRedirect(brandSlug, undefined, canonicalBrandSlug, undefined, sp, hasExtra)
  ) {
    permanentRedirect(brandLandingRedirectHref(canonicalBrandSlug, undefined, sp, locale));
  }

  const canonical = canonicalForLocaleFromRo(roCanonical, locale);
  const alternates = isLanguageSwitcherEnabled()
    ? { canonical, languages: hreflangLanguagesFromRoCanonical(roCanonical) }
    : { canonical };

  const priceData = await getListings({
    ...sp,
    brand: canonicalBrandSlug,
    limit: '1',
    sortBy: 'price',
    sortOrder: 'ASC',
  });
  const title = buildLandingTitle(t.metadata.brandLanding, {
    brand: brand.name,
    price: getListingPriceLabel(priceData.data[0]) ?? '',
  });
  const description = fillTemplate(t.metadata.brandLanding.description, { brand: brand.name });

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
      images: [
        {
          url: `${siteUrl}/og-image.jpg`,
          alt: fillTemplate(t.metadata.brandLanding.ogAlt, { brand: brand.name }),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [
        {
          url: `${siteUrl}/og-image.jpg`,
          alt: fillTemplate(t.metadata.brandLanding.ogAlt, { brand: brand.name }),
        },
      ],
    },
  };
}

function SearchFiltersWrapper({ brandSlug }: { brandSlug: string }) {
  return (
    <Suspense fallback={<div className="card p-4 md:p-5 mb-6 animate-pulse h-64" />}>
      <SearchFilters landingBrandSlug={brandSlug} />
    </Suspense>
  );
}

async function ListingGridServer({
  brandSlug,
  searchParams,
}: {
  brandSlug: string;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}) {
  const raw = (await (searchParams ?? Promise.resolve(undefined))) ?? {};
  const merged = { ...raw, brand: brandSlug };
  const initialData = await getListings(withListingGridDefaultLimit(merged));
  return <ListingGrid initialData={initialData} />;
}

function ListingGridWrapper({
  brandSlug,
  searchParams,
}: {
  brandSlug: string;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}) {
  return (
    <Suspense fallback={<div className="animate-pulse h-96" />}>
      <ListingGridServer brandSlug={brandSlug} searchParams={searchParams} />
    </Suspense>
  );
}

export default async function BrandLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; brand: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}) {
  const resolvedParams = await params;
  const locale = await getMetadataLocaleFromParams(resolvedParams);
  const { brand: brandSlug } = resolvedParams;
  if (isReservedBrandLandingSegment(brandSlug)) {
    notFound();
  }
  const brands = await fetchBrands();
  const brand = brands.find((b) => createSlug(b.name) === brandSlug.toLowerCase());
  if (!brand) {
    notFound();
  }

  const canonicalBrandSlug = createSlug(brand.name);
  const sp = (await (searchParams ?? Promise.resolve(undefined))) ?? {};
  const hasExtra =
    Object.keys(sp).some((k) => {
      if (k === 'brand' || k === 'vehicleType') return false;
      return sp[k] !== undefined;
    }) && Object.keys(sp).length > 0;

  if (
    needsBrandLandingPathRedirect(brandSlug, undefined, canonicalBrandSlug, undefined, sp, hasExtra)
  ) {
    permanentRedirect(brandLandingRedirectHref(canonicalBrandSlug, undefined, sp, locale));
  }

  const t = getServerTranslations(locale);
  const merged: Record<string, string | string[] | undefined> = {
    ...sp,
    brand: canonicalBrandSlug,
  };
  const category = typeof merged.category === 'string' ? merged.category : null;
  const initialData = await getListings(withListingGridDefaultLimit(merged));
  const searchStructuredData = await getSearchStructuredData({
    brand: canonicalBrandSlug,
    model: null,
    category,
    listings: initialData.data,
    brandName: brand.name,
    locale,
  });

  const heroTitle = fillTemplate(t.home.titleWithBrand, { brand: brand.name });

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
      <SearchFiltersWrapper brandSlug={canonicalBrandSlug} />
      <ListingGridWrapper brandSlug={canonicalBrandSlug} searchParams={searchParams} />
      <Suspense fallback={null}>
        <ScrollToFiltersButton />
      </Suspense>
      {searchStructuredData}
    </div>
  );
}
