import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { checkEnvironment, checkPlatform } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);
checkPlatform(['md']);

const BUS_KEYWORDS = [
  'Bus',
  'Citaro',
  'Tourismo',
  'Intouro',
  'Integro',
  'Coaster',
  'Rosa',
  'Crossway',
  'Urbanway',
  'Evadys',
  'Magelys',
  'Lion',
  'Touring',
  'Interlink',
  'Omni',
  'Citywide',
  '9700',
  '9900',
  '8900',
  '7900',
  '7700',
  'Erga',
  'Gala',
  'Blue Ribbon',
  'Poncho',
  'Aero',
  'Universe',
  'County',
  'Granbird',
  'ZK',
  'XML',
  'KLQ',
  'K9',
  'K10',
  'K11',
  'K12',
  'C9',
  'C8',
  'C7',
  'C6',
  'D1',
  'D2',
  'D3',
];

const SEMITRUCK_KEYWORDS = [
  'Actros',
  'Arocs',
  'FH',
  'FH16',
  'FM',
  'FMX',
  'VNL',
  'VNR',
  'VHD',
  'VNX',
  'Cascadia',
  'Coronado',
  'T680',
  'T880',
  'W900',
  '579',
  '389',
  'Anthem',
  'Pinnacle',
  'TGX',
  'TGS',
  'R-Series',
  'S-Series',
  'XF',
  'XG',
  'S-Way',
  'Stralis',
  'Hi-Way',
  'Quon',
  'Super Great',
  'F-MAX',
  'T',
  'T High',
  'C',
  'K',
];

const TRACTOR_KEYWORDS = [
  'Tractor',
  'Unimog',
  'Zetros',
  'Trakker',
  'T-Way',
  'X-Way',
  'TGL',
  'TGM',
  '6R',
  '7R',
  '8R',
  '9R',
  'Magnum',
  'Steiger',
  'Puma',
  'Maxxum',
  'Farmall',
  'Optum',
  'Quadtrac',
  'Rowtrac',
  'T8',
  'T7',
  'T6',
  'T5',
  'T4',
  'T9',
  '8700',
  '7700',
  '6700',
  '5700',
  'Vario',
  'Xerion',
  'Axion',
  'Arion',
  'AgroStar',
  'AgroXtra',
  'YTO',
  'DFH',
  'M2004',
  'Lovol',
];

const SPECIAL_KEYWORDS = [
  'Econic',
  'Antos',
  'Atego',
  'Axor',
  'Daily',
  'Eurocargo',
  'LF',
  'CF',
  'P-Series',
  'G-Series',
  'L-Series',
  'XT',
  'M2',
  'Business Class',
  'Century',
  'T600',
  'T800',
  'K270',
  'K370',
  '567',
  '520',
  '348',
  '337',
  '220',
  'Granite',
  'TerraPro',
  'MD Series',
  'LR Series',
  '300 Series',
  '500 Series',
  '700 Series',
  'Dutro',
  'Canter',
  'Fighter',
  'Condor',
  'Croner',
  'Kazet',
  '4700',
  '4900',
  '5700',
  '6900',
  'LT Series',
  'HX Series',
  'MV Series',
  'ProStar',
  'F-150',
  'F-250',
  'F-350',
  'F-450',
  'F-550',
  'Silverado',
  'Sierra',
  'Ram',
  'Caterpillar',
  'Komatsu',
  'Liebherr',
  'JCB',
  'Hitachi',
  'Doosan',
  'Bobcat',
  'Terex',
  'SY',
  'SW',
  'LW',
  'XE',
  'ZWL',
  'ZE',
  '936F',
  '946F',
  '956F',
  '966F',
  '976F',
  '986F',
  '996F',
  '995F',
  '856H',
  '862H',
  '870H',
  '877H',
  '890H',
  '8128H',
  '8150H',
  '8180H',
  '8210H',
  '8240H',
  '8270H',
  '8300H',
];

function categorizeModel(modelName: string): string[] {
  const categories: string[] = [];
  const nameLower = modelName.toLowerCase();

  if (BUS_KEYWORDS.some((kw) => nameLower.includes(kw.toLowerCase()))) {
    categories.push('BUS');
  }
  if (SEMITRUCK_KEYWORDS.some((kw) => nameLower.includes(kw.toLowerCase()))) {
    categories.push('SEMITRUCK');
  }
  if (TRACTOR_KEYWORDS.some((kw) => nameLower.includes(kw.toLowerCase()))) {
    categories.push('TRACTOR');
  }
  if (SPECIAL_KEYWORDS.some((kw) => nameLower.includes(kw.toLowerCase()))) {
    categories.push('SPECIAL');
  }
  if (categories.length === 0) {
    categories.push('TRUCK');
  }

  return categories;
}

async function checkBodyTypesModels() {
  console.log('Checking models by body types for all countries...\n');

  await AppDataSource.initialize();

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  const allBrands = await brandRepo
    .createQueryBuilder('brand')
    .where("brand.vehicle_types::text LIKE '%truck%'")
    .select(['brand.id', 'brand.name', 'brand.vehicle_types'])
    .getMany();

  const allModels = await modelRepo
    .createQueryBuilder('model')
    .where(
      "model.vehicle_types = 'truck' OR model.vehicle_types LIKE 'truck,%' OR model.vehicle_types LIKE '%,truck,%' OR model.vehicle_types LIKE '%,truck'",
    )
    .select(['model.id', 'model.name', 'model.brand_id', 'model.vehicle_types'])
    .leftJoinAndSelect('model.brand', 'brand')
    .getMany();

  const modelsByBrand = new Map<string, VehicleModel[]>();
  for (const model of allModels) {
    const brandId = typeof model.brand_id === 'string' ? model.brand_id : String(model.brand_id);
    if (!modelsByBrand.has(brandId)) {
      modelsByBrand.set(brandId, []);
    }
    modelsByBrand.get(brandId)!.push(model);
  }

  const bodyTypesCount: Record<string, number> = {
    TRUCK: 0,
    BUS: 0,
    SEMITRUCK: 0,
    TRACTOR: 0,
    SPECIAL: 0,
  };

  for (const brand of allBrands) {
    const brandId = typeof brand.id === 'string' ? brand.id : String(brand.id);
    const models = modelsByBrand.get(brandId) || [];
    const categories: Record<string, number> = {
      TRUCK: 0,
      BUS: 0,
      SEMITRUCK: 0,
      TRACTOR: 0,
      SPECIAL: 0,
    };

    for (const model of models) {
      const modelCategories = categorizeModel(model.name);
      for (const cat of modelCategories) {
        categories[cat] = (categories[cat] || 0) + 1;
        bodyTypesCount[cat] = (bodyTypesCount[cat] || 0) + 1;
      }
    }

    const total = models.length;
    if (total > 0) {
      const hasMultipleTypes = Object.values(categories).filter((count) => count > 0).length > 1;
      if (hasMultipleTypes) {
        console.log(
          `  ${brand.name}: ${total} models (TRUCK: ${categories.TRUCK}, BUS: ${categories.BUS}, SEMITRUCK: ${categories.SEMITRUCK}, TRACTOR: ${categories.TRACTOR}, SPECIAL: ${categories.SPECIAL})`,
        );
      }
    }
  }

  console.log(`\n\n📊 SUMMARY BY BODY TYPE:`);
  console.log(`   TRUCK: ${bodyTypesCount.TRUCK} models`);
  console.log(`   BUS: ${bodyTypesCount.BUS} models`);
  console.log(`   SEMITRUCK: ${bodyTypesCount.SEMITRUCK} models`);
  console.log(`   TRACTOR: ${bodyTypesCount.TRACTOR} models`);
  console.log(`   SPECIAL: ${bodyTypesCount.SPECIAL} models`);

  await AppDataSource.destroy();
}

if (require.main === module) {
  checkBodyTypesModels()
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { checkBodyTypesModels };
