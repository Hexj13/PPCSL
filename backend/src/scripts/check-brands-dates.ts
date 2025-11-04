import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { Brand } from '../brands/entities/brand.entity';

async function checkBrandsDates() {
  await AppDataSource.initialize();
  console.log('✅ Поврзано со базата на податоци\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const brands = await brandRepo.find({
    order: { created_at: 'DESC' },
  });

  console.log(`📊 Вкупно марки: ${brands.length}\n`);

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
  console.log('\n🔌 Врската со базата на податоци е затворена');
}

checkBrandsDates()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error);
    process.exit(1);
  });
