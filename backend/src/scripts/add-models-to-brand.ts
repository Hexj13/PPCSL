import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { Brand } from '../brands/entities/brand.entity';
import { VehicleModel } from '../brands/entities/vehicle-model.entity';

const ADDITIONAL_MODELS: Record<string, string[]> = {
  Volkswagen: ['Touareg', 'Arteon', 'ID. Buzz', 'T-Cross', 'Tiguan Allspace'],
  BMW: ['X7', 'X6', '4 Series', '8 Series', 'X2', 'X4', 'iX1', 'iX3'],
  'Mercedes-Benz': ['GLS', 'G-Class', 'SL', 'AMG GT', 'EQS', 'EQE SUV'],
  Audi: ['A8', 'Q2', 'e-tron', 'RS6', 'RS7'],
  Porsche: ['Cayman', 'Boxster', '911 Turbo', 'Panamera Turbo'],
  Toyota: ['Highlander', 'Land Cruiser', 'Prius', 'bZ4X'],
  Honda: ['e:Ny1', 'Civic Type R', 'Pilot'],
  Tesla: ['Cybertruck', 'Roadster'],
  Nissan: ['Leaf Plus', 'Ariya e-4ORCE'],
  Kia: ['EV9 GT', 'Sportage Hybrid'],
  Hyundai: ['Ioniq 7', 'N Vision 74'],
};

async function addModelsToBrands() {
  console.log('🚀 Започнување на додавање на модели...\n');

  await AppDataSource.initialize();
  console.log('✅ Поврзано со базата на податоци\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  let totalAdded = 0;
  let totalUpdated = 0;

  for (const [brandName, newModels] of Object.entries(ADDITIONAL_MODELS)) {
    const brand = await brandRepo.findOne({ where: { name: brandName } });

    if (!brand) {
      console.log(`⚠️  Бренд "${brandName}" не е пронајден, прескокнување...\n`);
      continue;
    }

    const existingModels = await modelRepo.find({
      where: { brand_id: brand.id },
    });

    const maxOrder =
      existingModels.length > 0 ? Math.max(...existingModels.map((m) => m.order || 0)) : 0;

    let added = 0;
    let updated = 0;

    for (let i = 0; i < newModels.length; i++) {
      const modelName = newModels[i];
      const modelNameLower = modelName.toLowerCase();

      const existingModel = existingModels.find((m) => m.name.toLowerCase() === modelNameLower);

      if (!existingModel) {
        const model = modelRepo.create({
          name: modelName,
          brand_id: brand.id,
          order: maxOrder + i + 1,
        });
        await modelRepo.save(model);
        added++;
        console.log(`  ✅ Додаден модел: ${modelName}`);
      } else {
        existingModel.order = maxOrder + i + 1;
        await modelRepo.save(existingModel);
        updated++;
        console.log(`  ♻️  Ажуриран модел: ${modelName}`);
      }
    }

    totalAdded += added;
    totalUpdated += updated;

    console.log(`\n📊 ${brandName}:`);
    console.log(`   - Додадени модели: ${added}`);
    console.log(`   - Ажурирани модели: ${updated}`);
    console.log(`   - Вкупно модели: ${existingModels.length + added}\n`);
  }

  console.log(`\n✅ Завршено!`);
  console.log(`   - Вкупно додадени модели: ${totalAdded}`);
  console.log(`   - Вкупно ажурирани модели: ${totalUpdated}\n`);

  await AppDataSource.destroy();
  console.log('🔌 Врската со базата на податоци е затворена');
}

addModelsToBrands()
  .then(() => {
    console.log('✅ Скриптот заврши успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error);
    process.exit(1);
  });
