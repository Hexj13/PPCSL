import type { Metadata } from 'next';

import { formatPrice } from '@/lib/utils';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.mk';
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function getListing(id: string) {
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

    const listing = await response.json();
    return listing;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);

  if (!listing) {
    return {
      title: 'Објава не е пронајдена',
      description: 'Објавата не постои или не е достапна.',
    };
  }

  const title = listing.title || 'Автомобил за продажба';
  const vehicleInfo = listing.vehicle
    ? `${listing.vehicle.brand?.name || ''} ${listing.vehicle.model?.name || ''} ${listing.vehicle.year || ''}`.trim()
    : '';
  const priceText =
    listing.price !== undefined
      ? `${formatPrice(listing.price, listing.currency)} ${listing.currency}`
      : '';
  const description =
    listing.description?.replace(/<[^>]*>/g, '').substring(0, 160) ||
    `${vehicleInfo || title}${priceText ? ` - ${priceText}` : ''}. Купете или продадете авто на Kupito!`;
  const imageUrl =
    listing.images && listing.images.length > 0
      ? getOptimizedImageUrl(listing.images[0])
      : `${siteUrl}/placeholder-car.jpg`;

  const fullTitle = vehicleInfo ? `${vehicleInfo} - ${title}` : title;

  return {
    title: fullTitle,
    description,
    keywords: [
      listing.title,
      vehicleInfo,
      listing.city,
      'автомобили',
      'купи автомобил',
      'автомобили за продажба',
      'Северна Македонија',
    ].filter(Boolean),
    openGraph: {
      type: 'website',
      locale: 'mk_MK',
      url: `${siteUrl}/listings/${id}`,
      title: fullTitle,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      siteName: 'Kupito',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: `${siteUrl}/listings/${id}`,
    },
  };
}

function getOptimizedImageUrl(imageUrl: string): string {
  if (!imageUrl || imageUrl === '/placeholder-car.jpg') {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.mk';
    return `${siteUrl}/placeholder-car.jpg`;
  }

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    if (process.env.NODE_ENV === 'production' && imageUrl.startsWith('http://')) {
      return imageUrl.replace('http://', 'https://');
    }
    return imageUrl;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  let fullUrl = '';
  if (imageUrl.startsWith('/')) {
    fullUrl = `${apiUrl}${imageUrl}`;
  } else {
    fullUrl = `${apiUrl}/${imageUrl}`;
  }

  if (process.env.NODE_ENV === 'production' && fullUrl.startsWith('http://')) {
    return fullUrl.replace('http://', 'https://');
  }

  return fullUrl;
}

export default function ListingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
