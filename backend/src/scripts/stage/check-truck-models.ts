import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { AppDataSource } from '../../data-source';
import { checkEnvironment, checkPlatform } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);
checkPlatform(['mk', 'al']);

const BUS_KEYWORDS = [
  'Bus',
  'Citaro',
  'Tourismo',
  'Intouro',
  'Integro',
  'Coaster',
  'Dyna',
  'ToyoAce',
  'Master Bus',
  'Transit Bus',
  'Rosa',
  'Crossway',
  'Urbanway',
  'Evadys',
  'Magelys',
  'Granbird',
  'County',
  'Aero',
  'Universe',
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
  '9700',
  '9900',
];

const TRACTOR_KEYWORDS = ['Tractor', 'Unimog', 'Zetros', 'Trakker', 'T-Way', 'X-Way', 'TGL', 'TGM'];

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
];

async function checkTruckModels() {
  console.log(
    '🔍 Checking models for trucks, semitrucks, special equipment, tractors and buses...\n',
  );

  await AppDataSource.initialize();

  const brandRepo = AppDataSource.getRepository(Brand);

  const allBrands = await brandRepo.find({
    relations: ['models'],
  });

  const truckBrands = allBrands.filter((b) => {
    return b.vehicle_types?.includes('truck') || b.models.some((m) => m.vehicle_type === 'truck');
  });

  console.log(`📊 Total brands with type 'truck': ${truckBrands.length}\n`);

  const busModels: Array<{ brand: string; model: string }> = [];
  const semitruckModels: Array<{ brand: string; model: string }> = [];
  const tractorModels: Array<{ brand: string; model: string }> = [];
  const specialModels: Array<{ brand: string; model: string }> = [];
  const otherTruckModels: Array<{ brand: string; model: string }> = [];

  for (const brand of truckBrands) {
    const truckModels = brand.models.filter((m) => m.vehicle_type === 'truck');

    for (const model of truckModels) {
      const modelNameLower = model.name.toLowerCase();
      let categorized = false;

      if (BUS_KEYWORDS.some((kw) => modelNameLower.includes(kw.toLowerCase()))) {
        busModels.push({ brand: brand.name, model: model.name });
        categorized = true;
      }

      if (SEMITRUCK_KEYWORDS.some((kw) => modelNameLower.includes(kw.toLowerCase()))) {
        semitruckModels.push({ brand: brand.name, model: model.name });
        categorized = true;
      }

      if (TRACTOR_KEYWORDS.some((kw) => modelNameLower.includes(kw.toLowerCase()))) {
        tractorModels.push({ brand: brand.name, model: model.name });
        categorized = true;
      }

      if (SPECIAL_KEYWORDS.some((kw) => modelNameLower.includes(kw.toLowerCase()))) {
        specialModels.push({ brand: brand.name, model: model.name });
        categorized = true;
      }

      if (!categorized) {
        otherTruckModels.push({ brand: brand.name, model: model.name });
      }
    }
  }

  console.log('🚌 BUSES:');
  if (busModels.length > 0) {
    console.log(`   Found models: ${busModels.length}`);
    const byBrand = new Map<string, string[]>();
    for (const { brand, model } of busModels) {
      if (!byBrand.has(brand)) byBrand.set(brand, []);
      byBrand.get(brand)!.push(model);
    }
    for (const [brand, models] of Array.from(byBrand.entries()).sort()) {
      console.log(`   - ${brand}: ${models.join(', ')}`);
    }
  } else {
    console.log('   ❌ No models found');
  }

  console.log('\n🚛 SEMITRUCKS:');
  if (semitruckModels.length > 0) {
    console.log(`   Found models: ${semitruckModels.length}`);
    const byBrand = new Map<string, string[]>();
    for (const { brand, model } of semitruckModels) {
      if (!byBrand.has(brand)) byBrand.set(brand, []);
      byBrand.get(brand)!.push(model);
    }
    for (const [brand, models] of Array.from(byBrand.entries()).sort()) {
      console.log(`   - ${brand}: ${models.join(', ')}`);
    }
  } else {
    console.log('   ❌ No models found');
  }

  console.log('\n🚜 TRACTORS:');
  if (tractorModels.length > 0) {
    console.log(`   Found models: ${tractorModels.length}`);
    const byBrand = new Map<string, string[]>();
    for (const { brand, model } of tractorModels) {
      if (!byBrand.has(brand)) byBrand.set(brand, []);
      byBrand.get(brand)!.push(model);
    }
    for (const [brand, models] of Array.from(byBrand.entries()).sort()) {
      console.log(`   - ${brand}: ${models.join(', ')}`);
    }
  } else {
    console.log('   ❌ No models found');
  }

  console.log('\n🔧 SPECIAL EQUIPMENT:');
  if (specialModels.length > 0) {
    console.log(`   Found models: ${specialModels.length}`);
    const byBrand = new Map<string, string[]>();
    for (const { brand, model } of specialModels) {
      if (!byBrand.has(brand)) byBrand.set(brand, []);
      byBrand.get(brand)!.push(model);
    }
    for (const [brand, models] of Array.from(byBrand.entries()).sort()) {
      console.log(`   - ${brand}: ${models.join(', ')}`);
    }
  } else {
    console.log('   ❌ No models found');
  }

  console.log('\n📦 OTHER TRUCKS:');
  if (otherTruckModels.length > 0) {
    console.log(`   Found models: ${otherTruckModels.length}`);
    const byBrand = new Map<string, string[]>();
    for (const { brand, model } of otherTruckModels) {
      if (!byBrand.has(brand)) byBrand.set(brand, []);
      byBrand.get(brand)!.push(model);
    }
    for (const [brand, models] of Array.from(byBrand.entries()).sort()) {
      console.log(`   - ${brand}: ${models.join(', ')}`);
    }
  } else {
    console.log('   ❌ No models found');
  }

  console.log('\n📈 SUMMARY:');
  console.log(`   Buses: ${busModels.length} models`);
  console.log(`   Semitrucks: ${semitruckModels.length} models`);
  console.log(`   Tractors: ${tractorModels.length} models`);
  console.log(`   Special equipment: ${specialModels.length} models`);
  console.log(`   Other trucks: ${otherTruckModels.length} models`);
  console.log(
    `   Total: ${busModels.length + semitruckModels.length + tractorModels.length + specialModels.length + otherTruckModels.length} models`,
  );

  await AppDataSource.destroy();
}

if (require.main === module) {
  checkTruckModels()
    .then(() => {
      console.log('\n✅ Check completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { checkTruckModels };
