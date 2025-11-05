import 'reflect-metadata';
import { Brand } from '../brands/entities/brand.entity';
import { AppDataSource } from '../data-source';

async function checkBrandsCount() {
  await AppDataSource.initialize();
  console.log('✅ Поврзано со базата на податоци\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const brands = await brandRepo.find();
  const count = brands.length;

  console.log(`📊 Вкупно марки во базата: ${count}\n`);

  if (count > 0) {
    console.log('Марки:');
    brands.forEach((brand, index) => {
      console.log(`  ${index + 1}. ${brand.name}`);
    });
  }

  await AppDataSource.destroy();
  console.log('\n🔌 Врската со базата на податоци е затворена');
}

checkBrandsCount()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error);
    process.exit(1);
  });
