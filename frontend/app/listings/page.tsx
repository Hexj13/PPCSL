import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ConversionEvent } from '@/components/analytics/ConversionEvent';
import { SearchStructuredData } from '@/components/analytics/SearchStructuredData';
import { ListingGrid } from '@/components/listing/ListingGrid';
import { ScrollToFiltersButton } from '@/components/search/ScrollToFiltersButton';
import { SearchFilters } from '@/components/search/SearchFilters';
import { getListings } from '@/lib/api';
import { getMetadataLocale, getServerTranslations } from '@/lib/i18n';
import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils';

const siteConfig = loadSiteConfigSync(getCountry());
const siteUrl = siteConfig.siteUrl;

export const dynamic = 'force-dynamic';

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
      return key === 'brand' || key === 'model';
    });

  if (hasOnlyBrandModel && (brand || model)) {
    const qs = new URLSearchParams();
    if (brand) qs.set('brand', brand);
    if (model) qs.set('model', model);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';

    return {
      title: t.listingsPage.title,
      description: t.listingsPage.description,
      robots: {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
        },
      },
      alternates: {
        canonical: `${siteUrl}/${suffix}`,
      },
    };
  }

  if (hasAnyParams) {
    return {
      title: t.listingsPage.title,
      description: t.listingsPage.description,
      robots: {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
        },
      },
      alternates: {
        canonical: `${siteUrl}/listings`,
      },
    };
  }

  return {
    title: t.listingsPage.title,
    description: t.listingsPage.description,
    alternates: {
      canonical: `${siteUrl}/listings`,
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

async function ListingGridServer({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}) {
  const params = (await (searchParams ?? Promise.resolve(undefined))) ?? {};
  const initialData = await getListings(params);
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
  const t = getServerTranslations(locale);
  const params = (await (searchParams ?? Promise.resolve(undefined))) ?? {};
  const brand = typeof params.brand === 'string' ? params.brand : null;
  const model = typeof params.model === 'string' ? params.model : null;

  return (
    <div>
      <ConversionEvent />
      <SearchStructuredData brand={brand} model={model} />

      <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-6 text-primary-900">
        {t.listingsPage.title}
      </h1>

      <SearchFiltersWrapper />
      <ListingGridWrapper searchParams={searchParams} />
      <ScrollToFiltersButton />
    </div>
  );
}
