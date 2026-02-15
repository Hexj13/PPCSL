import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Listing } from '@/lib/api';
import { getMetadataLocale, getServerTranslations, getTFromTranslations } from '@/lib/i18n';
import { loadSiteConfigSync } from '@/lib/site-config';
import {
  getCountry,
  getListingDisplayTitle,
  getOptimizedImageUrl,
  toSafeJsonLdHtml,
} from '@/lib/utils';

import ListingPageClient from './ListingPageClient';

const siteConfig = loadSiteConfigSync(getCountry());
const siteUrl = siteConfig.siteUrl;
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function getListing(id: string): Promise<Listing | null> {
  try {
    const response = await fetch(`${apiUrl}/api/listings/${id}`, {
      next:
        process.env.NODE_ENV === 'development'
          ? { revalidate: 0 }
          : { revalidate: 30, tags: [`listing-${id}`] },
      cache: process.env.NODE_ENV === 'development' ? 'no-store' : 'default',
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as Listing;
  } catch {
    return null;
  }
}

function buildListingJsonLd(listing: Listing): Record<string, unknown> {
  const vehicle = listing.vehicle;
  const brandName = vehicle?.brand?.name || '';
  const modelName = vehicle?.model?.name || '';
  const year = vehicle?.year;

  const images =
    listing.images && listing.images.length > 0
      ? listing.images.map((img) => getOptimizedImageUrl(img))
      : [`${siteUrl}/placeholder-car.jpg`];

  return {
    '@context': 'https://schema.org',
    '@type': 'Vehicle',
    name: listing.title,
    description: listing.description
      ? listing.description.replace(/<[^>]*>/g, '').substring(0, 500)
      : listing.title,
    image: images,
    brand: brandName
      ? {
          '@type': 'Brand',
          name: brandName,
        }
      : undefined,
    model: modelName || undefined,
    ...(vehicle && {
      vehicleIdentificationNumber: listing.vin || undefined,
      modelDate: year ? `${year}-01-01` : undefined,
      mileageFromOdometer: vehicle.mileage_km
        ? {
            '@type': 'QuantitativeValue',
            value: vehicle.mileage_km,
            unitCode: 'KMT',
          }
        : undefined,
      vehicleEngine: vehicle.engine_displ_l
        ? {
            '@type': 'EngineSpecification',
            engineDisplacement: {
              '@type': 'QuantitativeValue',
              value: vehicle.engine_displ_l,
              unitCode: 'LTR',
            },
          }
        : undefined,
      vehicleConfiguration: vehicle.body_type || undefined,
    }),
    offers: {
      '@type': 'Offer',
      ...(listing.price !== undefined &&
        listing.price !== null && {
          price: listing.price.toString(),
          priceCurrency: listing.currency || siteConfig.currency,
          priceValidUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
        }),
      availability:
        listing.status === 'Active'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: `${siteUrl}/listings/${listing.id}`,
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: siteConfig.countryCode,
        returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: siteConfig.countryCode,
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 0,
            unitCode: 'DAY',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 0,
            unitCode: 'DAY',
          },
        },
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: '0',
          currency: siteConfig.currency,
        },
      },
    },
    seller: listing.user
      ? {
          '@type': listing.user.type === 'Business' ? 'Organization' : 'Person',
          name:
            listing.user.type === 'Business'
              ? listing.user.companyName || listing.user.email
              : `${listing.user.firstName || ''} ${listing.user.lastName || ''}`.trim() ||
                listing.user.email,
        }
      : undefined,
    url: `${siteUrl}/listings/${listing.id}`,
  };
}

function buildListingBreadcrumbJsonLd(
  listing: Listing,
  homeLabel: string,
  listingDisplayTitle: string
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: homeLabel,
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: listingDisplayTitle,
        item: `${siteUrl}/listings/${listing.id}`,
      },
    ],
  };
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildListingOgDescription(listing: Listing, fallback: string): string {
  const raw = listing.description ? stripHtml(listing.description) : '';
  if (raw.length >= 60) return raw.slice(0, 180);
  return fallback;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const locale = await getMetadataLocale();
  const t = getServerTranslations(locale);
  const { id } = await params;

  const listing = await getListing(id);
  if (!listing) {
    return {
      title: t.metadata.listing.notFoundTitle,
      description: t.metadata.listing.notFoundDescription,
      robots: {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
        },
      },
      alternates: {
        canonical: `${siteUrl}/listings/${id}`,
      },
    };
  }

  const tFn = getTFromTranslations(t);
  const displayTitle = getListingDisplayTitle(listing, tFn) || listing.title;
  const title = `${displayTitle} | Kupito`;
  const description = buildListingOgDescription(listing, t.metadata.listing.defaultDescription);

  const firstImage =
    listing.images && listing.images.length > 0 ? getOptimizedImageUrl(listing.images[0]) : '';
  const ogImage =
    firstImage && firstImage !== '/placeholder-car.jpg'
      ? firstImage.startsWith('http')
        ? firstImage
        : `${siteUrl}${firstImage}`
      : `${siteUrl}/og-image.jpg`;

  return {
    title,
    description,
    keywords: [
      listing.title,
      displayTitle,
      listing.city,
      t.metadata.listing.keywords.cars,
      t.metadata.listing.keywords.buyCar,
      t.metadata.listing.keywords.carsForSale,
      t.metadata.listing.keywords.moldova,
    ].filter(Boolean),
    alternates: {
      canonical: `${siteUrl}/listings/${listing.id}`,
    },
    openGraph: {
      type: 'website',
      url: `${siteUrl}/listings/${listing.id}`,
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: displayTitle,
        },
      ],
      siteName: 'Kupito',
      locale: siteConfig.locale,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListing(id);

  if (!listing || !listing.id) {
    notFound();
  }

  const locale = await getMetadataLocale();
  const t = getServerTranslations(locale);
  const tFn = getTFromTranslations(t);
  const displayTitle = getListingDisplayTitle(listing, tFn) || listing.title;
  const breadcrumbJsonLd = buildListingBreadcrumbJsonLd(
    listing,
    t.listingDetail.home,
    displayTitle
  );
  const listingJsonLd = buildListingJsonLd(listing);

  return (
    <>
      <script
        id="structured-data-breadcrumb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toSafeJsonLdHtml(breadcrumbJsonLd) }}
      />
      <script
        id="structured-data-listing"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toSafeJsonLdHtml(listingJsonLd) }}
      />
      <ListingPageClient listingId={id} initialListing={listing} />
    </>
  );
}
