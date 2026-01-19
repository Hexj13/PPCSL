import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { determineVehicleType } from '../data/vehicle-classification';

const ADDITIONAL_MODELS: Record<string, string[]> = {
  Volkswagen: ['Touareg', 'Arteon', 'ID. Buzz', 'T-Cross', 'Tiguan Allspace'],
  BMW: ['X7', 'X6', '4 Series', '8 Series', 'X2', 'X4', 'iX1', 'iX3'],
  'Mercedes-Benz': ['GLS', 'G-Class', 'SL', 'AMG GT', 'EQS', 'EQE SUV'],
  Audi: ['A8', 'Q2', 'e-tron', 'RS6', 'RS7'],
  Porsche: ['Cayman', 'Boxster', '911 Turbo', 'Panamera Turbo'],
  Toyota: ['Highlander', 'Land Cruiser', 'Prius', 'bZ4X'],
  Honda: ['e:Ny1', 'Civic Type R', 'Pilot'],
  Tesla: ['Cybertruck', 'Roadster'],
  Nissan: ['Leaf', 'Ariya'],
  Kia: ['EV9', 'Sportage'],
  Hyundai: ['Ioniq 7'],
};

async function addModelsToBrands() {
  console.log('🚀 Starting model addition...\n');

  await AppDataSource.initialize();
  console.log('✅ Connected to database\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  let totalAdded = 0;
  let totalUpdated = 0;

  for (const [brandName, newModels] of Object.entries(ADDITIONAL_MODELS)) {
    const brand = await brandRepo.findOne({ where: { name: brandName } });

    if (!brand) {
      console.log(`⚠️  Brand "${brandName}" not found, skipping...\n`);
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
        const vehicleType = determineVehicleType(modelName, brand.name);
        const model = modelRepo.create({
          name: modelName,
          brand_id: brand.id,
          order: maxOrder + i + 1,
          vehicle_type: vehicleType,
        });
        await modelRepo.save(model);
        added++;
        console.log(`  ✅ Added model: ${modelName}`);
      } else {
        existingModel.order = maxOrder + i + 1;
        await modelRepo.save(existingModel);
        updated++;
        console.log(`  ♻️  Updated model: ${modelName}`);
      }
    }

    const allModelsForBrand = await modelRepo.find({
      where: { brand_id: brand.id },
      select: ['vehicle_type'],
    });
    const vehicleTypes = new Set<'car' | 'truck' | 'moto'>();
    for (const model of allModelsForBrand) {
      if (model.vehicle_type) {
        vehicleTypes.add(model.vehicle_type);
      }
    }
    if (vehicleTypes.size > 0) {
      brand.vehicle_types = Array.from(vehicleTypes).sort();
      await brandRepo.save(brand);
    }

    totalAdded += added;
    totalUpdated += updated;

    console.log(`\n📊 ${brandName}:`);
    console.log(`   - Added models: ${added}`);
    console.log(`   - Updated models: ${updated}`);
    console.log(`   - Total models: ${existingModels.length + added}\n`);
  }

  console.log(`\n✅ Complete!`);
  console.log(`   - Total added models: ${totalAdded}`);
  console.log(`   - Total updated models: ${totalUpdated}\n`);

  await AppDataSource.destroy();
  console.log('🔌 Database connection closed');
}

addModelsToBrands()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
