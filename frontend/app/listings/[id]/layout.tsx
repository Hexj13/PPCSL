import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.club';
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

  const brand = listing.vehicle?.brand?.name || '';
  const model = listing.vehicle?.model?.name || '';
  const year = listing.vehicle?.year || '';
  const vehicleInfo = [brand, model, year].filter(Boolean).join(' ');
  const fullTitle = vehicleInfo || listing.title || 'Автомобил за продажба';

  const description =
    listing.description?.replace(/<[^>]*>/g, '').substring(0, 160) ||
    `${vehicleInfo || listing.title || 'Автомобил за продажба'}. Купете или продадете авто на Kupito! Објавете оглас бесплатно.`;

  const imageUrl =
    listing.images && listing.images.length > 0
      ? getOptimizedImageUrl(listing.images[0])
      : `${siteUrl}/og-image.jpg`;

  const listingUrl = `${siteUrl}/listings/${id}`;

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
      url: listingUrl,
      title: fullTitle,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
      siteName: 'Kupito',
      locale: 'mk_MK',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: listingUrl,
    },
  };
}

function getOptimizedImageUrl(imageUrl: string): string {
  if (!imageUrl || imageUrl === '/placeholder-car.jpg') {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.club';
    return `${siteUrl}/og-image.jpg`;
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
