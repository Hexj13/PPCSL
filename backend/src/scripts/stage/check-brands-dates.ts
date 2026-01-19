import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { AppDataSource } from '../../data-source';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);
async function checkBrandsDates() {
  await AppDataSource.initialize();
  console.log('✅ Connected to database\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const brands = await brandRepo.find({
    order: { created_at: 'DESC' },
  });

  console.log(`📊 Total brands: ${brands.length}\n`);

  if (brands.length > 0) {
    const latest = brands[0];
    const oldest = brands[brands.length - 1];

    console.log(`📅 Најстара марка: ${oldest.name} (${oldest.created_at})`);
    console.log(`📅 Најнова марка: ${latest.name} (${latest.created_at})\n`);

    console.log('Последни 10 марки по дата:');
    brands.slice(0, 10).forEach((brand, index) => {
      console.log(`  ${index + 1}. ${brand.name} - ${brand.created_at}`);
    });
  }

  await AppDataSource.destroy();
  console.log('\n🔌 Database connection closed');
}

checkBrandsDates()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error);
    process.exit(1);
  });
