import { NextResponse } from 'next/server';

import { fetchBrands, fetchModelsByBrands } from '@/lib/api';
import { BODY_TYPES_BY_VEHICLE_TYPE } from '@/lib/constants';
import { loadSiteConfigSync } from '@/lib/site-config';
import { createSlug, getCountry } from '@/lib/utils';

interface SitemapEntry {
  url: string;
  lastmod: string;
  changefreq: string;
  priority: number;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map(
      (entry) =>
        `  <url>\n    <loc>${escapeXml(entry.url)}</loc>\n    <lastmod>${entry.lastmod}</lastmod>\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

async function generateEntries(): Promise<SitemapEntry[]> {
  const country = getCountry();
  const siteConfig = loadSiteConfigSync(country);
  const siteUrl = (siteConfig.siteUrl || 'https://kupito.club').replace(/\/$/, '');
  const now = new Date().toISOString().split('T')[0];
  const entries: SitemapEntry[] = [];

  entries.push(
    { url: siteUrl, lastmod: now, changefreq: 'daily', priority: 1.0 },
    { url: `${siteUrl}/listings`, lastmod: now, changefreq: 'daily', priority: 0.9 },
    { url: `${siteUrl}/terms`, lastmod: now, changefreq: 'monthly', priority: 0.3 },
    { url: `${siteUrl}/privacy`, lastmod: now, changefreq: 'monthly', priority: 0.3 },
    { url: `${siteUrl}/faq`, lastmod: now, changefreq: 'monthly', priority: 0.4 },
    { url: `${siteUrl}/cookie-settings`, lastmod: now, changefreq: 'monthly', priority: 0.2 }
  );

  try {
    const allBrands = await fetchBrands();

    const brandsByVehicleType: Record<'car' | 'truck' | 'moto', typeof allBrands> = {
      car: [],
      truck: [],
      moto: [],
    };

    allBrands.forEach((brand) => {
      const vehicleTypes = brand.vehicle_types || [];
      if (vehicleTypes.length === 0) {
        brandsByVehicleType.car.push(brand);
      } else {
        vehicleTypes.forEach((type) => {
          if (type in brandsByVehicleType) {
            brandsByVehicleType[type].push(brand);
          }
        });
      }
    });

    const addBrandEntries = async (
      brands: typeof allBrands,
      vehicleType?: 'car' | 'truck' | 'moto'
    ) => {
      const vehicleTypeParam =
        vehicleType && vehicleType !== 'car' ? `&vehicleType=${vehicleType}` : '';

      for (const brand of brands) {
        const brandSlug = createSlug(brand.name ?? '').trim();
        if (!brandSlug) continue;
        entries.push({
          url: `${siteUrl}/?brand=${brandSlug}${vehicleTypeParam}`,
          lastmod: now,
          changefreq: 'daily',
          priority: 0.8,
        });
      }

      const brandIds = brands.map((b) => b.id);
      if (brandIds.length > 0) {
        const modelsByBrand = await fetchModelsByBrands(brandIds);

        for (const brand of brands) {
          const brandSlug = createSlug(brand.name ?? '').trim();
          if (!brandSlug) continue;
          const models = modelsByBrand[brand.id] || [];

          for (const model of models) {
            const modelSlug = createSlug(model.name ?? '').trim();
            if (!modelSlug) continue;
            const modelVehicleType = model.vehicle_type;

            if (vehicleType) {
              if (!modelVehicleType || modelVehicleType !== vehicleType) {
                continue;
              }
            } else {
              if (modelVehicleType && modelVehicleType !== 'car') {
                continue;
              }
            }

            const urlVehicleType =
              modelVehicleType && modelVehicleType !== 'car' ? modelVehicleType : undefined;
            const param = urlVehicleType ? `&vehicleType=${urlVehicleType}` : '';
            entries.push({
              url: `${siteUrl}/?brand=${brandSlug}&model=${modelSlug}${param}`,
              lastmod: now,
              changefreq: 'daily',
              priority: 0.7,
            });
          }
        }
      }
    };

    await addBrandEntries(brandsByVehicleType.truck, 'truck');
    await addBrandEntries(brandsByVehicleType.moto, 'moto');
    await addBrandEntries(brandsByVehicleType.car);
  } catch {}

  const addBodyTypeEntries = (
    bodyTypes: readonly string[],
    vehicleType: 'car' | 'truck' | 'moto'
  ) => {
    const vehicleTypeParam = vehicleType !== 'car' ? `&vehicleType=${vehicleType}` : '';

    for (const bodyType of bodyTypes) {
      entries.push({
        url: `${siteUrl}/?body_types=${bodyType}${vehicleTypeParam}`,
        lastmod: now,
        changefreq: 'weekly',
        priority: 0.6,
      });
    }
  };

  addBodyTypeEntries(BODY_TYPES_BY_VEHICLE_TYPE.car, 'car');
  addBodyTypeEntries(BODY_TYPES_BY_VEHICLE_TYPE.truck, 'truck');
  addBodyTypeEntries(BODY_TYPES_BY_VEHICLE_TYPE.moto, 'moto');

  return entries;
}

function getFallbackEntries(): SitemapEntry[] {
  return [
    {
      url: 'https://kupito.club',
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'daily',
      priority: 1.0,
    },
  ];
}

export async function GET() {
  let entries: SitemapEntry[];
  try {
    entries = await generateEntries();
  } catch {
    entries = [];
  }
  const xml = entries.length > 0 ? buildXml(entries) : buildXml(getFallbackEntries());

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
