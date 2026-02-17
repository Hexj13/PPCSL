'use client';

import { useEffect } from 'react';

import type { Listing } from '@/lib/api';
import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry, getOptimizedImageUrl } from '@/lib/utils';

interface StructuredDataProps {
  listing: Listing;
}

function getBreadcrumbSchema(listing: Listing, siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Почетна', item: siteUrl },
      {
        '@type': 'ListItem',
        position: 2,
        name: listing.title,
        item: `${siteUrl}/listings/${listing.id}`,
      },
    ],
  };
}

function getSellerSchema(listing: Listing): { '@type': string; name: string } | undefined {
  if (!listing.user) return undefined;
  const name =
    listing.user.type === 'Business'
      ? listing.user.companyName || listing.user.email
      : `${listing.user.firstName || ''} ${listing.user.lastName || ''}`.trim() ||
        listing.user.email;
  return {
    '@type': listing.user.type === 'Business' ? 'Organization' : 'Person',
    name,
  };
}

function getVehicleExtras(listing: Listing): Record<string, unknown> | undefined {
  const vehicle = listing.vehicle;
  if (!vehicle) return undefined;
  const mileage = vehicle.mileage_km
    ? { '@type': 'QuantitativeValue' as const, value: vehicle.mileage_km, unitCode: 'KMT' as const }
    : undefined;
  const vehicleEngine = vehicle.engine_displ_l
    ? {
        '@type': 'EngineSpecification' as const,
        engineDisplacement: {
          '@type': 'QuantitativeValue' as const,
          value: vehicle.engine_displ_l,
          unitCode: 'LTR' as const,
        },
      }
    : undefined;
  return {
    vehicleIdentificationNumber: listing.vin || undefined,
    productionDate: vehicle.year ? `${vehicle.year}-01-01` : undefined,
    mileageFromOdometer: mileage,
    vehicleEngine,
  };
}

function getOffersSchema(listing: Listing, siteUrl: string, currency: string) {
  const priceValidUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const availability =
    listing.status === 'Active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
  const priceFields =
    listing.price !== undefined
      ? {
          price: listing.price.toString(),
          priceCurrency: listing.currency || currency,
          priceValidUntil,
        }
      : {};
  return {
    '@type': 'Offer',
    ...priceFields,
    availability,
    url: `${siteUrl}/listings/${listing.id}`,
  };
}

function getProductSchemaData(
  listing: Listing,
  siteUrl: string,
  currency: string,
  countryCode: string,
) {
  const vehicle = listing.vehicle;
  const brandName = vehicle?.brand?.name || '';
  const modelName = vehicle?.model?.name || '';
  const description = listing.description
    ? listing.description.replace(/<[^>]*>/g, '').substring(0, 500)
    : listing.title;
  const imageList = listing.images?.length
    ? listing.images.map((img) => getOptimizedImageUrl(img))
    : [`${siteUrl}/placeholder-car.jpg`];

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description,
    image: imageList,
    brand: brandName ? { '@type': 'Brand', name: brandName } : undefined,
    model: modelName || undefined,
    category: 'Vehicle',
    offers: getOffersSchema(listing, siteUrl, currency),
    ...getVehicleExtras(listing),
    seller: getSellerSchema(listing),
    locationCreated: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: listing.city,
        addressCountry: countryCode,
      },
    },
  };
}

export function StructuredData({ listing }: StructuredDataProps) {
  useEffect(() => {
    const country = getCountry();
    const siteConfig = loadSiteConfigSync(country);
    const siteUrl = siteConfig.siteUrl;
    const breadcrumbSchema = getBreadcrumbSchema(listing, siteUrl);
    const schemaData = getProductSchemaData(
      listing,
      siteUrl,
      siteConfig.currency,
      siteConfig.countryCode,
    );

    const breadcrumbScript = document.createElement('script');
    breadcrumbScript.type = 'application/ld+json';
    breadcrumbScript.id = 'structured-data-breadcrumb';
    breadcrumbScript.text = JSON.stringify(breadcrumbSchema, null, 0);
    document.head.appendChild(breadcrumbScript);

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'structured-data-listing';
    script.text = JSON.stringify(schemaData, null, 0);
    document.head.appendChild(script);

    return () => {
      const existingBreadcrumbScript = document.getElementById('structured-data-breadcrumb');
      if (existingBreadcrumbScript) document.head.removeChild(existingBreadcrumbScript);
      const existingScript = document.getElementById('structured-data-listing');
      if (existingScript) document.head.removeChild(existingScript);
    };
  }, [listing]);

  return null;
}
