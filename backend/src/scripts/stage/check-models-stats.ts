import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);

async function checkModelsStats() {
  await AppDataSource.initialize();
  console.log('✅ Connected to database\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  const brands = await brandRepo.find({
    order: { order: 'ASC' },
  });

  console.log(`📊 Total brands: ${brands.length}\n`);

  let totalModels = 0;
  const brandsWithModels: Array<{ brand: string; count: number }> = [];

  for (const brand of brands) {
    const models = await modelRepo.find({
      where: { brand_id: brand.id },
    });
    const count = models.length;
    totalModels += count;

    if (count > 0) {
      brandsWithModels.push({ brand: brand.name, count });
    }
  }

  console.log(`📊 Total models: ${totalModels}\n`);
  console.log('📊 Марки со број на модели:');
  brandsWithModels
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
    .forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.brand}: ${item.count} модели`);
    });

  if (brandsWithModels.length > 20) {
    console.log(`   ... и уште ${brandsWithModels.length - 20} марки`);
  }

  await AppDataSource.destroy();
  console.log('\n🔌 Database connection closed');
}

checkModelsStats()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error);
    process.exit(1);
  });
