import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { AppDataSource } from '../../data-source';
import { checkEnvironment, checkPlatform } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);
checkPlatform(['mk', 'al']);

const TRACTOR_BRANDS = [
  'John Deere',
  'Case IH',
  'New Holland',
  'Massey Ferguson',
  'Fendt',
  'Claas',
  'Deutz-Fahr',
  'Valtra',
  'Kubota',
  'Belarus',
];

async function checkTractorBrands() {
  console.log('🔍 Checking tractor brands in database...\n');

  await AppDataSource.initialize();

  const brandRepo = AppDataSource.getRepository(Brand);

  console.log('📊 Checking tractor brands:\n');
  for (const brandName of TRACTOR_BRANDS) {
    const brand = await brandRepo.findOne({
      where: { name: brandName },
      relations: ['models'],
    });

    if (brand) {
      const truckModels = brand.models?.filter((m) => m.vehicle_type === 'truck') || [];
      console.log(`✅ ${brandName}:`);
      console.log(`   - vehicle_types: ${JSON.stringify(brand.vehicle_types)}`);
      console.log(`   - Total models: ${brand.models?.length || 0}`);
      console.log(`   - Models with type 'truck': ${truckModels.length}`);
      if (truckModels.length > 0) {
        console.log(
          `   - Example models: ${truckModels
            .slice(0, 3)
            .map((m) => m.name)
            .join(', ')}`,
        );
      }
      if (!brand.vehicle_types || !brand.vehicle_types.includes('truck')) {
        console.log(`   ⚠️  PROBLEM: vehicle_types does not contain 'truck'!`);
      }
    } else {
      console.log(`❌ ${brandName}: NOT FOUND IN DATABASE`);
    }
    console.log('');
  }

  console.log('\n📊 Checking via SQL query (as in API):\n');
  const queryBuilder = brandRepo.createQueryBuilder('brand');
  queryBuilder.where(
    "brand.vehicle_types IS NOT NULL AND (brand.vehicle_types::text LIKE '%,truck,%' OR brand.vehicle_types::text LIKE 'truck,%' OR brand.vehicle_types::text LIKE '%,truck' OR brand.vehicle_types::text = 'truck')",
  );
  queryBuilder.andWhere('brand.name IN (:...names)', { names: TRACTOR_BRANDS });
  queryBuilder.orderBy('brand.name', 'ASC');

  const foundBrands = await queryBuilder.getMany();
  console.log(`Found tractor brands via SQL: ${foundBrands.length}`);
  if (foundBrands.length > 0) {
    console.log('Brands:');
    foundBrands.forEach((brand) => {
      console.log(`  - ${brand.name} (vehicle_types: ${JSON.stringify(brand.vehicle_types)})`);
    });
  } else {
    console.log('⚠️  NO BRANDS FOUND!');
  }

  await AppDataSource.destroy();
}

if (require.main === module) {
  checkTractorBrands()
    .then(() => {
      console.log('\n✅ Check completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { checkTractorBrands };
