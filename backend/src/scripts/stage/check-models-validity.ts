import 'reflect-metadata';

import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { checkEnvironment, checkPlatform } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);
checkPlatform(['md', 'al']);

type SuspiciousModel = {
  brand: string;
  model: string;
  reason: string;
};

const GRAND_ALLOWLIST = new Set<string>([
  'Grand Cherokee',
  'Grand Wagoneer',
  'Grand Scenic',
  'Grand C4 Picasso',
  'C4 Grand Picasso',
  'Grand C-MAX',
  'Grand Livina',
  'Grand Highlander',
  'Grand Voyager',
  'Grand Caravan',
  'Grand Starex',
  'Grand Santa Fe',
  'Grand Carnival',
  'Grandis',
  'Grand Vitara',
]);

const ALWAYS_ALLOWED_SHORT_MODELS = new Set<string>([
  '#1',
  '#3',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
]);

const TRIM_KEYWORDS = [
  'Limited',
  'Platinum',
  'Black Label',
  'Sport',
  'Performance',
  'Long Range',
  'Trackhawk',
  'Rubicon',
  'Hellcat',
  'SRT',
  'RS',
  'GT',
  'Hybrid',
  '4xe',
  'e-',
];

function isSingleLatinLetter(s: string): boolean {
  return /^[A-Za-z]$/.test(s);
}

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

function hasAnyKeyword(haystack: string, keywords: string[]): boolean {
  const lower = haystack.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

async function checkModelsValidity() {
  await AppDataSource.initialize();

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  const brands = await brandRepo.find({ select: ['id', 'name'] });
  const models = await modelRepo.find({ select: ['id', 'name', 'brand_id', 'vehicle_types'] });

  const brandNameById = new Map<string, string>();
  for (const brand of brands) {
    brandNameById.set(String(brand.id), brand.name);
  }

  const suspicious: SuspiciousModel[] = [];
  const trimLike: SuspiciousModel[] = [];

  for (const model of models) {
    const brandName = brandNameById.get(String(model.brand_id)) || 'Unknown';
    const modelName = normalize(model.name);

    if (!modelName) {
      suspicious.push({ brand: brandName, model: model.name, reason: 'Пустое название модели' });
      continue;
    }

    const lower = modelName.toLowerCase();

    if (modelName === 'Picasso' || modelName === 'Cactus') {
      suspicious.push({ brand: brandName, model: modelName, reason: 'Слишком общее/не модель' });
      continue;
    }

    if (isSingleLatinLetter(modelName) && !ALWAYS_ALLOWED_SHORT_MODELS.has(modelName)) {
      suspicious.push({ brand: brandName, model: modelName, reason: 'Одна латинская буква' });
      continue;
    }

    if (modelName.length <= 2 && !ALWAYS_ALLOWED_SHORT_MODELS.has(modelName)) {
      if (!/^\d+$/.test(modelName)) {
        suspicious.push({
          brand: brandName,
          model: modelName,
          reason: 'Слишком короткое название',
        });
        continue;
      }
    }

    if (lower.startsWith('grand ') || lower.endsWith(' grand') || lower.includes(' grand ')) {
      if (!GRAND_ALLOWLIST.has(modelName)) {
        suspicious.push({
          brand: brandName,
          model: modelName,
          reason: 'Подозрительное использование "Grand" (не в allowlist)',
        });
        continue;
      }
    }

    if (hasAnyKeyword(modelName, TRIM_KEYWORDS)) {
      trimLike.push({
        brand: brandName,
        model: modelName,
        reason: 'Похоже на комплектацию/модификацию',
      });
    }
  }

  const total = models.length;
  console.log(`📊 Всего моделей: ${total}`);
  console.log(`⚠️  Подозрительных моделей: ${suspicious.length}`);
  console.log(`ℹ️  Похожих на комплектации/модификации: ${trimLike.length}`);

  const byBrand = new Map<string, SuspiciousModel[]>();
  for (const item of suspicious) {
    if (!byBrand.has(item.brand)) byBrand.set(item.brand, []);
    byBrand.get(item.brand)!.push(item);
  }

  if (suspicious.length > 0) {
    console.log('\n=== Подозрительные модели (по брендам) ===');
    for (const [brand, items] of Array.from(byBrand.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      const unique = Array.from(
        new Map(items.map((i) => [`${i.model}__${i.reason}`, i] as const)).values(),
      );
      console.log(`\n- ${brand}: ${unique.length}`);
      for (const i of unique.slice(0, 50)) {
        console.log(`  - ${i.model} (${i.reason})`);
      }
      if (unique.length > 50) {
        console.log(`  ... ещё ${unique.length - 50}`);
      }
    }
  }

  await AppDataSource.destroy();
}

checkModelsValidity()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });
