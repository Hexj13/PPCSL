import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['production', 'stage', 'development', 'test']);

async function checkBrandModelNameDuplicates() {
  console.log('🔍 Checking brands that have a model with the same name as the brand...\n');

  await AppDataSource.initialize();

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  const brands = await brandRepo.find({
    order: { name: 'ASC' },
    select: ['id', 'name'],
  });

  const duplicates: Array<{ brandName: string; modelId: string; modelName: string }> = [];

  for (const brand of brands) {
    const models = await modelRepo.find({
      where: { brand_id: brand.id },
      select: ['id', 'name'],
    });

    const brandNameNorm = brand.name.trim().toLowerCase();
    for (const model of models) {
      if (model.name.trim().toLowerCase() === brandNameNorm) {
        duplicates.push({
          brandName: brand.name,
          modelId: model.id,
          modelName: model.name,
        });
      }
    }
  }

  if (duplicates.length === 0) {
    console.log('✅ No brands found where a model name duplicates the brand name');
  } else {
    console.log(`📋 Found ${duplicates.length} model(s) whose name equals the brand name:\n`);
    const byBrand = new Map<string, typeof duplicates>();
    for (const d of duplicates) {
      if (!byBrand.has(d.brandName)) byBrand.set(d.brandName, []);
      byBrand.get(d.brandName)!.push(d);
    }
    for (const [brandName, list] of byBrand.entries()) {
      console.log(`   • ${brandName}`);
      list.forEach(({ modelId, modelName }) =>
        console.log(`     - model: "${modelName}" (id: ${modelId})`),
      );
      console.log('');
    }
  }

  await AppDataSource.destroy();
  return duplicates;
}

if (require.main === module) {
  checkBrandModelNameDuplicates()
    .then((_list) => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

export { checkBrandModelNameDuplicates };
