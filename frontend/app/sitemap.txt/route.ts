import { NextResponse } from 'next/server';

import { Listing } from '@/lib/api';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.club';

function ensureAbsoluteUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${siteUrl}${url.startsWith('/') ? url : `/${url}`}`;
}

async function getSitemapUrls(): Promise<string[]> {
  const urls: string[] = [
    siteUrl,
    ensureAbsoluteUrl('/listings'),
    ensureAbsoluteUrl('/terms'),
    ensureAbsoluteUrl('/privacy'),
    ensureAbsoluteUrl('/faq'),
    ensureAbsoluteUrl('/cookie-settings'),
  ];

  if (!process.env.NEXT_PUBLIC_API_URL) {
    return urls;
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
        return urls;
      }

      const data = await response.json().catch(() => null);

      if (!data || !Array.isArray(data.data)) {
        return urls;
      }

      const listings = data.data.filter((listing: Listing) => listing?.id);

      const listingUrls = listings
        .map((listing: Listing) => {
          try {
            if (!listing.id) {
              return null;
            }

            const listingUrl = ensureAbsoluteUrl(`/listings/${listing.id}`);
            if (!listingUrl || !listingUrl.startsWith('http')) {
              return null;
            }

            return listingUrl;
          } catch {
            return null;
          }
        })
        .filter((url): url is string => url !== null);

      return [...urls, ...listingUrls];
    } finally {
      clearTimeout(timeoutId);
    }
  } catch {
    return urls;
  }
}

export async function GET() {
  const urls = await getSitemapUrls();
  const sitemapText = urls.join('\n');

  return new NextResponse(sitemapText, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
