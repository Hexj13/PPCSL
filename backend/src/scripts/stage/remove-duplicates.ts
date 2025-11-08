import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';

async function removeDuplicates() {
  console.log('🗑️  Бришење на дубликати од базата на податоци...\n');

  await AppDataSource.initialize();
  console.log('✅ Поврзано со базата на податоци\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  console.log('📊 Бришење на дубликати на модели во рамки на иста марка...\n');

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
          `⚠️  "${brand.name}" - "${modelList[0].name}": ${modelList.length} записи, бришење дубликати...`,
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
          await modelRepo.remove(modelToRemove);
          totalRemoved++;
          console.log(`   ✅ Избришан дубликат: ID ${modelId}`);
        }
        console.log(`   ✅ Зачуван модел: ID ${keepModel.id}, Order: ${keepModel.order}\n`);
      }
    }
  }

  console.log(`\n✅ Завршено!`);
  console.log(`   - Вкупно избришани дубликати: ${totalRemoved}\n`);

  await AppDataSource.destroy();
  console.log('🔌 Врската со базата на податоци е затворена');
}

removeDuplicates()
  .then(() => {
    console.log('✅ Скриптот заврши успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error);
    process.exit(1);
  });
