import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { checkEnvironment, checkPlatform } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);
checkPlatform(['md']);

const COUNTRIES_BRANDS: Record<string, string[]> = {
  USA: [
    'Freightliner',
    'Peterbilt',
    'Kenworth',
    'Mack',
    'Western Star',
    'International',
    'Navistar',
    'Ford Trucks',
    'Chevrolet Trucks',
    'GMC Trucks',
    'Dodge Trucks',
    'John Deere',
    'Case IH',
    'New Holland',
    'Massey Ferguson',
    'Caterpillar',
    'Komatsu',
    'Bobcat',
    'Terex',
  ],
  Germany: ['MAN', 'Mercedes-Benz', 'Setra', 'Neoplan', 'Fendt', 'Claas', 'Deutz-Fahr', 'Liebherr'],
  France: ['Renault Trucks', 'Peugeot', 'Citroën'],
  Italy: ['Iveco', 'Fiat'],
  Russia: ['Kamaz', 'MAZ', 'GAZ', 'Ural', 'BelAZ'],
  Japan: [
    'Isuzu',
    'Hino',
    'Fuso',
    'UD Trucks',
    'Toyota',
    'Mitsubishi',
    'Kubota',
    'Hitachi',
    'Komatsu',
  ],
  Korea: ['Hyundai', 'Kia', 'Daewoo', 'SsangYong'],
};

async function checkAllCountriesBrands() {
  console.log('Checking brands and models for USA, Germany, France, Italy, Russia, Japan...\n');

  await AppDataSource.initialize();

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  const allBrands = await brandRepo.find({
    select: ['id', 'name', 'vehicle_types'],
  });

  const allModels = await modelRepo.find({
    select: ['id', 'name', 'brand_id', 'vehicle_type'],
    relations: ['brand'],
  });

  const brandsMap = new Map<string, Brand>();
  for (const brand of allBrands) {
    brandsMap.set(brand.name.toLowerCase(), brand);
  }

  const modelsByBrand = new Map<number | string, VehicleModel[]>();
  for (const model of allModels) {
    const brandId =
      typeof model.brand_id === 'string' ? parseInt(model.brand_id, 10) : model.brand_id;
    if (!modelsByBrand.has(brandId)) {
      modelsByBrand.set(brandId, []);
    }
    modelsByBrand.get(brandId)!.push(model);
  }

  let totalMissing = 0;
  let totalFound = 0;

  for (const [country, brands] of Object.entries(COUNTRIES_BRANDS)) {
    console.log(`\n=== ${country} ===`);
    const missing: string[] = [];
    const found: string[] = [];

    for (const brandName of brands) {
      const brand = brandsMap.get(brandName.toLowerCase());
      if (!brand) {
        missing.push(brandName);
        totalMissing++;
        console.log(`  ❌ Missing brand: ${brandName}`);
      } else {
        found.push(brandName);
        totalFound++;
        const brandId = typeof brand.id === 'string' ? parseInt(brand.id, 10) : brand.id;
        const models = modelsByBrand.get(brandId) || [];
        const truckModels = models.filter((m) => m.vehicle_type === 'truck');
        const hasTruckType = brand.vehicle_types?.includes('truck') || false;

        if (!hasTruckType && truckModels.length === 0) {
          console.log(
            `  ⚠️  Brand found but no truck type: ${brandName} (${models.length} models, vehicle_types: ${brand.vehicle_types?.join(', ') || 'none'})`,
          );
        } else {
          console.log(
            `  ✅ ${brandName}: ${truckModels.length} truck models, vehicle_types: ${brand.vehicle_types?.join(', ') || 'none'}`,
          );
        }
      }
    }

    if (missing.length > 0) {
      console.log(`\n  Missing brands (${missing.length}): ${missing.join(', ')}`);
    }
  }

  console.log(`\n\n📊 SUMMARY:`);
  console.log(`   Found: ${totalFound} brands`);
  console.log(`   Missing: ${totalMissing} brands`);

  await AppDataSource.destroy();
}

if (require.main === module) {
  checkAllCountriesBrands()
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { checkAllCountriesBrands };
