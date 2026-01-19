import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';

async function addOtherModel() {
  console.log('➕ Додавање на модел "Друго" за секоја марка...\n');

  await AppDataSource.initialize();
  console.log('✅ Connected to database\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  const allBrands = await brandRepo.find({
    order: { name: 'ASC' },
  });

  let added = 0;
  let updated = 0;
  let renamed = 0;
  let skipped = 0;

  for (const brand of allBrands) {
    const existingModels = await modelRepo.find({
      where: { brand_id: brand.id },
    });

    const existingOther = existingModels.find(
      (m) =>
        m.name.toLowerCase() === 'друго' ||
        m.name.toLowerCase() === 'другое' ||
        m.name.toLowerCase() === 'other',
    );

    if (existingOther) {
      const maxOrder = Math.max(...existingModels.map((m) => m.order || 0));

      if (existingOther.name !== 'Друго') {
        const oldName = existingOther.name;
        existingOther.name = 'Друго';
        existingOther.order = maxOrder + 1;
        await modelRepo.save(existingOther);
        renamed++;
        console.log(`  ♻️  Преименуван модел "${oldName}" → "Друго" за ${brand.name}`);
      } else if (existingOther.order !== maxOrder + 1) {
        existingOther.order = maxOrder + 1;
        await modelRepo.save(existingOther);
        updated++;
        console.log(`  ♻️  Ажуриран модел "Друго" за ${brand.name}`);
      } else {
        skipped++;
      }
    } else {
      const maxOrder =
        existingModels.length > 0 ? Math.max(...existingModels.map((m) => m.order || 0)) : 0;

      const otherModel = modelRepo.create({
        name: 'Друго',
        brand_id: brand.id,
        order: maxOrder + 1,
        vehicle_type: 'car',
      });

      await modelRepo.save(otherModel);
      added++;
      console.log(`  ✅ Додаден модел "Друго" за ${brand.name}`);
    }
  }

  console.log(`\n✅ Завршено!`);
  console.log(`   - Total brands: ${allBrands.length}`);
  console.log(`   - Додадени модели: ${added}`);
  console.log(`   - Преименувани модели: ${renamed}`);
  console.log(`   - Ажурирани модели: ${updated}`);
  console.log(`   - Прескокнати модели: ${skipped}\n`);

  await AppDataSource.destroy();
  console.log('🔌 Database connection closed');
}

addOtherModel()
  .then(() => {
    console.log('✅ Скриптот заврши успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error);
    process.exit(1);
  });
