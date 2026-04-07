import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';

async function addOtherModel() {
  console.log('➕ Adding "Other" model for each brand...\n');

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
        existingOther.name = 'Other';
        existingOther.order = maxOrder + 1;
        await modelRepo.save(existingOther);
        renamed++;
        console.log(`  ♻️  Renamed model "${oldName}" → "Other" for ${brand.name}`);
      } else if (existingOther.order !== maxOrder + 1) {
        existingOther.order = maxOrder + 1;
        await modelRepo.save(existingOther);
        updated++;
        console.log(`  ♻️  Updated model "Other" for ${brand.name}`);
      } else {
        skipped++;
      }
    } else {
      const maxOrder =
        existingModels.length > 0 ? Math.max(...existingModels.map((m) => m.order || 0)) : 0;

      const otherModel = modelRepo.create({
        name: 'Other',
        brand_id: brand.id,
        order: maxOrder + 1,
        vehicle_types: ['car'],
      });

      await modelRepo.save(otherModel);
      added++;
      console.log(`  ✅ Added model "Other" for ${brand.name}`);
    }
  }

  console.log(`\n✅ Done!`);
  console.log(`   - Total brands: ${allBrands.length}`);
  console.log(`   - Added models: ${added}`);
  console.log(`   - Renamed models: ${renamed}`);
  console.log(`   - Updated models: ${updated}`);
  console.log(`   - Skipped models: ${skipped}\n`);

  await AppDataSource.destroy();
  console.log('🔌 Database connection closed');
}

addOtherModel()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
