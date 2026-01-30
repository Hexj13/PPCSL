import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { Vehicle } from '../../listings/entities/vehicle.entity';
import { checkEnvironment, checkPlatform } from '../script-guard';

checkEnvironment(['production', 'stage', 'development', 'test']);
checkPlatform(['common']);

const TRUCK_BRAND_RENAME_RULES: Record<string, (oldName: string) => string | null> = {
  Belarus: (name) => {
    if (/^Belarus-/i.test(name)) return name.replace(/^Belarus-/i, '').trim();
    return null;
  },
  BelAZ: (name) => {
    if (/^BelAZ-/i.test(name)) return name.replace(/^BelAZ-/i, '').trim();
    return null;
  },
  GAZ: (name) => {
    if (/^GAZ-\d/i.test(name)) return name.replace(/^GAZ-/i, '').trim();
    return null;
  },
  Kamaz: (name) => {
    if (/^KamAZ-/i.test(name) || /^Kamaz-/i.test(name)) return name.replace(/^KamA?Z-/i, '').trim();
    return null;
  },
  MAZ: (name) => {
    if (/^MAZ-/i.test(name)) return name.replace(/^MAZ-/i, '').trim();
    return null;
  },
  Ural: (name) => {
    if (/^Ural-/i.test(name)) return name.replace(/^Ural-/i, '').trim();
    return null;
  },
};

async function fixTruckModelNames() {
  console.log('🚛 Fixing truck model names (remove brand prefix)...\n');

  if (!process.env.DB_SYNC) {
    process.env.DB_SYNC = 'false';
  }

  await AppDataSource.initialize();

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);

  let updated = 0;
  let merged = 0;
  let skipped = 0;

  for (const [brandName, getNewName] of Object.entries(TRUCK_BRAND_RENAME_RULES)) {
    const brand = await brandRepo.findOne({
      where: { name: brandName },
      select: ['id', 'name'],
    });
    if (!brand) {
      skipped++;
      continue;
    }

    const models = await modelRepo.find({
      where: { brand_id: brand.id },
      select: ['id', 'name'],
    });

    for (const model of models) {
      const newName = getNewName(model.name);
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

  console.log(
    `\n📊 Summary: ${updated} renamed, ${merged} merged (duplicate removed), ${skipped} brands not found`,
  );
  await AppDataSource.destroy();
}

if (require.main === module) {
  fixTruckModelNames()
    .then(() => {
      console.log('\n✅ Done');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

export { fixTruckModelNames };
