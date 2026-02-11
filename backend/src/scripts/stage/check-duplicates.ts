import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';

async function checkDuplicates() {
  console.log('🔍 Проверка на дубликати во базата на податоци...\n');

  await AppDataSource.initialize();
  console.log('✅ Connected to database\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  console.log('📊 Проверка на дубликати на марки...\n');
  const allBrands = await brandRepo.find({
    order: { name: 'ASC' },
  });

  const brandNames = new Map<string, Brand[]>();
  for (const brand of allBrands) {
    const nameLower = brand.name.toLowerCase().trim();
    if (!brandNames.has(nameLower)) {
      brandNames.set(nameLower, []);
    }
    brandNames.get(nameLower)!.push(brand);
  }

  let brandDuplicates = 0;
  for (const [, brands] of brandNames.entries()) {
    if (brands.length > 1) {
      brandDuplicates++;
      console.log(`⚠️  Дубликат марка: "${brands[0].name}" (${brands.length} записи)`);
      brands.forEach((brand, index) => {
        console.log(`   ${index + 1}. ID: ${brand.id}, Order: ${brand.order}`);
      });
      console.log('');
    }
  }

  if (brandDuplicates === 0) {
    console.log('✅ Нема дубликати на марки\n');
  } else {
    console.log(`\n📊 Најдени ${brandDuplicates} дубликати на марки\n`);
  }

  console.log('📊 Проверка на дубликати на модели...\n');
  const allModels = await modelRepo.find({
    relations: ['brand'],
    order: { name: 'ASC' },
  });

  const modelDuplicatesByBrand = new Map<string, Map<string, VehicleModel[]>>();

  for (const model of allModels) {
    const modelNameLower = model.name.toLowerCase().trim();
    const brandName = model.brand?.name || 'Unknown';

    if (!modelDuplicatesByBrand.has(brandName)) {
      modelDuplicatesByBrand.set(brandName, new Map());
    }
    const brandModels = modelDuplicatesByBrand.get(brandName)!;

    if (!brandModels.has(modelNameLower)) {
      brandModels.set(modelNameLower, []);
    }
    brandModels.get(modelNameLower)!.push(model);
  }

  let duplicatesInBrand = 0;

  console.log('🔍 Дубликати на модели во рамки на иста марка:\n');
  for (const [brandName, models] of modelDuplicatesByBrand.entries()) {
    for (const [, modelList] of models.entries()) {
      if (modelList.length > 1) {
        duplicatesInBrand++;
        console.log(`⚠️  "${brandName}" - "${modelList[0].name}" (${modelList.length} записи)`);
        modelList.forEach((model, index) => {
          console.log(`   ${index + 1}. ID: ${model.id}, Order: ${model.order}`);
        });
        console.log('');
      }
    }
  }

  if (duplicatesInBrand === 0) {
    console.log('✅ Нема дубликати на модели во рамки на иста марка\n');
  } else {
    console.log(`\n📊 Најдени ${duplicatesInBrand} дубликати на модели во рамки на иста марка\n`);
  }

  console.log('📊 Статистика:');
  console.log(`   - Total brands: ${allBrands.length}`);
  console.log(`   - Total models: ${allModels.length}`);
  console.log(`   - Дубликати на марки: ${brandDuplicates}`);
  console.log(`   - Дубликати на модели во рамки на иста марка: ${duplicatesInBrand}\n`);

  await AppDataSource.destroy();
  console.log('🔌 Database connection closed');
}

checkDuplicates()
  .then(() => {
    console.log('✅ Скриптот заврши успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error);
    process.exit(1);
  });
