import { NextResponse } from 'next/server';

import { fetchBrands, fetchModelsByBrands } from '@/lib/server-api';
import { loadSiteConfigSync } from '@/lib/site-config';
import { createSlug } from '@/lib/utils';

const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';
const siteConfig = loadSiteConfigSync(country);
const siteUrl = siteConfig.siteUrl;
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const POPULAR_CAR_BODY_TYPES = [
  'SUV',
  'Hatchback',
  'Wagon',
  'Minivan',
  'Sedan',
  'Convertible',
] as const;
const POPULAR_TRUCK_BODY_TYPES = ['Truck', 'Bus', 'SemiTruck', 'Tractor'] as const;
const POPULAR_MOTO_BODY_TYPES = [
  'Naked',
  'Sport',
  'Touring',
  'Cruiser',
  'Adventure',
  'Scooter',
  'Enduro',
  'Cross',
] as const;

async function generateSitemapContent(): Promise<string> {
  const urls: string[] = [];

  urls.push(siteUrl);
  urls.push(`${siteUrl}/listings`);
  urls.push(`${siteUrl}/terms`);
  urls.push(`${siteUrl}/privacy`);
  urls.push(`${siteUrl}/faq`);
  urls.push(`${siteUrl}/cookie-settings`);

  if (apiUrl) {
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

      const addBrandUrls = async (
        brands: typeof allBrands,
        vehicleType?: 'car' | 'truck' | 'moto'
      ) => {
        const vehicleTypeParam =
          vehicleType && vehicleType !== 'car' ? `&vehicleType=${vehicleType}` : '';

        for (const brand of brands) {
          const brandSlug = createSlug(brand.name);
          urls.push(`${siteUrl}/?brand=${brandSlug}${vehicleTypeParam}`);
        }

        const brandIds = brands.map((b) => b.id);
        if (brandIds.length > 0) {
          const modelsByBrand = await fetchModelsByBrands(brandIds);

          for (const brand of brands) {
            const brandSlug = createSlug(brand.name);
            const models = modelsByBrand[brand.id] || [];

            for (const model of models) {
              const modelSlug = createSlug(model.name);
              const modelVehicleType = model.vehicle_type;
              const urlVehicleType =
                modelVehicleType && modelVehicleType !== 'car' ? modelVehicleType : vehicleType;
              const param =
                urlVehicleType && urlVehicleType !== 'car' ? `&vehicleType=${urlVehicleType}` : '';
              urls.push(`${siteUrl}/?brand=${brandSlug}&model=${modelSlug}${param}`);
            }
          }
        }
      };

      await addBrandUrls(brandsByVehicleType.truck, 'truck');
      await addBrandUrls(brandsByVehicleType.moto, 'moto');
      await addBrandUrls(brandsByVehicleType.car);
    } catch {}
  }

  const addBodyTypeUrls = (bodyTypes: readonly string[], vehicleType: 'car' | 'truck' | 'moto') => {
    const n = bodyTypes.length;
    const vehicleTypeParam = vehicleType !== 'car' ? `&vehicleType=${vehicleType}` : '';

    for (let mask = 1; mask < 1 << n; mask++) {
      const combination: string[] = [];
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) {
          combination.push(bodyTypes[i]);
        }
      }
      combination.sort();
      urls.push(`${siteUrl}/?body_types=${combination.join(',')}${vehicleTypeParam}`);
    }
  };

  addBodyTypeUrls(POPULAR_CAR_BODY_TYPES, 'car');
  addBodyTypeUrls(POPULAR_TRUCK_BODY_TYPES, 'truck');
  addBodyTypeUrls(POPULAR_MOTO_BODY_TYPES, 'moto');

  return urls.join('\n');
}

export async function GET() {
  const content = await generateSitemapContent();

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
