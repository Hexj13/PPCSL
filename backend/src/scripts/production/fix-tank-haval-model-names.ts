import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { Vehicle } from '../../listings/entities/vehicle.entity';
import { checkEnvironment, checkPlatform } from '../script-guard';

checkEnvironment(['production', 'stage', 'development', 'test']);
checkPlatform(['common']);

const CAR_BRAND_PREFIXES = ['Tank', 'Haval'];

function stripBrandPrefix(brandName: string, modelName: string): string | null {
  const trimmed = modelName.trim();
  if (trimmed.toLowerCase().startsWith(brandName.toLowerCase() + ' ')) {
    return trimmed.slice(brandName.length).trim();
  }
  return null;
}

async function fixTankHavalModelNames() {
  console.log('🚗 Fixing Tank/Haval model names (remove brand prefix, merge duplicates)...\n');

  if (!process.env.DB_SYNC) {
    process.env.DB_SYNC = 'false';
  }

  await AppDataSource.initialize();

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);

  let updated = 0;
  let merged = 0;

  for (const brandName of CAR_BRAND_PREFIXES) {
    const brand = await brandRepo.findOne({
      where: { name: brandName },
      select: ['id', 'name'],
    });
    if (!brand) continue;

    const models = await modelRepo.find({
      where: { brand_id: brand.id },
      select: ['id', 'name'],
    });

    for (const model of models) {
      const newName = stripBrandPrefix(brand.name, model.name);
      if (!newName || newName === model.name) continue;

      const existingWithNewName = await modelRepo.findOne({
        where: { brand_id: brand.id, name: newName },
        select: ['id', 'name'],
      });

      if (existingWithNewName) {
        if (existingWithNewName.id === model.id) continue;
        const vehiclesCount = await vehicleRepo.count({
          where: { model_id: model.id },
        });
        if (vehiclesCount > 0) {
          await vehicleRepo.update({ model_id: model.id }, { model_id: existingWithNewName.id });
        }
        await modelRepo.remove(model);
        merged++;
      } else {
        model.name = newName;
        await modelRepo.save(model);
        updated++;
      }
    }
  }

  console.log(`\n📊 Summary: ${updated} renamed, ${merged} merged (duplicate removed)`);
  await AppDataSource.destroy();
}

if (require.main === module) {
  fixTankHavalModelNames()
    .then(() => {
      console.log('\n✅ Done');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

export { fixTankHavalModelNames };
