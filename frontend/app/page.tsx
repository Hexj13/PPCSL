import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ConversionEvent } from '@/components/ConversionEvent';
import { HomeHero } from '@/components/HomeHero';
import { ListingGrid } from '@/components/ListingGrid';
import { ScrollToFiltersButton } from '@/components/ScrollToFiltersButton';
import { SearchFilters } from '@/components/SearchFilters';
import { getServerTranslations } from '@/lib/i18n';
import { getListings } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.club';

export const metadata: Metadata = {
  title: 'Автомобили во Македонија',
  description:
    'Купете или продадете авто на Kupito! Објавете оглас бесплатно. Платформа за купување и продавање автомобили онлајн во Македонија. Автомобили огласи Македонија - бесплатно објавување огласи за приватни лица и авто-плацови.',
  keywords: [
    'автомобили Македонија',
    'купување автомобили онлајн',
    'продажба автомобили Македонија',
    'автомобили огласи Македонија',
    'avtomobili makedonija',
    'kupuvanje avtomobili online',
    'prodazba avtomobili mk',
    'avtomobil oglasi makedonija',
  ],
  openGraph: {
    type: 'website',
    url: `${siteUrl}`,
    title: 'Kupito – огласи за продажба на автомобили во Македонија',
    description:
      'Купете или продадете авто на Kupito! Објавете оглас бесплатно. Нова платформа за купување и продавање автомобили онлајн во Македонија. Автомобили огласи Македонија - бесплатно објавување огласи за приватни лица и авто-плацови.',
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Kupito',
      },
    ],
    siteName: 'Kupito',
    locale: 'mk_MK',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kupito – огласи за продажба на автомобили во Македонија',
    description: 'Нова платформа за купување и продавање автомобили во Македонија.',
    images: [`${siteUrl}/og-image.jpg`],
  },
  alternates: {
    canonical: `${siteUrl}`,
  },
};

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
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialData = await getListings(params);

  return <ListingGrid initialData={initialData} />;
}

function ListingGridWrapper({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<div className="animate-pulse h-96" />}>
      <ListingGridServer searchParams={searchParams} />
    </Suspense>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = getServerTranslations('mk');

  return (
    <div>
      <ConversionEvent />
      <HomeHero
        title={t.home.title}
        subtitle={t.home.subtitle}
        subtitleBold={t.home.subtitleBold}
        subtitle2={t.home.subtitle2}
        subtitle3={t.home.subtitle3}
      />

      <SearchFiltersWrapper />

      <ListingGridWrapper searchParams={searchParams} />

      <ScrollToFiltersButton />
    </div>
  );
}
