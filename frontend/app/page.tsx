import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ConversionEvent } from '@/components/ConversionEvent';
import { ListingGrid } from '@/components/ListingGrid';
import { SearchFilters } from '@/components/SearchFilters';
import { getListings } from '@/lib/server-api';

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
    url: `${siteUrl}/`,
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
  return (
    <div>
      <ConversionEvent />
      <div className="mb-8 md:mb-12 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 via-primary-400/5 to-transparent rounded-2xl blur-3xl -z-10" />
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 md:mb-6 leading-tight pl-4 md:pl-5">
          <span className="bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 bg-clip-text text-transparent drop-shadow-lg">
            Автомобили во Македонија
          </span>
        </h1>
        <p className="text-xl md:text-2xl font-medium leading-relaxed tracking-wide pl-4 md:pl-5">
          <span className="text-white">Купете или продадете авто на </span>
          <span className="text-primary-500 font-bold">Kupito!</span>
          <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            {' '}
            Објавете оглас{' '}
          </span>
          <span className="bg-gradient-to-r from-primary-400 to-[#3ECA74] bg-clip-text text-transparent">
            бесплатно.
          </span>
        </p>
      </div>

      <SearchFiltersWrapper />

      <ListingGridWrapper searchParams={searchParams} />
    </div>
  );
}
