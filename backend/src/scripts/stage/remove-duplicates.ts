import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { Vehicle } from '../../listings/entities/vehicle.entity';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);

async function removeDuplicates() {
  console.log('🗑️  Removing duplicates from database...\n');

  await AppDataSource.initialize();
  console.log('✅ Connected to database\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);

  console.log('📊 Removing duplicate brands...\n');

  const allBrandsForCheck = await brandRepo.find({
    relations: ['models'],
    order: { name: 'ASC' },
  });

  const brandNames = new Map<string, Brand[]>();
  for (const brand of allBrandsForCheck) {
    const nameLower = brand.name.toLowerCase().trim();
    if (!brandNames.has(nameLower)) {
      brandNames.set(nameLower, []);
    }
    brandNames.get(nameLower)!.push(brand);
  }

  let brandsRemoved = 0;
  for (const [, brands] of brandNames.entries()) {
    if (brands.length > 1) {
      console.log(
        `⚠️  Duplicate brand: "${brands[0].name}" (${brands.length} records), removing duplicates...`,
      );

      const sortedBrands = brands.sort((a, b) => {
        const aModelCount = a.models?.length || 0;
        const bModelCount = b.models?.length || 0;
        if (aModelCount !== bModelCount) {
          return bModelCount - aModelCount;
        }
        if (a.order !== b.order) {
          return a.order - b.order;
        }
        return a.created_at.getTime() - b.created_at.getTime();
      });

      const keepBrand = sortedBrands[0];
      const removeBrands = sortedBrands.slice(1);

      for (const brandToRemove of removeBrands) {
        const modelsToMove = await modelRepo.find({
          where: { brand_id: brandToRemove.id },
        });

        for (const model of modelsToMove) {
          await modelRepo.update(model.id, { brand_id: keepBrand.id });
        }

        const vehiclesUpdated = await vehicleRepo.update(
          { brand_id: brandToRemove.id },
          { brand_id: keepBrand.id },
        );
        if (vehiclesUpdated.affected && vehiclesUpdated.affected > 0) {
          console.log(`   ✅ Updated ${vehiclesUpdated.affected} vehicle(s) to kept brand`);
        }

        await brandRepo.remove(brandToRemove);
        brandsRemoved++;
        console.log(
          `   ✅ Deleted duplicate: ID ${brandToRemove.id}, moved ${modelsToMove.length} models`,
        );
      }
      console.log(`   ✅ Kept brand: ID ${keepBrand.id}, Order: ${keepBrand.order}\n`);
    }
  }

  if (brandsRemoved === 0) {
    console.log('✅ No duplicate brands found\n');
  } else {
    console.log(`\n✅ Deleted ${brandsRemoved} duplicate brands\n`);
  }

  console.log('📊 Removing duplicate models within same brand...\n');

  const allBrands = await brandRepo.find();
  let totalRemoved = 0;

  for (const brand of allBrands) {
    const models = await modelRepo.find({
      where: { brand_id: brand.id },
      order: { order: 'ASC' },
    });

    const modelMap = new Map<string, VehicleModel[]>();

    for (const model of models) {
      const nameLower = model.name.toLowerCase().trim();
      if (!modelMap.has(nameLower)) {
        modelMap.set(nameLower, []);
      }
      modelMap.get(nameLower)!.push(model);
    }

    for (const [, modelList] of modelMap.entries()) {
      if (modelList.length > 1) {
        console.log(
          `⚠️  "${brand.name}" - "${modelList[0].name}": ${modelList.length} records, removing duplicates...`,
        );

        const sortedModels = modelList.sort((a, b) => {
          if (a.order !== b.order) {
            return a.order - b.order;
          }
          return a.created_at.getTime() - b.created_at.getTime();
        });

        const keepModel = sortedModels[0];
        const removeModels = sortedModels.slice(1);

        for (const modelToRemove of removeModels) {
          const modelId = modelToRemove.id;
          const vehiclesUpdated = await vehicleRepo.update(
            { model_id: modelId },
            { model_id: keepModel.id },
          );
          if (vehiclesUpdated.affected && vehiclesUpdated.affected > 0) {
            console.log(`   ✅ Updated ${vehiclesUpdated.affected} vehicle(s) to kept model`);
          }
          await modelRepo.remove(modelToRemove);
          totalRemoved++;
          console.log(`   ✅ Deleted duplicate: ID ${modelId}`);
        }
        console.log(`   ✅ Kept model: ID ${keepModel.id}, Order: ${keepModel.order}\n`);
      }
    }
  }

  console.log(`\n✅ Complete!`);
  console.log(`   - Total duplicates removed: ${totalRemoved}\n`);

  await AppDataSource.destroy();
  console.log('🔌 Database connection closed');
}

removeDuplicates()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
