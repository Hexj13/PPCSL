import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { AppDataSource } from '../../data-source';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);

async function checkBrandsCount() {
  await AppDataSource.initialize();
  console.log('✅ Connected to database\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const brands = await brandRepo.find();
  const count = brands.length;

  console.log(`📊 Total brands in database: ${count}\n`);

  if (count > 0) {
    console.log('Марки:');
    brands.forEach((brand, index) => {
      console.log(`  ${index + 1}. ${brand.name}`);
    });
  }

  await AppDataSource.destroy();
  console.log('\n🔌 Database connection closed');
}

checkBrandsCount()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error);
    process.exit(1);
  });
