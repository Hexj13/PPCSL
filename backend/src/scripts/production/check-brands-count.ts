import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { AppDataSource } from '../../data-source';
import { checkEnvironment, checkPlatform } from '../script-guard';

checkEnvironment(['production', 'stage', 'development', 'test']);
checkPlatform(['mk', 'al']);

async function checkBrandsCount() {
  console.log('🔍 Checking brands count...\n');

  await AppDataSource.initialize();
  console.log('✅ Connected to database\n');

  const brandRepo = AppDataSource.getRepository(Brand);

  const totalBrands = await brandRepo.count();

  if (totalBrands === 0) {
    console.log('❌ No brands found in database');
    console.log('   Run: npm run seed:all-brands');
    await AppDataSource.destroy();
    return;
  }

  console.log(`📊 Total brands in database: ${totalBrands}\n`);

  const brands = await brandRepo.find({
    select: ['id', 'name'],
    order: { order: 'ASC', name: 'ASC' },
    take: 50,
  });

  console.log('Марки:');
  brands.forEach((brand, index) => {
    console.log(`  ${index + 1}. ${brand.name}`);
  });

  if (totalBrands > 50) {
    console.log(`  ... и ещё ${totalBrands - 50} марок`);
  }

  await AppDataSource.destroy();
  console.log('\n🔌 Database connection closed');
}

if (require.main === module) {
  checkBrandsCount()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}
