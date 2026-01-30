import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { Vehicle } from '../../listings/entities/vehicle.entity';
import { checkEnvironment, checkPlatform } from '../script-guard';

checkEnvironment(['production', 'stage', 'development', 'test']);
checkPlatform(['common']);

async function removeDuplicates() {
  console.log('🗑️  Удаление дубликатов из базы данных...\n');

  await AppDataSource.initialize();
  console.log('✅ Подключено к базе данных\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);

  console.log('📊 Удаление дубликатов марок...\n');

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
        `⚠️  Дубликат марки: "${brands[0].name}" (${brands.length} записей), удаление дубликатов...`,
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
          console.log(`   ✅ Обновлено объявлений (vehicle): ${vehiclesUpdated.affected}`);
        }

        await brandRepo.remove(brandToRemove);
        brandsRemoved++;
        console.log(
          `   ✅ Удален дубликат: ID ${brandToRemove.id}, перенесено ${modelsToMove.length} моделей`,
        );
      }
      console.log(`   ✅ Сохранена марка: ID ${keepBrand.id}, Order: ${keepBrand.order}\n`);
    }
  }

  if (brandsRemoved === 0) {
    console.log('✅ Дубликаты марок не найдены\n');
  } else {
    console.log(`\n✅ Удалено ${brandsRemoved} дубликатов марок\n`);
  }

  console.log('📊 Удаление дубликатов моделей в рамках одной марки...\n');

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
          `⚠️  "${brand.name}" - "${modelList[0].name}": ${modelList.length} записей, удаление дубликатов...`,
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
            console.log(`   ✅ Обновлено объявлений (vehicle): ${vehiclesUpdated.affected}`);
          }
          await modelRepo.remove(modelToRemove);
          totalRemoved++;
          console.log(`   ✅ Удален дубликат: ID ${modelId}`);
        }
        console.log(`   ✅ Сохранена модель: ID ${keepModel.id}, Order: ${keepModel.order}\n`);
      }
    }
  }

  console.log(`\n✅ Завершено!`);
  console.log(`   - Всего удалено дубликатов: ${totalRemoved}\n`);

  await AppDataSource.destroy();
  console.log('🔌 Соединение с базой данных закрыто');
}

removeDuplicates()
  .then(() => {
    console.log('✅ Скрипт выполнен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });
