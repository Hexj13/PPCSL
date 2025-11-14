import 'reflect-metadata';
import { execSync } from 'child_process';

import { ConfigService } from '@nestjs/config';

import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { RedisService } from '../../common/redis.service';
import { CACHE_PREFIXES } from '../../common/utils/cache.utils';
import { AppDataSource } from '../../data-source';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkDuplicates(skipCheck: boolean = false) {
  if (skipCheck) {
    return { brandDuplicates: 0, modelDuplicates: 0 };
  }

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  const allBrands = await brandRepo.find({
    order: { name: 'ASC' },
    select: ['id', 'name', 'order'],
  });

  await delay(100);

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
    }
  }

  await delay(200);

  const brands = await brandRepo.find({ select: ['id', 'name'] });
  const modelDuplicatesByBrand = new Map<string, Map<string, VehicleModel[]>>();
  let duplicatesInBrand = 0;
  const BATCH_SIZE = 20;

  for (let i = 0; i < brands.length; i += BATCH_SIZE) {
    const batch = brands.slice(i, i + BATCH_SIZE);

    for (const brand of batch) {
      const models = await modelRepo.find({
        where: { brand_id: brand.id },
        select: ['id', 'name', 'order'],
        order: { name: 'ASC' },
      });

      if (!modelDuplicatesByBrand.has(brand.name)) {
        modelDuplicatesByBrand.set(brand.name, new Map());
      }
      const brandModels = modelDuplicatesByBrand.get(brand.name)!;

      for (const model of models) {
        const modelNameLower = model.name.toLowerCase().trim();
        if (!brandModels.has(modelNameLower)) {
          brandModels.set(modelNameLower, []);
        }
        brandModels.get(modelNameLower)!.push(model);
      }
    }

    await delay(150);
  }

  for (const [, models] of modelDuplicatesByBrand.entries()) {
    for (const [, modelList] of models.entries()) {
      if (modelList.length > 1) {
        duplicatesInBrand++;
      }
    }
  }

  return { brandDuplicates, modelDuplicates: duplicatesInBrand };
}

async function seedAllBrands() {
  const skipDuplicateCheck = process.argv.includes('--skip-duplicates');
  const delayBetweenScripts = parseInt(process.env.SCRIPT_DELAY_MS || '2000', 10);

  console.log('🌱 Сеење на марки и модели...\n');

  await AppDataSource.initialize();

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

  for (let i = 0; i < scripts.length; i++) {
    const { name, script } = scripts[i];
    try {
      process.stdout.write(`[${i + 1}/${scripts.length}] ${name}... `);
      execSync(`npm run ${script}`, {
        stdio: 'pipe',
        cwd: process.cwd(),
      });
      console.log('✅');

      if (i < scripts.length - 1) {
        await delay(delayBetweenScripts);
      }
    } catch (error) {
      console.log('❌');
      console.error(`   Грешка: ${name}`);
      await delay(delayBetweenScripts);
    }
  }

  await delay(500);

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  const brands = await brandRepo.find({ select: ['id'] });
  const totalModels = await modelRepo.count();

  console.log(`\n📊 Резултати: ${brands.length} марки, ${totalModels} модели`);

  await delay(500);

  const duplicates = await checkDuplicates(skipDuplicateCheck);

  if (duplicates.brandDuplicates > 0 || duplicates.modelDuplicates > 0) {
    console.log(
      `\n⚠️  Најдени дубликати: ${duplicates.brandDuplicates} марки, ${duplicates.modelDuplicates} модели`,
    );
    console.log('   Извршете: npm run remove-duplicates');
  }

  await delay(500);

  try {
    const configService = new ConfigService();
    const redisService = new RedisService(configService);
    await redisService.onModuleInit();

    await redisService.invalidateByPrefix(CACHE_PREFIXES.brands);
    await redisService.invalidateByPrefix(CACHE_PREFIXES.brandsModels);

    await redisService.onModuleDestroy();
  } catch (error) {
    console.warn('\n⚠️  Кешот не може да се исчисти (Redis не е достапен)');
  }

  await AppDataSource.destroy();
}

seedAllBrands()
  .then(() => {
    console.log('\n✅ Завршено');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Грешка:', error.message);
    process.exit(1);
  });
