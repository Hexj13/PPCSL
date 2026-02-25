import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { AppDataSource } from '../../data-source';
import { checkEnvironment, checkPlatform } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);
checkPlatform(['md']);

const CHINESE_TRUCK_BRANDS = [
  'FAW',
  'Sinotruk',
  'CNHTC',
  'Shacman',
  'Shaanxi',
  'JAC',
  'Foton',
  'JMC',
  'Jiangling',
  'Dongfeng',
  'Great Wall',
  'BYD',
  'Maxus',
  'SAIC',
];

async function checkChineseTruckBrands() {
  console.log('🔍 Checking Chinese truck brands in database...\n');

  await AppDataSource.initialize();

  const brandRepo = AppDataSource.getRepository(Brand);

  console.log('📊 Checking Chinese truck brands:\n');
  const foundBrands: Brand[] = [];
  const missingBrands: string[] = [];

  for (const brandName of CHINESE_TRUCK_BRANDS) {
    const brand = await brandRepo.findOne({
      where: { name: brandName },
      relations: ['models'],
    });

    if (brand) {
      const truckModels = brand.models?.filter((m) => m.vehicle_types?.includes('truck')) || [];
      const allModels = brand.models || [];

      console.log(`✅ ${brandName}:`);
      console.log(`   - vehicle_types: ${JSON.stringify(brand.vehicle_types)}`);
      console.log(`   - Total models: ${allModels.length}`);
      console.log(`   - Models with type 'truck': ${truckModels.length}`);

      if (truckModels.length > 0) {
        console.log(
          `   - Truck models: ${truckModels
            .slice(0, 5)
            .map((m) => m.name)
            .join(', ')}${truckModels.length > 5 ? '...' : ''}`,
        );
      } else if (allModels.length > 0) {
        console.log(
          `   - All models (car type): ${allModels
            .slice(0, 5)
            .map((m) => m.name)
            .join(', ')}${allModels.length > 5 ? '...' : ''}`,
        );
        console.log(`   ⚠️  WARNING: Brand exists but has no truck models!`);
      }

      if (!brand.vehicle_types || !brand.vehicle_types.includes('truck')) {
        console.log(`   ⚠️  PROBLEM: vehicle_types does not contain 'truck'!`);
      } else {
        foundBrands.push(brand);
      }
    } else {
      console.log(`❌ ${brandName}: NOT FOUND IN DATABASE`);
      missingBrands.push(brandName);
    }
    console.log('');
  }

  console.log('\n📊 Summary:');
  console.log(`   Found brands: ${foundBrands.length}`);
  console.log(`   Missing brands: ${missingBrands.length}`);

  if (foundBrands.length > 0) {
    console.log('\n✅ Brands with truck models:');
    foundBrands.forEach((brand) => {
      const truckModels = brand.models?.filter((m) => m.vehicle_types?.includes('truck')) || [];
      console.log(`   - ${brand.name}: ${truckModels.length} truck models`);
    });
  }

  if (missingBrands.length > 0) {
    console.log('\n❌ Missing brands:');
    missingBrands.forEach((brand) => {
      console.log(`   - ${brand}`);
    });
  }

  await AppDataSource.destroy();
}

if (require.main === module) {
  checkChineseTruckBrands()
    .then(() => {
      console.log('\n✅ Check completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { checkChineseTruckBrands };
