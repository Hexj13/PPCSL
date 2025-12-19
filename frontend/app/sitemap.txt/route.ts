import { NextResponse } from 'next/server';

import { Listing } from '@/lib/api';
import { POPULAR_BRANDS, POPULAR_MODELS_BY_BRAND } from '@/lib/popular-brands';
import { fetchBrands, fetchModelsByBrands } from '@/lib/server-api';
import { createSlug } from '@/lib/utils';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.club';
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const SITEMAP_TIMEOUT_MS = 10_000;
const LISTINGS_PER_PAGE = 1_000;
const MAX_LISTING_URLS = 45_000;

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

  const brandModelUrls: string[] = [];
  const addedUrls = new Set<string>();

  if (apiUrl) {
    try {
      const allBrands = await fetchBrands();

      allBrands.forEach((brand) => {
        const brandSlug = createSlug(brand.name);
        const brandUrl = `${siteUrl}/?brand=${brandSlug}`;
        if (!addedUrls.has(brandUrl)) {
          brandModelUrls.push(brandUrl);
          addedUrls.add(brandUrl);
        }
      });

      const brandIds = allBrands.map((brand) => brand.id);
      const modelsByBrand = await fetchModelsByBrands(brandIds);

      allBrands.forEach((brand) => {
        const brandSlug = createSlug(brand.name);
        const models = modelsByBrand[brand.id] || [];

        models.forEach((model) => {
          const modelSlug = createSlug(model.name);
          const brandModelUrl = `${siteUrl}/?brand=${brandSlug}&model=${modelSlug}`;
          if (!addedUrls.has(brandModelUrl)) {
            brandModelUrls.push(brandModelUrl);
            addedUrls.add(brandModelUrl);
          }
        });
      });
    } catch {
      // ignore
    }
  }

  POPULAR_BRANDS.forEach((brand) => {
    const brandSlug = createSlug(brand);
    const brandUrl = `${siteUrl}/?brand=${brandSlug}`;
    const models = POPULAR_MODELS_BY_BRAND[brand] || [];

    if (models.length > 0 && !addedUrls.has(brandUrl)) {
      brandModelUrls.push(brandUrl);
      addedUrls.add(brandUrl);
    }

    models.forEach((model) => {
      const modelSlug = createSlug(model);
      const brandModelUrl = `${siteUrl}/?brand=${brandSlug}&model=${modelSlug}`;
      if (!addedUrls.has(brandModelUrl)) {
        brandModelUrls.push(brandModelUrl);
        addedUrls.add(brandModelUrl);
      }
    });
  });

  if (!apiUrl) {
    return [...urls, ...brandModelUrls];
  }

  const listingUrls: string[] = [];
  let page = 1;

  while (listingUrls.length < MAX_LISTING_URLS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SITEMAP_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${apiUrl}/api/listings?limit=${LISTINGS_PER_PAGE}&page=${page}&status=Active`,
        {
          next: { revalidate: 3600 },
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) break;

      const data = await response.json().catch(() => null);
      if (!data || !Array.isArray(data.data)) break;

      const listings = (data.data as Listing[]).filter((listing) => listing?.id);
      if (listings.length === 0) break;

      for (const listing of listings) {
        if (!listing?.id) continue;
        const listingUrl = ensureAbsoluteUrl(`/listings/${listing.id}`);
        if (!listingUrl || !listingUrl.startsWith('http')) continue;
        listingUrls.push(listingUrl);
        if (listingUrls.length >= MAX_LISTING_URLS) break;
      }

      page += 1;
    } catch {
      break;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return [...urls, ...brandModelUrls, ...listingUrls];
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
