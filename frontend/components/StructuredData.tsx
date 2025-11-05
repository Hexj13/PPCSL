'use client';

import { useEffect } from 'react';

import { Listing } from '@/lib/api';
import { getOptimizedImageUrl } from '@/lib/utils';

interface StructuredDataProps {
  listing: Listing;
}

export function StructuredData({ listing }: StructuredDataProps) {
  useEffect(() => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.mk';

    const vehicle = listing.vehicle;
    const brandName = vehicle?.brand?.name || '';
    const modelName = vehicle?.model?.name || '';
    const year = vehicle?.year;

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Почетна',
          item: siteUrl,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: listing.title,
          item: `${siteUrl}/listings/${listing.id}`,
        },
      ],
    };

    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: listing.title,
      description: listing.description
        ? listing.description.replace(/<[^>]*>/g, '').substring(0, 500)
        : listing.title,
      image:
        listing.images && listing.images.length > 0
          ? listing.images.map((img) => getOptimizedImageUrl(img))
          : [`${siteUrl}/placeholder-car.jpg`],
      brand: brandName
        ? {
            '@type': 'Brand',
            name: brandName,
          }
        : undefined,
      model: modelName || undefined,
      category: 'Vehicle',
      offers: {
        '@type': 'Offer',
        price: listing.price.toString(),
        priceCurrency: listing.currency || 'MKD',
        availability:
          listing.status === 'Active'
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        url: `${siteUrl}/listings/${listing.id}`,
        priceValidUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
      },
      ...(vehicle && {
        vehicleIdentificationNumber: listing.vin || undefined,
        productionDate: year ? `${year}-01-01` : undefined,
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
      }),
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
      locationCreated: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressLocality: listing.city,
          addressCountry: 'MK',
        },
      },
    };

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
      if (existingBreadcrumbScript) {
        document.head.removeChild(existingBreadcrumbScript);
      }
      const existingScript = document.getElementById('structured-data-listing');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, [listing]);

  return null;
}
