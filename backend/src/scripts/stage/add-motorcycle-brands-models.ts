import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { MIXED_BRANDS, MOTO_ONLY_BRANDS } from '../data/vehicle-classification';
import { checkEnvironment, checkPlatform } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);
checkPlatform(['md', 'al']);

async function addMotorcycleBrandsAndModels() {
  if (!process.env.DB_SYNC) {
    process.env.DB_SYNC = 'false';
  }

  await AppDataSource.initialize();
  console.log('✅ Connected to database\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  let brandsAdded = 0;
  let modelsAdded = 0;
  let modelsUpdated = 0;

  const maxOrderResult = await brandRepo
    .createQueryBuilder('brand')
    .select('MAX(brand.order)', 'max')
    .getRawOne();
  let currentOrder = (maxOrderResult?.max || 0) + 1;

  const allMotoBrands = new Set<string>();

  for (const brandName of MOTO_ONLY_BRANDS) {
    allMotoBrands.add(brandName);
  }

  for (const [brandName, brandData] of Object.entries(MIXED_BRANDS)) {
    if (brandData.moto && brandData.moto.length > 0) {
      allMotoBrands.add(brandName);
    }
  }

  console.log(`🏍️  Found ${allMotoBrands.size} motorcycle brands to process\n`);

  for (const brandName of Array.from(allMotoBrands).sort()) {
    let brand = await brandRepo.findOne({ where: { name: brandName } });

    if (!brand) {
      brand = brandRepo.create({
        name: brandName,
        order: currentOrder++,
        vehicle_types: ['moto'],
      });
      brand = await brandRepo.save(brand);
      brandsAdded++;
      console.log(`✅ Created brand: ${brandName}`);
    } else {
      if (!brand.vehicle_types || !brand.vehicle_types.includes('moto')) {
        const vehicleTypes = brand.vehicle_types || [];
        if (!vehicleTypes.includes('moto')) {
          vehicleTypes.push('moto');
          brand.vehicle_types = vehicleTypes.sort();
          await brandRepo.save(brand);
        }
      }
    }

    const motoModels: string[] = [];

    if (MOTO_ONLY_BRANDS.includes(brandName)) {
      console.log(`   ⚠️  ${brandName} is MOTO_ONLY but no models defined in MIXED_BRANDS`);
    }

    const mixedBrandData = MIXED_BRANDS[brandName];
    if (mixedBrandData && mixedBrandData.moto) {
      motoModels.push(...mixedBrandData.moto);
    }

    if (motoModels.length === 0) {
      console.log(`   ⚠️  No motorcycle models found for ${brandName}`);
      continue;
    }

    const existingModels = await modelRepo.find({
      where: { brand_id: brand.id },
    });

    const existingModelsMap = new Map<string, VehicleModel>();
    for (const model of existingModels) {
      existingModelsMap.set(model.name.toLowerCase(), model);
    }

    for (let i = 0; i < motoModels.length; i++) {
      const modelName = motoModels[i];
      const modelNameLower = modelName.toLowerCase();

      const existingModel = existingModelsMap.get(modelNameLower);

      if (!existingModel) {
        const model = modelRepo.create({
          name: modelName,
          brand_id: brand.id,
          order: i + 1,
          vehicle_types: ['moto'],
        });
        await modelRepo.save(model);
        modelsAdded++;
        console.log(`   ✅ Added model: ${modelName}`);
      } else {
        if (!existingModel.vehicle_types?.includes('moto')) {
          existingModel.vehicle_types = ['moto'];
          existingModel.order = i + 1;
          await modelRepo.save(existingModel);
          modelsUpdated++;
          console.log(`   ♻️  Updated model: ${modelName} (set vehicle_types to moto)`);
        } else if (existingModel.order !== i + 1) {
          existingModel.order = i + 1;
          await modelRepo.save(existingModel);
        }
      }
    }

    const vehicleTypes = new Set<'car' | 'truck' | 'moto' | 'tire'>();
    const allBrandModels = await modelRepo.find({
      where: { brand_id: brand.id },
    });
    for (const model of allBrandModels) {
      if (model.vehicle_types?.[0]) {
        vehicleTypes.add(model.vehicle_types[0]);
      }
    }
    if (vehicleTypes.size > 0) {
      brand.vehicle_types = Array.from(vehicleTypes).sort();
      await brandRepo.save(brand);
    }
  }

  console.log(`\n✅ Complete!`);
  console.log(`   - Brands added: ${brandsAdded}`);
  console.log(`   - Models added: ${modelsAdded}`);
  console.log(`   - Models updated: ${modelsUpdated}\n`);

  await AppDataSource.destroy();
  console.log('🔌 Database connection closed');
}

if (require.main === module) {
  addMotorcycleBrandsAndModels()
    .then(() => {
      console.log('\n🎉 Motorcycle brands and models addition completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error during motorcycle brands and models addition:', error);
      process.exit(1);
    });
}

export { addMotorcycleBrandsAndModels };
