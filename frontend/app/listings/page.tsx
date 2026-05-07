import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { Suspense } from 'react';

import { ConversionEvent } from '@/components/analytics/ConversionEvent';
import { getSearchStructuredData } from '@/components/analytics/SearchStructuredData';
import { ListingGrid } from '@/components/listing/ListingGrid';
import { ScrollToFiltersButton } from '@/components/search/ScrollToFiltersButton';
import { SearchFilters } from '@/components/search/SearchFilters';
import { getListings, withListingGridDefaultLimit } from '@/lib/api';
import { getMetadataLocale, getServerTranslations } from '@/lib/i18n';
import { loadSiteConfigSync } from '@/lib/site-config';
import { localePrefixPath } from '@/lib/url-locale';
import {
  canonicalForLocaleFromRo,
  hreflangLanguagesFromRoCanonical,
  isLanguageSwitcherEnabled,
} from '@/lib/url-locale';
import { getCountry } from '@/lib/utils';

const siteConfig = loadSiteConfigSync(getCountry());
const siteUrl = siteConfig.siteUrl;

export const revalidate = 30;

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}): Promise<Metadata> {
  const locale = await getMetadataLocale();
  const t = getServerTranslations(locale);
  const params = (await (searchParams ?? Promise.resolve(undefined))) ?? {};
  const brand = typeof params.brand === 'string' ? params.brand : null;
  const model = typeof params.model === 'string' ? params.model : null;

  const hasAnyParams = Object.values(params).some((v) => v !== undefined);
  const hasOnlyBrandModel =
    hasAnyParams &&
    Object.entries(params).every(([key, value]) => {
      if (value === undefined) return true;
      return key === 'brand' || key === 'model' || key === 'vehicleType';
    });

  if (hasOnlyBrandModel && (brand || model)) {
    const vehicleType = typeof params.vehicleType === 'string' ? params.vehicleType : '';
    const vtQs =
      vehicleType && ['car', 'truck', 'moto'].includes(vehicleType) && vehicleType !== 'car'
        ? `?vehicleType=${vehicleType}`
        : '';
    if (brand && model && !brand.includes(',') && !model.includes(',')) {
      const roCanonical = `${siteUrl}/${encodeURIComponent(brand)}/${encodeURIComponent(model)}${vtQs}`;
      const canonical = canonicalForLocaleFromRo(roCanonical, locale);
      const alternates = isLanguageSwitcherEnabled()
        ? { canonical, languages: hreflangLanguagesFromRoCanonical(roCanonical) }
        : { canonical };
      return {
        title: t.listingsPage.title,
        description: t.listingsPage.description,
        alternates,
      };
    }
    if (brand && !model && !brand.includes(',')) {
      const roCanonical = `${siteUrl}/${encodeURIComponent(brand)}${vtQs}`;
      const canonical = canonicalForLocaleFromRo(roCanonical, locale);
      const alternates = isLanguageSwitcherEnabled()
        ? { canonical, languages: hreflangLanguagesFromRoCanonical(roCanonical) }
        : { canonical };
      return {
        title: t.listingsPage.title,
        description: t.listingsPage.description,
        alternates,
      };
    }
  }

  if (hasAnyParams) {
    const roCanonical = `${siteUrl}/listings`;
    const canonical = canonicalForLocaleFromRo(roCanonical, locale);
    const alternates = isLanguageSwitcherEnabled()
      ? { canonical, languages: hreflangLanguagesFromRoCanonical(roCanonical) }
      : { canonical };
    return {
      title: t.listingsPage.title,
      description: t.listingsPage.description,
      robots: {
        index: false,
        follow: true,
        googleBot: { index: false, follow: true },
      },
      alternates,
    };
  }

  const roCanonical = `${siteUrl}/listings`;
  const canonical = canonicalForLocaleFromRo(roCanonical, locale);
  const alternates = isLanguageSwitcherEnabled()
    ? { canonical, languages: hreflangLanguagesFromRoCanonical(roCanonical) }
    : { canonical };
  return {
    title: t.listingsPage.title,
    description: t.listingsPage.description,
    alternates,
  };
}

function SearchFiltersWrapper() {
  return (
    <Suspense fallback={<div className="card p-4 md:p-5 mb-6 animate-pulse h-64" />}>
      <SearchFilters />
    </Suspense>
  );
}

async function ListingGridServer({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}) {
  const params = (await (searchParams ?? Promise.resolve(undefined))) ?? {};
  const initialData = await getListings(withListingGridDefaultLimit(params));
  return <ListingGrid initialData={initialData} />;
}

function ListingGridWrapper({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}) {
  return (
    <Suspense fallback={<div className="animate-pulse h-96" />}>
      <ListingGridServer searchParams={searchParams} />
    </Suspense>
  );
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}) {
  const locale = await getMetadataLocale();
  const params = (await (searchParams ?? Promise.resolve(undefined))) ?? {};
  const brand = typeof params.brand === 'string' ? params.brand : null;
  const model = typeof params.model === 'string' ? params.model : null;
  const hasAnyParams = Object.values(params).some((v) => v !== undefined);
  const hasOnlyBrandModel =
    hasAnyParams &&
    Object.entries(params).every(([key, value]) => {
      if (value === undefined) return true;
      return key === 'brand' || key === 'model' || key === 'vehicleType';
    });

  if (hasOnlyBrandModel && brand && !brand.includes(',')) {
    const vehicleType = typeof params.vehicleType === 'string' ? params.vehicleType : '';
    const vtQs =
      vehicleType && ['car', 'truck', 'moto'].includes(vehicleType) && vehicleType !== 'car'
        ? `?vehicleType=${vehicleType}`
        : '';
    if (model && !model.includes(',')) {
      permanentRedirect(
        localePrefixPath(
          `/${encodeURIComponent(brand)}/${encodeURIComponent(model)}${vtQs}`,
          locale,
        ),
      );
    }
    permanentRedirect(localePrefixPath(`/${encodeURIComponent(brand)}${vtQs}`, locale));
  }

  const t = getServerTranslations(locale);
  const category = typeof params.category === 'string' ? params.category : null;
  const searchStructuredData = await getSearchStructuredData({ brand, model, category });

  return (
    <div>
      <ConversionEvent />

      <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-6 text-primary-900">
        {t.listingsPage.title}
      </h1>

      <SearchFiltersWrapper />
      <ListingGridWrapper searchParams={searchParams} />
      <ScrollToFiltersButton />
      {searchStructuredData}
    </div>
  );
}
