import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);

async function checkCitroenModels() {
  await AppDataSource.initialize();
  console.log('✅ Connected to database\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  const citroen = await brandRepo.findOne({ where: { name: 'Citroën' } });

  if (!citroen) {
    console.log('❌ Citroën not found');
    await AppDataSource.destroy();
    process.exit(1);
  }

  const models = await modelRepo.find({
    where: { brand_id: citroen.id },
    order: { name: 'ASC' },
  });

  console.log(`📊 Citroën: ${models.length} models\n`);

  const cModels = models.filter((m) => m.name.startsWith('C'));
  const suvModels = models.filter(
    (m) =>
      m.name.toLowerCase().includes('aircross') ||
      m.name.toLowerCase().includes('crosser') ||
      m.name.toLowerCase().includes('cactus'),
  );

  console.log('🚗 C-series models:');
  cModels.forEach((model) => {
    console.log(`   - ${model.name}`);
  });

  console.log('\n🚙 SUV models:');
  suvModels.forEach((model) => {
    console.log(`   - ${model.name}`);
  });

  console.log('\n📋 All models:');
  models.forEach((model, index) => {
    console.log(`   ${index + 1}. ${model.name}`);
  });

  await AppDataSource.destroy();
  console.log('\n🔌 Database connection closed');
}

checkCitroenModels()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
