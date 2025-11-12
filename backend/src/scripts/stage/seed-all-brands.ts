import 'reflect-metadata';
import { execSync } from 'child_process';

import { ConfigService } from '@nestjs/config';

import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { RedisService } from '../../common/redis.service';
import { CACHE_PREFIXES } from '../../common/utils/cache.utils';
import { AppDataSource } from '../../data-source';

async function seedAllBrands() {
  console.log('🌱 Започнување со полно сеење на сите марки и модели...\n');
  console.log('Ова ќе ги изврши сите скриптови за додавање на марки и модели.\n');

  const scripts = [
    { name: 'Основни марки', script: 'add-brands' },
    { name: 'Италијански марки', script: 'add-italian-models' },
    { name: 'Американски марки', script: 'add-american-models' },
    { name: 'Германски марки', script: 'add-german-models' },
    { name: 'Јапонски марки', script: 'add-japanese-models' },
    { name: 'Француски марки', script: 'add-french-models' },
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

  await AppDataSource.initialize();
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
