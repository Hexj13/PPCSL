'use client';

import { useEffect } from 'react';

import { useI18n } from '@/components/providers/I18nProvider';
import { useTranslation } from '@/hooks/useTranslation';
import type { Listing } from '@/lib/api';
import { getListingPlainDescriptionForSchema } from '@/lib/listingDescriptionLocale';
import { loadSiteConfigSync } from '@/lib/site-config';
import {
  createSlug,
  formatTireSize,
  formatTransmission,
  getCountry,
  getTireModelDisplayLabel,
  getVehicleType,
  getOptimizedImageUrl,
  isTireListing,
  isVinMasked,
} from '@/lib/utils';

interface StructuredDataProps {
  listing: Listing;
}

function buildBreadcrumbSearchUrl(
  type: 'category' | 'transmission' | 'brand' | 'model',
  listing: Listing,
  siteUrl: string,
): string {
  const vehicleType = getVehicleType(listing);
  const params = new URLSearchParams();

  if (type === 'category') {
    if (vehicleType !== 'car') params.set('vehicleType', vehicleType);
    return params.toString() ? `${siteUrl}?${params.toString()}` : siteUrl;
  }

  if (vehicleType !== 'car') {
    params.set('vehicleType', vehicleType);
  }

  if (type === 'transmission') {
    const transmission = listing.vehicle?.transmission;
    if (transmission) params.set('transmissions', transmission);
    return params.toString() ? `${siteUrl}?${params.toString()}` : siteUrl;
  }

  const brand = listing.vehicle?.brand;
  const model = listing.vehicle?.model;

  if (type === 'brand' && brand?.name) {
    params.set('brand', createSlug(brand.name));
    return params.toString() ? `${siteUrl}?${params.toString()}` : siteUrl;
  }

  if (type === 'model' && brand?.name && model?.name) {
    params.set('brand', createSlug(brand.name));
    params.set('model', createSlug(model.name));
    return params.toString() ? `${siteUrl}?${params.toString()}` : siteUrl;
  }

  return siteUrl;
}

function getBreadcrumbSchema(
  listing: Listing,
  siteUrl: string,
  categoryLabel: string,
  transmissionLabel: string | null,
) {
  const vehicle = listing.vehicle;
  const brandName = vehicle?.brand?.name;
  const modelName = vehicle?.model?.name;

  const items: Array<{ '@type': string; position: number; name: string; item: string }> = [
    {
      '@type': 'ListItem',
      position: 1,
      name: categoryLabel,
      item: buildBreadcrumbSearchUrl('category', listing, siteUrl),
    },
  ];
  let position = 2;
  if (transmissionLabel) {
    items.push({
      '@type': 'ListItem',
      position: position++,
      name: transmissionLabel,
      item: buildBreadcrumbSearchUrl('transmission', listing, siteUrl),
    });
  }
  if (brandName) {
    items.push({
      '@type': 'ListItem',
      position: position++,
      name: brandName,
      item: buildBreadcrumbSearchUrl('brand', listing, siteUrl),
    });
  }
  if (modelName) {
    items.push({
      '@type': 'ListItem',
      position: position++,
      name: modelName,
      item: buildBreadcrumbSearchUrl('model', listing, siteUrl),
    });
  }
  items.push({
    '@type': 'ListItem',
    position: position,
    name: listing.title || modelName || brandName || 'Listing',
    item: `${siteUrl}/listings/${listing.id}`,
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

function getSellerSchema(listing: Listing): { '@type': string; name: string } | undefined {
  if (listing.status === 'Closed') return undefined;
  if (!listing.user) return undefined;
  const name =
    listing.user.type === 'Business'
      ? listing.user.companyName || listing.user.email
      : `${listing.user.firstName || ''} ${listing.user.lastName || ''}`.trim() ||
        listing.user.email;
  if (!name) return undefined;
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
  const vinForSchema =
    listing.vin?.trim() && !isVinMasked(listing.vin) ? listing.vin.trim() : undefined;
  return {
    vehicleIdentificationNumber: vinForSchema,
    productionDate: vehicle.year ? `${vehicle.year}-01-01` : undefined,
    mileageFromOdometer: mileage,
    vehicleEngine,
  };
}

function getOffersSchema(
  listing: Listing,
  siteUrl: string,
  currency: string,
): Record<string, unknown> | undefined {
  if (listing.price === undefined || listing.price === null) {
    return undefined;
  }

  const priceValidUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const availability =
    listing.status === 'Active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
  return {
    '@type': 'Offer',
    price: listing.price.toString(),
    priceCurrency: listing.currency || currency,
    priceValidUntil,
    availability,
    url: `${siteUrl}/listings/${listing.id}`,
  };
}

function getTireBreadcrumbSchema(listing: Listing, siteUrl: string, tiresCategoryLabel: string) {
  const tire = listing.tire!;
  const items: Array<{ '@type': string; position: number; name: string; item: string }> = [
    {
      '@type': 'ListItem',
      position: 1,
      name: tiresCategoryLabel,
      item: `${siteUrl}/?category=tire`,
    },
  ];
  let position = 2;
  if (tire.brand?.name && tire.brand?.id) {
    const p = new URLSearchParams();
    p.set('category', 'tire');
    p.set('tire_brand_ids', tire.brand.id);
    items.push({
      '@type': 'ListItem',
      position: position++,
      name: tire.brand.name,
      item: `${siteUrl}/?${p.toString()}`,
    });
  }
  const modelDisplay = getTireModelDisplayLabel(tire) || undefined;
  if (modelDisplay && tire.model?.id && !tire.model?.is_other) {
    const p = new URLSearchParams();
    p.set('category', 'tire');
    if (tire.brand?.id) p.set('tire_brand_ids', tire.brand.id);
    p.append('tire_model_ids', tire.model.id);
    items.push({
      '@type': 'ListItem',
      position: position++,
      name: modelDisplay,
      item: `${siteUrl}/?${p.toString()}`,
    });
  }
  items.push({
    '@type': 'ListItem',
    position,
    name: listing.title || modelDisplay || tire.brand?.name || 'Listing',
    item: `${siteUrl}/listings/${listing.id}`,
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

function getTireProductSchemaData(
  listing: Listing,
  siteUrl: string,
  currency: string,
  countryCode: string,
  descriptionLocale: 'ro' | 'ru',
) {
  const tire = listing.tire!;
  const brandName = tire.brand?.name || '';
  const modelName = getTireModelDisplayLabel(tire);
  const description = getListingPlainDescriptionForSchema(
    listing,
    descriptionLocale,
    listing.title,
  );
  const imageList = listing.images?.length
    ? listing.images.map((img) => getOptimizedImageUrl(img))
    : [`${siteUrl}/placeholder-car.jpg`];
  const offers = getOffersSchema(listing, siteUrl, currency);
  const additional: Array<{ '@type': string; name: string; value: string }> = [
    { '@type': 'PropertyValue', name: 'Size', value: formatTireSize(tire) },
    { '@type': 'PropertyValue', name: 'Season', value: tire.season },
    { '@type': 'PropertyValue', name: 'Condition', value: tire.condition },
    { '@type': 'PropertyValue', name: 'Quantity', value: String(tire.quantity) },
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description,
    image: imageList,
    brand: brandName ? { '@type': 'Brand', name: brandName } : undefined,
    model: modelName || undefined,
    category: 'Tire',
    additionalProperty: additional,
    ...(offers && { offers }),
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

function getProductSchemaData(
  listing: Listing,
  siteUrl: string,
  currency: string,
  countryCode: string,
  descriptionLocale: 'ro' | 'ru',
) {
  const vehicle = listing.vehicle;
  const brandName = vehicle?.brand?.name || '';
  const modelName = vehicle?.model?.name || '';
  const description = getListingPlainDescriptionForSchema(
    listing,
    descriptionLocale,
    listing.title,
  );
  const imageList = listing.images?.length
    ? listing.images.map((img) => getOptimizedImageUrl(img))
    : [`${siteUrl}/placeholder-car.jpg`];
  const offers = getOffersSchema(listing, siteUrl, currency);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description,
    image: imageList,
    brand: brandName ? { '@type': 'Brand', name: brandName } : undefined,
    model: modelName || undefined,
    category: 'Vehicle',
    ...(offers && { offers }),
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
  const { t } = useTranslation();
  const { locale } = useI18n();
  const descriptionLocale = locale === 'ru' ? 'ru' : 'ro';
  const vehicleType = getVehicleType(listing);
  const transmissionLabel = listing.vehicle?.transmission
    ? formatTransmission(listing.vehicle.transmission, t)
    : null;
  const fullCategoryKey = `listings.vehicleTypeFull.${vehicleType}`;
  const fallbackCategoryKey = `listings.vehicleType.${vehicleType}`;
  const fullCategoryLabel = t(fullCategoryKey);
  const fallbackCategoryLabel = t(fallbackCategoryKey);
  const categoryLabel =
    (fullCategoryLabel && fullCategoryLabel !== fullCategoryKey ? fullCategoryLabel : '') ||
    (fallbackCategoryLabel && fallbackCategoryLabel !== fallbackCategoryKey
      ? fallbackCategoryLabel
      : t('breadcrumbs.transport'));
  const tiresCategoryLabel = t('searchFilters.tiresCategory');

  useEffect(() => {
    const country = getCountry();
    const siteConfig = loadSiteConfigSync(country);
    const siteUrl = siteConfig.siteUrl;
    const isTire = isTireListing(listing) && listing.tire;
    const breadcrumbSchema = isTire
      ? getTireBreadcrumbSchema(listing, siteUrl, tiresCategoryLabel)
      : getBreadcrumbSchema(listing, siteUrl, categoryLabel, transmissionLabel);
    const schemaData = isTire
      ? getTireProductSchemaData(
          listing,
          siteUrl,
          siteConfig.currency,
          siteConfig.countryCode,
          descriptionLocale,
        )
      : getProductSchemaData(
          listing,
          siteUrl,
          siteConfig.currency,
          siteConfig.countryCode,
          descriptionLocale,
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
  }, [listing, categoryLabel, transmissionLabel, tiresCategoryLabel, descriptionLocale]);

  return null;
}
