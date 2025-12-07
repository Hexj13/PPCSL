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
  const now = new Date();

  const baseUrls: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: ensureAbsoluteUrl('/listings'),
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: ensureAbsoluteUrl('/terms'),
      lastModified: staticPagesLastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: ensureAbsoluteUrl('/privacy'),
      lastModified: staticPagesLastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: ensureAbsoluteUrl('/faq'),
      lastModified: staticPagesLastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: ensureAbsoluteUrl('/cookie-settings'),
      lastModified: staticPagesLastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];

  if (!process.env.NEXT_PUBLIC_API_URL) {
    return baseUrls;
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${apiUrl}/api/listings?limit=10000&status=Active`, {
        next: { revalidate: 3600 },
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return baseUrls;
      }

      const data = await response.json().catch(() => null);

      if (!data || !Array.isArray(data.data)) {
        return baseUrls;
      }

      const listings = data.data.filter((listing: Listing) => listing?.id);

      const listingUrls: MetadataRoute.Sitemap = listings
        .map((listing: Listing) => {
          try {
            if (!listing.id) {
              return null;
            }

            let lastModified: Date;
            if (listing.updated_at || listing.created_at) {
              const dateStr = listing.updated_at || listing.created_at;
              lastModified = new Date(dateStr);
              if (isNaN(lastModified.getTime())) {
                lastModified = now;
              }
            } else {
              lastModified = now;
            }

            const listingUrl = ensureAbsoluteUrl(`/listings/${listing.id}`);
            if (!listingUrl || !listingUrl.startsWith('http')) {
              return null;
            }

            return {
              url: listingUrl,
              lastModified,
              changeFrequency: 'weekly' as const,
              priority: 0.8,
            };
          } catch {
            return null;
          }
        })
        .filter((item): item is MetadataRoute.Sitemap[0] => item !== null);

      return [...baseUrls, ...listingUrls];
    } finally {
      clearTimeout(timeoutId);
    }
  } catch {
    return baseUrls;
  }
}
