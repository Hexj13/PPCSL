import { MetadataRoute } from 'next';

import { Listing } from '@/lib/api';
import { POPULAR_BRANDS, POPULAR_MODELS_BY_BRAND } from '@/lib/popular-brands';
import { fetchBrands, fetchModelsByBrands } from '@/lib/server-api';
import { loadSiteConfigSync } from '@/lib/site-config';
import { createSlug } from '@/lib/utils';

const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';
const siteConfig = loadSiteConfigSync(country);
const siteUrl = siteConfig.siteUrl;
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const SITEMAP_TIMEOUT_MS = 10_000;
const LISTINGS_PER_SITEMAP = 5_000;

type ListingsApiResponse = {
  data: Listing[];
  meta?: {
    totalPages?: number;
  };
};

function ensureAbsoluteUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${siteUrl}${url.startsWith('/') ? url : `/${url}`}`;
}

const staticPagesLastModified = new Date('2025-01-01');

function getBaseUrls(now: Date): MetadataRoute.Sitemap {
  return [
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
}

async function getBrandModelUrls(now: Date): Promise<MetadataRoute.Sitemap> {
  const brandModelUrls: MetadataRoute.Sitemap = [];
  const addedUrls = new Set<string>();

  if (apiUrl) {
    try {
      const allBrands = await fetchBrands();

      allBrands.forEach((brand) => {
        const brandSlug = createSlug(brand.name);
        const brandUrl = `${siteUrl}/?brand=${brandSlug}`;
        if (!addedUrls.has(brandUrl)) {
          brandModelUrls.push({
            url: brandUrl,
            lastModified: now,
            changeFrequency: 'daily' as const,
            priority: 0.7,
          });
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
            brandModelUrls.push({
              url: brandModelUrl,
              lastModified: now,
              changeFrequency: 'daily' as const,
              priority: 0.6,
            });
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
      brandModelUrls.push({
        url: brandUrl,
        lastModified: now,
        changeFrequency: 'daily' as const,
        priority: 0.7,
      });
      addedUrls.add(brandUrl);
    }

    models.forEach((model) => {
      const modelSlug = createSlug(model);
      const brandModelUrl = `${siteUrl}/?brand=${brandSlug}&model=${modelSlug}`;
      if (!addedUrls.has(brandModelUrl)) {
        brandModelUrls.push({
          url: brandModelUrl,
          lastModified: now,
          changeFrequency: 'daily' as const,
          priority: 0.6,
        });
        addedUrls.add(brandModelUrl);
      }
    });
  });

  return brandModelUrls;
}

async function fetchListingsPage(page: number, limit: number): Promise<ListingsApiResponse | null> {
  if (!apiUrl) return null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SITEMAP_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${apiUrl}/api/listings?limit=${limit}&page=${page}&status=Active`,
      {
        next: { revalidate: 3600 },
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) return null;
    const data = await response.json().catch(() => null);
    if (!data || !Array.isArray(data.data)) return null;
    return data as ListingsApiResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getListingsTotalPages(limit: number): Promise<number> {
  const first = await fetchListingsPage(1, limit);
  const totalPages = typeof first?.meta?.totalPages === 'number' ? first.meta.totalPages : 0;
  if (Number.isFinite(totalPages) && totalPages > 0) return totalPages;
  return first?.data?.length ? 1 : 0;
}

export async function generateSitemaps(): Promise<Array<{ id: number }>> {
  const totalPages = await getListingsTotalPages(LISTINGS_PER_SITEMAP);
  if (!totalPages) return [{ id: 0 }];

  const ids: Array<{ id: number }> = [{ id: 0 }];
  for (let i = 1; i <= totalPages; i += 1) {
    ids.push({ id: i });
  }
  return ids;
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  if (id === 0) {
    const baseUrls = getBaseUrls(now);
    const brandModelUrls = await getBrandModelUrls(now);
    return [...baseUrls, ...brandModelUrls];
  }

  const pageData = await fetchListingsPage(id, LISTINGS_PER_SITEMAP);
  if (!pageData) return [];

  const listings = pageData.data.filter((listing: Listing) => listing?.id);

  const items: MetadataRoute.Sitemap = [];
  for (const listing of listings) {
    try {
      if (!listing?.id) continue;

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
      if (!listingUrl || !listingUrl.startsWith('http')) continue;

      items.push({
        url: listingUrl,
        lastModified,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      });
    } catch {
      // ignore
    }
  }

  return items;
}
