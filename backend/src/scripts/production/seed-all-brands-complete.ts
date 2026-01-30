import 'reflect-metadata';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { ConfigService } from '@nestjs/config';

import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { RedisService } from '../../common/redis.service';
import { CACHE_PREFIXES } from '../../common/utils/cache.utils';
import { AppDataSource } from '../../data-source';
import { checkEnvironment, checkPlatform } from '../script-guard';

checkEnvironment(['production', 'stage', 'development', 'test']);
checkPlatform(['common']);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function forceGarbageCollection(): void {
  if (global.gc) {
    global.gc();
  }
}

async function safeDelay(ms: number): Promise<void> {
  await delay(ms);
  forceGarbageCollection();
}

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

type Loader = {
  start: (text: string) => void;
  succeed: (text: string) => void;
  fail: (text: string) => void;
};

function createLoader(): Loader {
  if (!process.stdout.isTTY) {
    return {
      start: (text: string) => process.stdout.write(`${text}\n`),
      succeed: (text: string) => process.stdout.write(`${text}\n`),
      fail: (text: string) => process.stdout.write(`${text}\n`),
    };
  }

  let interval: NodeJS.Timeout | undefined;
  let frame = 0;
  let currentText = '';

  const render = () => {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(`${currentText} ${SPINNER_FRAMES[frame]}`);
    frame = (frame + 1) % SPINNER_FRAMES.length;
  };

  const stop = (text: string) => {
    if (interval) {
      clearInterval(interval);
      interval = undefined;
    }
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(`${text}\n`);
  };

  return {
    start: (text: string) => {
      currentText = text;
      frame = 0;
      render();
      interval = setInterval(render, 120);
    },
    succeed: (text: string) => stop(text),
    fail: (text: string) => stop(text),
  };
}

function runScript(scriptName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let stdoutBuffer = '';
    let scriptPath = process.cwd();

    if (!scriptPath.includes('core/backend')) {
      const backendPath = path.resolve(__dirname, '../../../../');
      if (fs.existsSync(path.join(backendPath, 'package.json'))) {
        scriptPath = backendPath;
      }
    }

    const child = spawn('npm', ['run', scriptName], {
      cwd: scriptPath,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        stdoutBuffer += chunk.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        process.stderr.write(chunk);
      });
    }

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdoutBuffer.trim());
      } else {
        reject(new Error(`Script "${scriptName}" exited with code ${code}`));
      }
    });
  });
}

async function runStageScript(index: number, total: number, name: string, scriptName: string) {
  const loader = createLoader();
  const label = `[${index}/${total}] ${name}`;

  loader.start(label);

  try {
    const output = await runScript(scriptName);
    loader.succeed(`${label} ✅`);
    if (output) {
      const lines = output
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length > 0) {
        const lastLine = lines[lines.length - 1];
        console.log(`   ${lastLine}`);
      }
    }
  } catch (error) {
    loader.fail(`${label} ❌`);
    throw error;
  }
}

async function checkDuplicates() {
  console.log('\n🔍 Проверка на дубликати...\n');

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
  const duplicateBrands: string[] = [];
  for (const [, brands] of brandNames.entries()) {
    if (brands.length > 1) {
      brandDuplicates++;
      duplicateBrands.push(brands[0].name);
    }
  }

  await delay(200);

  const brands = await brandRepo.find({ select: ['id', 'name'] });
  const modelDuplicatesByBrand = new Map<string, Map<string, VehicleModel[]>>();
  let duplicatesInBrand = 0;
  const duplicateModels: string[] = [];
  const BATCH_SIZE = 10;

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

    await safeDelay(300);
  }

  for (const [brandName, models] of modelDuplicatesByBrand.entries()) {
    for (const [, modelList] of models.entries()) {
      if (modelList.length > 1) {
        duplicatesInBrand++;
        duplicateModels.push(`${brandName} - ${modelList[0].name}`);
      }
    }
  }

  console.log(`📊 Результаты проверки дубликатов:`);
  console.log(`   - Дубликаты марок: ${brandDuplicates}`);
  if (brandDuplicates > 0) {
    console.log(
      `   - Найденные дубликаты марок: ${duplicateBrands.slice(0, 10).join(', ')}${duplicateBrands.length > 10 ? '...' : ''}`,
    );
  }
  console.log(`   - Дубликаты моделей в рамках одной марки: ${duplicatesInBrand}`);
  if (duplicatesInBrand > 0) {
    console.log(
      `   - Найденные дубликаты моделей: ${duplicateModels.slice(0, 10).join(', ')}${duplicateModels.length > 10 ? '...' : ''}`,
    );
  }

  return { brandDuplicates, modelDuplicates: duplicatesInBrand, duplicateBrands, duplicateModels };
}

async function seedAllBrandsComplete() {
  const skipDuplicateCheck = process.argv.includes('--skip-duplicates');
  const skipHeavyScripts = process.argv.includes('--skip-heavy');
  const delayBetweenScripts = parseInt(process.env.SCRIPT_DELAY_MS || '5000', 10);

  console.log('🌱 Полная генерация всех марок и моделей...\n');
  console.log('ℹ️  Все скрипты генерации проверяют существование перед добавлением,');
  console.log('   поэтому дубликаты не должны создаваться.\n');
  if (skipHeavyScripts) {
    console.log('⚠️  Тяжелые скрипты пропущены\n');
  }
  if (skipDuplicateCheck) {
    console.log('⚠️  Проверка дубликатов пропущена\n');
  }

  if (!process.env.DB_SYNC) {
    process.env.DB_SYNC = 'false';
  }

  await AppDataSource.initialize();

  const allScripts = [
    { name: 'Базовые марки и модели', script: 'add-brands', heavy: false },
    { name: 'Итальянские марки', script: 'add-italian-models', heavy: false },
    { name: 'Американские марки', script: 'add-american-models', heavy: true },
    { name: 'Немецкие марки', script: 'add-german-models', heavy: false },
    { name: 'Японские марки', script: 'add-japanese-models', heavy: true },
    { name: 'Французские марки', script: 'add-french-models', heavy: false },
    { name: 'Коммерческие модели', script: 'add-commercial-models', heavy: true },
    { name: 'Grand версии', script: 'add-grand', heavy: false },
    { name: 'Исторические и редкие модели', script: 'add-historical', heavy: true },
    {
      name: 'Недостающие марки легкового транспорта',
      script: 'add-missing-car-brands:prod',
      heavy: false,
    },
    { name: 'Марки грузовиков', script: 'add-truck-brands:prod', heavy: true },
    { name: 'Марки мотоциклов', script: 'add-moto-brands:prod', heavy: true },
    {
      name: 'Разделение марок (Great Wall / Land Rover)',
      script: 'apply-brand-splits:prod',
      heavy: false,
    },
    {
      name: 'Исправление названий Tank/Haval (убрать префикс)',
      script: 'fix-tank-haval-model-names:prod',
      heavy: false,
    },
    {
      name: 'Исправление названий моделей грузовиков',
      script: 'fix-truck-model-names:prod',
      heavy: false,
    },
    {
      name: 'Исправление названий моделей мотоциклов',
      script: 'fix-moto-model-names:prod',
      heavy: false,
    },
  ];

  const scripts = skipHeavyScripts ? allScripts.filter((s) => !s.heavy) : allScripts;

  const scriptErrors: string[] = [];

  for (let i = 0; i < scripts.length; i++) {
    const { name, script } = scripts[i];
    try {
      await runStageScript(i + 1, scripts.length, name, script);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      scriptErrors.push(`${name}: ${errorMessage}`);
      console.error(`   ❌ Ошибка: ${errorMessage}`);
    }

    if (i < scripts.length - 1) {
      await safeDelay(delayBetweenScripts);
    }
  }

  if (scriptErrors.length > 0) {
    console.warn('\n⚠️  Ошибки во время выполнения скриптов:');
    for (const errorMessage of scriptErrors) {
      console.warn(`   - ${errorMessage}`);
    }
  }

  await safeDelay(2000);

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  const brands = await brandRepo.find({ select: ['id'] });
  const totalModels = await modelRepo.count();

  console.log(`\n📊 Итоговые результаты: ${brands.length} марок, ${totalModels} моделей`);

  await safeDelay(1000);

  let duplicates: {
    brandDuplicates: number;
    modelDuplicates: number;
    duplicateBrands: string[];
    duplicateModels: string[];
  } = {
    brandDuplicates: 0,
    modelDuplicates: 0,
    duplicateBrands: [],
    duplicateModels: [],
  };

  if (!skipDuplicateCheck) {
    duplicates = await checkDuplicates();

    if (duplicates.brandDuplicates > 0 || duplicates.modelDuplicates > 0) {
      console.log(
        `\n⚠️  Найдены дубликаты: ${duplicates.brandDuplicates} марок, ${duplicates.modelDuplicates} моделей`,
      );

      const autoRemove = process.argv.includes('--auto-remove-duplicates');
      if (autoRemove) {
        console.log('\n🗑️  Автоматическое удаление дубликатов...');
        try {
          await runStageScript(
            scripts.length + 1,
            scripts.length + 1,
            'Удаление дубликатов',
            'remove-duplicates:prod',
          );
          console.log('✅ Дубликаты удалены');

          await safeDelay(1000);
          const recheck = await checkDuplicates();
          if (recheck.brandDuplicates === 0 && recheck.modelDuplicates === 0) {
            console.log('✅ Подтверждено: дубликаты удалены');
          } else {
            console.warn(
              `⚠️  Остались дубликаты: ${recheck.brandDuplicates} марок, ${recheck.modelDuplicates} моделей`,
            );
          }
        } catch (error) {
          console.error(
            '❌ Ошибка при удалении дубликатов:',
            error instanceof Error ? error.message : String(error),
          );
          console.log('   Рекомендуется запустить скрипт удаления дубликатов вручную');
        }
      } else {
        console.log('   Для автоматического удаления запустите с флагом --auto-remove-duplicates');
        console.log('   Или запустите вручную: npm run remove-duplicates');
      }
    } else {
      console.log('\n✅ Дубликаты не найдены');
    }
  }

  await safeDelay(1000);

  try {
    const configService = new ConfigService();
    const redisService = new RedisService(configService);
    await redisService.onModuleInit();

    await redisService.invalidateByPrefix(CACHE_PREFIXES.brands);
    await redisService.invalidateByPrefix(CACHE_PREFIXES.brandsModels);

    await redisService.onModuleDestroy();
    console.log('\n✅ Кэш очищен');
  } catch {
    console.warn('\n⚠️  Кэш не может быть очищен (Redis недоступен)');
  }

  await AppDataSource.destroy();

  console.log('\n✅ Полная генерация завершена');
  console.log(`   - Обработано скриптов: ${scripts.length}`);
  console.log(`   - Ошибок: ${scriptErrors.length}`);
  console.log(`   - Дубликаты марок: ${duplicates.brandDuplicates}`);
  console.log(`   - Дубликаты моделей: ${duplicates.modelDuplicates}`);
}

seedAllBrandsComplete()
  .then(() => {
    console.log('\n✨ Скрипт выполнен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Ошибка:', error.message);
    process.exit(1);
  });
