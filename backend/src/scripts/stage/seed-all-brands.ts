import 'reflect-metadata';
import { execSync } from 'child_process';

import { ConfigService } from '@nestjs/config';

import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { RedisService } from '../../common/redis.service';
import { CACHE_PREFIXES } from '../../common/utils/cache.utils';
import { AppDataSource } from '../../data-source';

async function checkDuplicates() {
  console.log('\n🔍 Проверка на дубликати...\n');

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

  return { brandDuplicates, modelDuplicates: duplicatesInBrand };
}

async function seedAllBrands() {
  console.log('🌱 Започнување со полно сеење на сите марки и модели...\n');
  console.log('Ова ќе ги изврши сите скриптови за додавање на марки и модели.\n');

  await AppDataSource.initialize();
  console.log('✅ Поврзано со базата на податоци\n');

  const scripts = [
    { name: 'Основни марки и модели', script: 'add-brands' },
    { name: 'Италијански марки', script: 'add-italian-models' },
    { name: 'Американски марки', script: 'add-american-models' },
    { name: 'Германски марки', script: 'add-german-models' },
    { name: 'Јапонски марки', script: 'add-japanese-models' },
    { name: 'Француски марки', script: 'add-french-models' },
    { name: 'Комерцијални модели', script: 'add-commercial-models' },
    { name: 'Grand верзии', script: 'add-grand' },
    { name: 'Историски и ретки модели', script: 'add-historical' },
  ];

  for (const { name, script } of scripts) {
    try {
      console.log(`\n📦 Извршување: ${name}...`);
      execSync(`npm run ${script}`, {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      console.log(`✅ ${name} - завршено\n`);
    } catch (error) {
      console.error(`❌ Грешка при извршување на ${name}:`, error);
    }
  }

  console.log('\n✅ Сите скриптови се извршени успешно!');
  console.log('\n📊 Проверка на резултатите...\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  const brands = await brandRepo.find();
  let totalModels = 0;

  for (const brand of brands) {
    const models = await modelRepo.find({ where: { brand_id: brand.id } });
    totalModels += models.length;
  }

  console.log(`📊 Статистика:`);
  console.log(`   - Вкупно марки: ${brands.length}`);
  console.log(`   - Вкупно модели: ${totalModels}\n`);

  const duplicates = await checkDuplicates();

  if (duplicates.brandDuplicates > 0 || duplicates.modelDuplicates > 0) {
    console.log('\n⚠️  ВНИМАНИЕ: Најдени се дубликати!');
    console.log('   Ве молиме извршете го скриптот: npm run remove-duplicates\n');
  }

  console.log('🗑️  Чистење на кеш за марки и модели...\n');
  try {
    const configService = new ConfigService();
    const redisService = new RedisService(configService);
    await redisService.onModuleInit();

    const deletedBrands = await redisService.invalidateByPrefix(CACHE_PREFIXES.brands);
    console.log(`   ✅ Избришани ${deletedBrands} кешови за марки`);

    const deletedModels = await redisService.invalidateByPrefix(CACHE_PREFIXES.brandsModels);
    console.log(`   ✅ Избришани ${deletedModels} кешови за модели\n`);

    await redisService.onModuleDestroy();
  } catch (error) {
    console.warn('⚠️  Не може да се исчисти кешот (можеби Redis не е достапен):', error);
    console.warn('   Можете да го извршите: npm run clear-cache:brands\n');
  }

  await AppDataSource.destroy();
  console.log('🔌 Врската со базата на податоци е затворена');
}

seedAllBrands()
  .then(() => {
    console.log('\n✨ Скриптот заврши успешно!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error);
    process.exit(1);
  });
