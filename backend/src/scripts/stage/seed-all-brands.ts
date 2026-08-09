import 'reflect-metadata';

import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { checkEnvironment } from '../script-guard';
import { seedVehicleCatalog } from './seed-vehicle-catalog';

checkEnvironment(['stage', 'development', 'test']);

async function seedAllBrands() {
  const skipDuplicateCheck = process.argv.includes('--skip-duplicates');

  console.log('🌱 Seeding brands and models from vehicle-catalog.json...\n');
  if (process.argv.includes('--skip-heavy')) {
    console.log('ℹ️  --skip-heavy is ignored (catalog seed has no heavy regional scripts)\n');
  }

  await seedVehicleCatalog();

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  if (!skipDuplicateCheck) {
    const brandRepo = AppDataSource.getRepository(Brand);
    const modelRepo = AppDataSource.getRepository(VehicleModel);

    const brands = await brandRepo.find({ select: ['id', 'name'] });
    const nameCounts = new Map<string, number>();
    for (const brand of brands) {
      const key = brand.name.toLowerCase().trim();
      nameCounts.set(key, (nameCounts.get(key) || 0) + 1);
    }
    const brandDuplicates = [...nameCounts.values()].filter((c) => c > 1).length;

    let modelDuplicates = 0;
    for (const brand of brands) {
      const models = await modelRepo.find({
        where: { brand_id: brand.id },
        select: ['name'],
      });
      const modelCounts = new Map<string, number>();
      for (const model of models) {
        const key = model.name.toLowerCase().trim();
        modelCounts.set(key, (modelCounts.get(key) || 0) + 1);
      }
      modelDuplicates += [...modelCounts.values()].filter((c) => c > 1).length;
    }

    if (brandDuplicates > 0 || modelDuplicates > 0) {
      console.log(
        `\n⚠️  Duplicates found: ${brandDuplicates} brand names, ${modelDuplicates} model names`,
      );
      console.log('   Run: npm run remove-duplicates');
    }
  }

  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
}

seedAllBrands()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Error: ${message}`);
    process.exit(1);
  });
