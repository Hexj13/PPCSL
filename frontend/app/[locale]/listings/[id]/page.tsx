import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import type { Listing } from '@/lib/api';
import { fetchCities } from '@/lib/api';
import {
  getMetadataLocaleFromParams,
  getServerTranslations,
  getTFromTranslations,
  type Locale,
  type Translations,
} from '@/lib/i18n';
import {
  getListingPlainDescriptionForSchema,
  getListingDescriptionForLocale,
} from '@/lib/listingDescriptionLocale';
import { loadSiteConfigSync } from '@/lib/site-config';
import {
  absoluteUrlWithLocalePrefix,
  canonicalForLocaleFromRo,
  hreflangLanguagesFromRoCanonical,
  isLanguageSwitcherEnabled,
} from '@/lib/url-locale';
import {
  formatTireSize,
  getCityName,
  getCountry,
  getListingDisplayTitle,
  getListingHref,
  getListingPublicPathSegment,
  getOptimizedImageUrl,
  getTireModelDisplayLabel,
  getVehicleType,
  isTireListing,
  isVinMasked,
  extractListingIdFromRouteParam,
  toSafeJsonLdHtml,
  buildListingSeoTitle,
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

function listingPageUrlOnSite(listing: Listing, locale: Locale): string {
  return `${siteUrl}${getListingHref(listing, locale)}`;
}

function fillMetaTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

function buildListingOgAltForMeta(listing: Listing, locale: Locale, t: Translations): string {
  const cityLabel = getCityName(listing.city, locale);
  if (isTireListing(listing) && listing.tire) {
    return fillMetaTemplate(t.metadata.listing.ogAltTire, {
      title: listing.title,
      city: cityLabel,
    });
  }
  const v = listing.vehicle;
  const brand = v?.brand?.name ?? '';
  const model = v?.model?.name ?? '';
  const year = v?.year != null ? String(v.year) : '';
  return fillMetaTemplate(t.metadata.listing.ogAltVehicle, {
    brand,
    model,
    year,
    city: cityLabel,
  });
}

function getVehicleSchemaKind(listing: Listing): 'Car' | 'MotorVehicle' {
  const vt = getVehicleType(listing);
  return vt === 'car' ? 'Car' : 'MotorVehicle';
}

function getListingItemCondition(listing: Listing): string {
  if (isTireListing(listing) && listing.tire) {
    return listing.tire.condition === 'new'
      ? 'https://schema.org/NewCondition'
      : 'https://schema.org/UsedCondition';
  }
  return listing.is_new ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition';
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

function getOffersJsonLd(listing: Listing, locale: Locale): Record<string, unknown> | undefined {
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
    url: listingPageUrlOnSite(listing, locale),
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
  if (listing.status === 'Closed') return undefined;
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
  descriptionLocale: 'ro' | 'ru',
  locale: Locale,
): Record<string, unknown> {
  const tire = listing.tire!;
  const brandName = tire.brand?.name || '';
  const modelName = getTireModelDisplayLabel(tire);
  const description = getListingPlainDescriptionForSchema(
    listing,
    descriptionLocale,
    listing.title,
  );
  const seller = getSellerJsonLd(listing);
  const offers = getOffersJsonLd(listing, locale);
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
    itemCondition: getListingItemCondition(listing),
    url: listingPageUrlOnSite(listing, locale),
  };
}

function buildListingJsonLd(
  listing: Listing,
  tFn: (_key: string, _params?: Record<string, string | number>) => string,
  descriptionLocale: 'ro' | 'ru',
  locale: Locale,
): Record<string, unknown> {
  if (isTireListing(listing) && listing.tire) {
    return buildTireProductJsonLd(listing, tFn, descriptionLocale, locale);
  }
  const vehicle = listing.vehicle;
  const brandName = vehicle?.brand?.name || '';
  const modelName = vehicle?.model?.name || '';
  const description = getListingPlainDescriptionForSchema(
    listing,
    descriptionLocale,
    listing.title,
  );
  const seller = getSellerJsonLd(listing);
  const offers = getOffersJsonLd(listing, locale);

  return {
    '@context': 'https://schema.org',
    '@type': getVehicleSchemaKind(listing),
    name: listing.title,
    description,
    image: getListingImages(listing),
    brand: brandName ? { '@type': 'Brand', name: brandName } : undefined,
    model: modelName || undefined,
    itemCondition: getListingItemCondition(listing),
    ...getVehicleJsonLdPart(listing),
    ...(offers && { offers }),
    ...(seller && { seller }),
    url: listingPageUrlOnSite(listing, locale),
  };
}

function buildListingBreadcrumbJsonLd(
  listing: Listing,
  homeLabel: string,
  tiresCategoryLabel: string,
  listingDisplayTitle: string,
  locale: Locale,
): Record<string, unknown> {
  const elements: Array<{ '@type': string; position: number; name: string; item: string }> = [
    {
      '@type': 'ListItem',
      position: 1,
      name: homeLabel,
      item: absoluteUrlWithLocalePrefix(siteUrl, '/', locale),
    },
  ];
  if (isTireListing(listing) && listing.tire) {
    elements.push({
      '@type': 'ListItem',
      position: 2,
      name: tiresCategoryLabel,
      item: absoluteUrlWithLocalePrefix(siteUrl, '/?category=tire', locale),
    });
  }
  elements.push({
    '@type': 'ListItem',
    position: elements.length + 1,
    name: listingDisplayTitle,
    item: listingPageUrlOnSite(listing, locale),
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

function buildListingOgDescription(
  listing: Listing,
  fallback: string,
  descriptionLocale: 'ro' | 'ru',
): string {
  const html = getListingDescriptionForLocale(listing, descriptionLocale);
  const raw = html ? stripHtml(html) : '';
  if (raw.length >= 60) return raw.slice(0, 180);
  return fallback;
}

function localeToDescriptionLocale(locale: Locale): 'ro' | 'ru' {
  return locale === 'ru' ? 'ru' : 'ro';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const locale = await getMetadataLocaleFromParams(resolvedParams);
  const t = getServerTranslations(locale);
  const rawId = resolvedParams.id;
  const resolvedId = extractListingIdFromRouteParam(rawId);
  if (!resolvedId) {
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
        canonical: canonicalForLocaleFromRo(
          `${siteUrl}/listings/${encodeURIComponent(rawId)}`,
          locale,
        ),
      },
    };
  }

  const listing = await getListing(resolvedId);
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
        canonical: canonicalForLocaleFromRo(
          `${siteUrl}/listings/${encodeURIComponent(rawId)}`,
          locale,
        ),
      },
    };
  }

  const canonicalSeg = getListingPublicPathSegment(listing);
  if (rawId !== canonicalSeg) {
    permanentRedirect(getListingHref(listing, locale));
  }

  const tFn = getTFromTranslations(t);
  const cities = await fetchCities();
  const displayTitle = getListingDisplayTitle(listing, tFn) || listing.title;
  const seoTitle = buildListingSeoTitle(listing, tFn, locale, cities) || displayTitle;
  const descriptionLocale = localeToDescriptionLocale(locale);
  const description = buildListingOgDescription(
    listing,
    t.metadata.listing.defaultDescription,
    descriptionLocale,
  );

  const firstImage =
    listing.images && listing.images.length > 0 ? getOptimizedImageUrl(listing.images[0]) : '';
  const ogImage =
    firstImage && firstImage !== '/placeholder-car.jpg'
      ? firstImage.startsWith('http')
        ? firstImage
        : `${siteUrl}${firstImage}`
      : `${siteUrl}/og-image.jpg`;
  const ogImageAlt = buildListingOgAltForMeta(listing, locale, t);

  const roCanonical = `${siteUrl}${getListingHref(listing, 'ro')}`;
  const canonical = canonicalForLocaleFromRo(roCanonical, locale);
  const alternates = isLanguageSwitcherEnabled()
    ? { canonical, languages: hreflangLanguagesFromRoCanonical(roCanonical) }
    : { canonical };

  return {
    title: { absolute: seoTitle },
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
    alternates,
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
      url: canonical,
      title: seoTitle,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: ogImageAlt,
        },
      ],
      siteName: 'Kupito',
      locale: siteConfig.locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: seoTitle,
      description,
      images: [{ url: ogImage, alt: ogImageAlt }],
    },
  };
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const resolvedParams = await params;
  const locale = await getMetadataLocaleFromParams(resolvedParams);
  const rawId = resolvedParams.id;
  const resolvedId = extractListingIdFromRouteParam(rawId);
  if (!resolvedId) {
    notFound();
  }
  const listing = await getListing(resolvedId);

  if (!listing || !listing.id) {
    notFound();
  }

  const canonicalSeg = getListingPublicPathSegment(listing);
  if (rawId !== canonicalSeg) {
    permanentRedirect(getListingHref(listing, locale));
  }

  const t = getServerTranslations(locale);
  const tFn = getTFromTranslations(t);
  const displayTitle = getListingDisplayTitle(listing, tFn) || listing.title;
  const breadcrumbJsonLd = buildListingBreadcrumbJsonLd(
    listing,
    t.listingDetail.home,
    t.searchFilters.tiresCategory,
    displayTitle,
    locale,
  );
  const listingJsonLd = buildListingJsonLd(listing, tFn, localeToDescriptionLocale(locale), locale);

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
      <ListingPageClient key={resolvedId} listingId={resolvedId} initialListing={listing} />
    </>
  );
}
