import * as fs from 'fs';
import * as path from 'path';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:4000';
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.club').replace(/\/$/, '');

interface Brand {
  id: string;
  name: string;
  vehicle_types?: string[];
}

interface VehicleModel {
  id: string;
  name: string;
  vehicle_type?: string;
}

interface SitemapEntry {
  url: string;
  lastmod: string;
  changefreq: string;
  priority: number;
}

const BODY_TYPES_BY_VEHICLE_TYPE: Record<string, readonly string[]> = {
  car: ['Sedan', 'Hatchback', 'Wagon', 'SUV', 'Coupe', 'Convertible', 'Van', 'Minivan', 'Pickup'],
  truck: ['Truck', 'Bus', 'SemiTruck', 'Tractor', 'SpecialEquipment'],
  moto: [
    'Naked',
    'Sport',
    'Touring',
    'Cruiser',
    'Adventure',
    'Scooter',
    'Enduro',
    'Cross',
    'Dragster',
    'Kart',
    'Custom',
    'ATV',
    'Chopper',
    'Motocross',
    'Supermoto',
    'Trial',
  ],
};

function createSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

async function fetchBrands(): Promise<Brand[]> {
  const response = await fetch(`${API_URL}/api/brands`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Failed to fetch brands: ${response.status}`);
  return response.json();
}

async function fetchModelsByBrands(brandIds: string[]): Promise<Record<string, VehicleModel[]>> {
  const response = await fetch(`${API_URL}/api/brands/models/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brandIds }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Failed to fetch models: ${response.status}`);
  return response.json();
}

async function generateEntries(): Promise<SitemapEntry[]> {
  const now = new Date().toISOString().split('T')[0];
  const entries: SitemapEntry[] = [];

  entries.push(
    { url: SITE_URL, lastmod: now, changefreq: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/listings`, lastmod: now, changefreq: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/terms`, lastmod: now, changefreq: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastmod: now, changefreq: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/faq`, lastmod: now, changefreq: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/cookie-settings`, lastmod: now, changefreq: 'monthly', priority: 0.2 }
  );

  try {
    const allBrands = await fetchBrands();

    const brandsByVehicleType: Record<string, Brand[]> = {
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

    const addBrandEntries = async (brands: Brand[], vehicleType?: string) => {
      const vehicleTypeParam =
        vehicleType && vehicleType !== 'car' ? `&vehicleType=${vehicleType}` : '';

      for (const brand of brands) {
        const brandSlug = createSlug(brand.name ?? '').trim();
        if (!brandSlug) continue;
        entries.push({
          url: `${SITE_URL}/?brand=${brandSlug}${vehicleTypeParam}`,
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
              url: `${SITE_URL}/?brand=${brandSlug}&model=${modelSlug}${param}`,
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
  } catch (error) {
    console.warn(
      'Failed to fetch brands/models, generating sitemap with static pages only:',
      error
    );
  }

  for (const [vehicleType, bodyTypes] of Object.entries(BODY_TYPES_BY_VEHICLE_TYPE)) {
    const vehicleTypeParam = vehicleType !== 'car' ? `&vehicleType=${vehicleType}` : '';
    for (const bodyType of bodyTypes) {
      entries.push({
        url: `${SITE_URL}/?body_types=${bodyType}${vehicleTypeParam}`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: 0.6,
      });
    }
  }

  return entries;
}

async function main() {
  console.log(`Generating sitemap for ${SITE_URL}...`);
  console.log(`API URL: ${API_URL}`);

  const entries = await generateEntries();
  const xml = buildXml(entries);

  const outputPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
  fs.writeFileSync(outputPath, xml, 'utf-8');

  console.log(`Sitemap generated: ${outputPath}`);
  console.log(`Total URLs: ${entries.length}`);
}

main().catch((error) => {
  console.error('Failed to generate sitemap:', error);
  process.exit(1);
});
