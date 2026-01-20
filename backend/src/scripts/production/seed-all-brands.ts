import 'reflect-metadata';
import { spawn } from 'child_process';

import { ConfigService } from '@nestjs/config';

import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { RedisService } from '../../common/redis.service';
import { CACHE_PREFIXES } from '../../common/utils/cache.utils';
import { AppDataSource } from '../../data-source';
import { checkEnvironment, checkPlatform } from '../script-guard';

checkEnvironment(['production', 'stage', 'development', 'test']);
checkPlatform(['mk', 'al']);

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
    const child = spawn('npm', ['run', scriptName], {
      cwd: process.cwd(),
      env: process.env,
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
  const skipHeavyScripts = process.argv.includes('--skip-heavy');
  const delayBetweenScripts = parseInt(process.env.SCRIPT_DELAY_MS || '8000', 10);

  console.log('🌱 Seeding brands and models...\n');
  if (skipHeavyScripts) {
    console.log('⚠️  Heavy scripts are skipped\n');
  }

  if (!process.env.DB_SYNC) {
    process.env.DB_SYNC = 'false';
  }

  await AppDataSource.initialize();

  const allScripts = [
    { name: 'Base brands and models', script: 'add-brands', heavy: false },
    { name: 'Italian brands', script: 'add-italian-models', heavy: false },
    { name: 'American brands', script: 'add-american-models', heavy: true },
    { name: 'German brands', script: 'add-german-models', heavy: false },
    { name: 'Japanese brands', script: 'add-japanese-models', heavy: true },
    { name: 'French brands', script: 'add-french-models', heavy: false },
    { name: 'Commercial models', script: 'add-commercial-models', heavy: true },
    { name: 'Grand versions', script: 'add-grand', heavy: false },
    { name: 'Historical and rare models', script: 'add-historical', heavy: true },
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
    }

    if (i < scripts.length - 1) {
      await safeDelay(delayBetweenScripts);
    }
  }

  if (scriptErrors.length > 0) {
    console.warn('\n⚠️  Errors during child script execution:');
    for (const errorMessage of scriptErrors) {
      console.warn(`   - ${errorMessage}`);
    }
  }

  await safeDelay(1000);

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  const brands = await brandRepo.find({ select: ['id'] });
  const totalModels = await modelRepo.count();

  console.log(`\n📊 Results: ${brands.length} brands, ${totalModels} models`);

  await safeDelay(1000);

  const duplicates = await checkDuplicates(skipDuplicateCheck);

  if (duplicates.brandDuplicates > 0 || duplicates.modelDuplicates > 0) {
    console.log(
      `\n⚠️  Duplicates found: ${duplicates.brandDuplicates} brands, ${duplicates.modelDuplicates} models`,
    );
    console.log('   Run: npm run remove-duplicates');
  }

  await safeDelay(1000);

  try {
    const configService = new ConfigService();
    const redisService = new RedisService(configService);
    await redisService.onModuleInit();

    await redisService.invalidateByPrefix(CACHE_PREFIXES.brands);
    await redisService.invalidateByPrefix(CACHE_PREFIXES.brandsModels);

    await redisService.onModuleDestroy();
  } catch {
    console.warn('\n⚠️  Cache cannot be cleared (Redis not available)');
  }

  await AppDataSource.destroy();
}

seedAllBrands()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
