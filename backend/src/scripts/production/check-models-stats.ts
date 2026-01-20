import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { checkEnvironment, checkPlatform } from '../script-guard';

checkEnvironment(['production', 'stage', 'development', 'test']);
checkPlatform(['mk', 'al']);

async function checkModelsStats() {
  console.log('🔍 Checking models statistics...\n');

  await AppDataSource.initialize();
  console.log('✅ Connected to database\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  const totalBrands = await brandRepo.count();
  const totalModels = await modelRepo.count();

  console.log(`📊 Total brands: ${totalBrands}`);
  console.log(`📊 Total models: ${totalModels}\n`);

  if (totalModels === 0) {
    console.log('❌ No models found in database');
    console.log('   Run: npm run seed:all-brands');
    await AppDataSource.destroy();
    return;
  }

  const brandsWithCounts = await brandRepo
    .createQueryBuilder('brand')
    .leftJoin('brand.models', 'model')
    .select('brand.name', 'name')
    .addSelect('COUNT(model.id)', 'modelCount')
    .groupBy('brand.id')
    .addGroupBy('brand.name')
    .orderBy('COUNT(model.id)', 'DESC')
    .addOrderBy('brand.name', 'ASC')
    .limit(20)
    .getRawMany();

  console.log('📊 Марки со број на модели:');
  brandsWithCounts.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.name}: ${item.modelCount} модели`);
  });

  if (totalBrands > 20) {
    console.log(`   ... и уште ${totalBrands - 20} марки`);
  }

  await AppDataSource.destroy();
  console.log('\n🔌 Database connection closed');
}

if (require.main === module) {
  checkModelsStats()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}
