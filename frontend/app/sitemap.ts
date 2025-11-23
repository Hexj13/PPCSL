import { MetadataRoute } from 'next';

import { Listing } from '@/lib/api';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.club';

function ensureAbsoluteUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${siteUrl}${url.startsWith('/') ? url : `/${url}`}`;
}

const staticPagesLastModified = new Date('2025-01-01');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrls: MetadataRoute.Sitemap = [
    {
      url: ensureAbsoluteUrl(siteUrl),
      lastModified: staticPagesLastModified,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: ensureAbsoluteUrl('/listings'),
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: ensureAbsoluteUrl('/terms'),
      lastModified: staticPagesLastModified,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: ensureAbsoluteUrl('/privacy'),
      lastModified: staticPagesLastModified,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: ensureAbsoluteUrl('/faq'),
      lastModified: staticPagesLastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${apiUrl}/api/listings?limit=10000&status=Active`, {
        next: { revalidate: 3600 },
        signal: controller.signal,
      });

      if (!response.ok) {
        return baseUrls;
      }

      const data = await response.json().catch(() => null);
      
      if (!data || !Array.isArray(data.data)) {
        return baseUrls;
      }

      const listings = data.data.filter((listing: Listing) => listing?.id);

      const listingUrls: MetadataRoute.Sitemap = listings.map((listing: Listing) => ({
        url: ensureAbsoluteUrl(`/listings/${listing.id}`),
        lastModified: listing.updated_at || listing.created_at 
          ? new Date(listing.updated_at || listing.created_at)
          : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));

      return [...baseUrls, ...listingUrls];
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Sitemap generation error:', error);
    }
    return baseUrls;
  }
}
