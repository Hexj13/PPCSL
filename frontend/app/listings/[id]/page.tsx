import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import type { Listing } from '@/lib/api';
import { getMetadataLocale, getServerTranslations, getTFromTranslations } from '@/lib/i18n';
import { loadSiteConfigSync } from '@/lib/site-config';
import {
  formatTireSize,
  getCountry,
  getListingDisplayTitle,
  getOptimizedImageUrl,
  getTireModelDisplayLabel,
  isTireListing,
  isVinMasked,
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

function getListingImages(listing: Listing): string[] {
  if (listing.images && listing.images.length > 0) {
    return listing.images.map((img) => getOptimizedImageUrl(img));
  }
  return [`${siteUrl}/placeholder-car.jpg`];
}

function getVehicleJsonLdPart(listing: Listing): Record<string, unknown> {
  const vehicle = listing.vehicle;
  if (!vehicle) return {};

  const year = vehicle?.year;
  const vinForSchema =
    listing.vin?.trim() && !isVinMasked(listing.vin) ? listing.vin.trim() : undefined;
  return {
    vehicleIdentificationNumber: vinForSchema,
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
  };
}

function getOffersJsonLd(listing: Listing): Record<string, unknown> | undefined {
  if (listing.price === undefined || listing.price === null) {
    return undefined;
  }

  return {
    '@type': 'Offer',
    price: listing.price.toString(),
    priceCurrency: listing.currency || siteConfig.currency,
    priceValidUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    availability:
      listing.status === 'Active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
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
  };
}

function getSellerJsonLd(listing: Listing): Record<string, unknown> | undefined {
  const user = listing.user;
  if (!user) return undefined;
  const type = user.type === 'Business' ? 'Organization' : 'Person';
  const name =
    user.type === 'Business'
      ? user.companyName || user.email
      : `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
  return { '@type': type, name };
}

function buildTireProductJsonLd(
  listing: Listing,
  tFn: (_key: string, _params?: Record<string, string | number>) => string,
): Record<string, unknown> {
  const tire = listing.tire!;
  const brandName = tire.brand?.name || '';
  const modelName = getTireModelDisplayLabel(tire);
  const description = listing.description
    ? listing.description.replace(/<[^>]*>/g, '').substring(0, 500)
    : listing.title;
  const seller = getSellerJsonLd(listing);
  const offers = getOffersJsonLd(listing);
  const additional: Array<{ '@type': string; name: string; value: string }> = [
    { '@type': 'PropertyValue', name: 'Size', value: formatTireSize(tire) },
    {
      '@type': 'PropertyValue',
      name: tFn('listingDetail.tireTread'),
      value: tFn(`searchFilters.tireTreadOption.${tire.season}`),
    },
    {
      '@type': 'PropertyValue',
      name: tFn('listingDetail.tireCondition'),
      value: tFn(`searchFilters.tireConditionOption.${tire.condition}`),
    },
    {
      '@type': 'PropertyValue',
      name: tFn('listings.tireForm.quantityLabel'),
      value: String(tire.quantity),
    },
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description,
    image: getListingImages(listing),
    brand: brandName ? { '@type': 'Brand', name: brandName } : undefined,
    model: modelName || undefined,
    category: 'Tire',
    additionalProperty: additional,
    ...(offers && { offers }),
    ...(seller && { seller }),
    url: `${siteUrl}/listings/${listing.id}`,
  };
}

function buildListingJsonLd(
  listing: Listing,
  tFn: (_key: string, _params?: Record<string, string | number>) => string,
): Record<string, unknown> {
  if (isTireListing(listing) && listing.tire) {
    return buildTireProductJsonLd(listing, tFn);
  }
  const vehicle = listing.vehicle;
  const brandName = vehicle?.brand?.name || '';
  const modelName = vehicle?.model?.name || '';
  const description = listing.description
    ? listing.description.replace(/<[^>]*>/g, '').substring(0, 500)
    : listing.title;
  const seller = getSellerJsonLd(listing);
  const offers = getOffersJsonLd(listing);

  return {
    '@context': 'https://schema.org',
    '@type': 'Vehicle',
    name: listing.title,
    description,
    image: getListingImages(listing),
    brand: brandName ? { '@type': 'Brand', name: brandName } : undefined,
    model: modelName || undefined,
    ...getVehicleJsonLdPart(listing),
    ...(offers && { offers }),
    ...(seller && { seller }),
    url: `${siteUrl}/listings/${listing.id}`,
  };
}

function buildListingBreadcrumbJsonLd(
  listing: Listing,
  homeLabel: string,
  tiresCategoryLabel: string,
  listingDisplayTitle: string,
): Record<string, unknown> {
  const elements: Array<{ '@type': string; position: number; name: string; item: string }> = [
    {
      '@type': 'ListItem',
      position: 1,
      name: homeLabel,
      item: siteUrl,
    },
  ];
  if (isTireListing(listing) && listing.tire) {
    elements.push({
      '@type': 'ListItem',
      position: 2,
      name: tiresCategoryLabel,
      item: `${siteUrl}?category=tire`,
    });
  }
  elements.push({
    '@type': 'ListItem',
    position: elements.length + 1,
    name: listingDisplayTitle,
    item: `${siteUrl}/listings/${listing.id}`,
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: elements,
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
    ...(listing.status === 'Closed' && {
      robots: {
        index: false,
        follow: true,
        googleBot: {
          index: false,
          follow: true,
        },
      },
    }),
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
    t.searchFilters.tiresCategory,
    displayTitle,
  );
  const listingJsonLd = buildListingJsonLd(listing, tFn);

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
