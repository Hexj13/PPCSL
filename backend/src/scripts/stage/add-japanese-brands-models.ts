import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { determineVehicleType } from '../data/vehicle-classification';

const JAPANESE_BRANDS_TO_ADD = [
  { name: 'Lexus', order: 100 },
  { name: 'Acura', order: 101 },
  { name: 'Daihatsu', order: 102 },
  { name: 'Hino', order: 103 },
  { name: 'Mitsuoka', order: 104 },
  { name: 'Subaru', order: 105 },
  { name: 'Mitsubishi', order: 106 },
  { name: 'Suzuki', order: 107 },
  { name: 'Infiniti', order: 108 },
  { name: 'Isuzu', order: 109 },
];

const JAPANESE_BRANDS_MODELS: Record<string, string[]> = {
  Toyota: [
    'Corolla',
    'Corolla Cross',
    'Corolla Hatchback',
    'Camry',
    'RAV4',
    'RAV4 Prime',
    'Yaris',
    'Yaris Cross',
    'Prius',
    'Prius Prime',
    'Land Cruiser',
    'Land Cruiser Prado',
    'Highlander',
    'C-HR',
    'Auris',
    'Avensis',
    'Celica',
    'Supra',
    'MR2',
    '86',
    'GR86',
    'GR Supra',
    '4Runner',
    'Sequoia',
    'Tacoma',
    'Tundra',
    'Sienna',
    'Venza',
    'Crown',
    'Mark II',
    'Mark X',
    'Soarer',
    'Chaser',
    'Cresta',
    'Aristo',
    'Altezza',
    'Corona',
    'Carina',
    'Century',
    'Celsior',
    'Harrier',
    'Vellfire',
    'Alphard',
    'Estima',
    'Previa',
    'Hiace',
    'Proace',
    'Hilux',
    'Fortuner',
    'bZ4X',
    'bZ3',
    'Aygo',
    'Aygo X',
    'iQ',
    'Starlet',
    'Tercel',
    'Echo',
    'Matrix',
  ],
  Honda: [
    'Civic',
    'Civic Type R',
    'Civic Hatchback',
    'Civic Si',
    'Accord',
    'CR-V',
    'HR-V',
    'Jazz',
    'Fit',
    'Pilot',
    'Passport',
    'Ridgeline',
    'Insight',
    'Odyssey',
    'Element',
    'S2000',
    'NSX',
    'Prelude',
    'Integra',
    'Legend',
    'Ridgeline',
    'e:Ny1',
    'e:NP1',
    'e:NS1',
    'Clarity',
    'FCX Clarity',
    'CR-Z',
    'Crosstour',
    'FR-V',
    'Stream',
    'Shuttle',
    'Stepwgn',
    'Vezel',
    'ZR-V',
    'BR-V',
    'Mobilio',
    'Brio',
    'City',
    'Amaze',
    'WR-V',
  ],
  Nissan: [
    'Altima',
    'Maxima',
    'Sentra',
    'Versa',
    'Leaf',
    'Juke',
    'Murano',
    'Pathfinder',
    'X-Trail',
    'Qashqai',
    'Rogue',
    'Rogue Sport',
    'Armada',
    'Frontier',
    'Titan',
    '370Z',
    'GT-R',
    'Skyline',
    'Note',
    'Micra',
    'Almera',
    'Pulsar',
    'Tiida',
    'Latio',
    'Sunny',
    'March',
    'Cube',
    'Kicks',
    'Terra',
    'Navara',
    'Patrol',
    'Patrol Y62',
    'Patrol Y61',
    'Ariya',
    'e-NV200',
    'NV200',
    'NV1500',
    'NV2500',
    'NV3500',
    'Quest',
    'Elgrand',
    'Serena',
    'Vanette',
    'Urvan',
    'Caravan',
    'Presage',
    'Teana',
    'Cefiro',
    'Laurel',
    'Cedric',
    'Gloria',
    'Fuga',
    'Cima',
    'President',
    'Fairlady Z',
    'Silvia',
    '180SX',
    '240SX',
    '200SX',
    '300ZX',
    '350Z',
  ],
  Mazda: [
    'Mazda2',
    'Mazda3',
    'Mazda6',
    'CX-3',
    'CX-30',
    'CX-5',
    'CX-50',
    'CX-60',
    'CX-70',
    'CX-8',
    'CX-9',
    'CX-90',
    'MX-5',
    'MX-5 Miata',
    'MX-30',
    'RX-7',
    'RX-8',
    'BT-50',
    'Tribute',
    'MPV',
    'B-Series',
    'Protege',
    '323',
    '626',
    '929',
    'Millenia',
    'Xedos',
    'Eunos',
    'Cosmo',
    'Lantis',
    'Premacy',
    'Biante',
    'CX-7',
    'Titan',
    'Bongo',
    'E-Series',
    'T-Series',
    'Capella',
    'Familia',
    'Atenza',
    'Axela',
    'Demio',
    'Verisa',
    'Luce',
    'Sentia',
    'Persona',
  ],
  Subaru: [
    'Impreza',
    'Legacy',
    'Outback',
    'Forester',
    'XV',
    'Crosstrek',
    'WRX',
    'WRX STI',
    'BRZ',
    'Ascent',
    'Solterra',
    'Levorg',
    'Baja',
    'Tribeca',
    'SVX',
    'XT',
    'Justy',
    'Loyale',
    'Loyale Wagon',
    'XT6',
    '360',
    'Rex',
    'Sambar',
    'Domingo',
    'Vivio',
    'Pleo',
    'Trezia',
    'Exiga',
    'Dex',
    'Stella',
    'Lucra',
    'R1',
    'R2',
  ],
  Mitsubishi: [
    'Lancer',
    'Lancer Evolution',
    'Outlander',
    'Pajero',
    'Montero',
    'Eclipse',
    'Eclipse Cross',
    'ASX',
    'Mirage',
    'Delica',
    'Triton',
    'Galant',
    'i-MiEV',
    '3000GT',
    'Diamante',
    'Endeavor',
    'Raider',
    'Eclipse Spyder',
    'Eclipse GSX',
    'Starion',
    'Cordia',
    'Tredia',
    'Sigma',
    'Debonair',
    'FTO',
    'GTO',
    'Carisma',
    'Space Star',
    'Space Wagon',
    'Chariot',
    'Grandis',
    'RVR',
    'Airtrek',
    'Pajero Sport',
    'Pajero Mini',
    'Pajero iO',
    'Shogun',
    'Challenger',
    'Montero Sport',
    'Outlander Sport',
    'L200',
    'L300',
    'L400',
    'Canter',
    'Fuso',
  ],
  Suzuki: [
    'Swift',
    'Vitara',
    'Jimny',
    'SX4',
    'Baleno',
    'Celerio',
    'Ignis',
    'Ertiga',
    'Alto',
    'S-Cross',
    'Kizashi',
    'Grand Vitara',
    'XL7',
    'Equator',
    'SX4 S-Cross',
    'Across',
    'Splash',
    'Wagon R',
    'Liana',
    'Aerio',
    'Forenza',
    'Reno',
    'Verona',
    'XL-7',
    'Samurai',
    'Sidekick',
    'Escudo',
    'X-90',
    'Esteem',
    'Cultus',
    'Cappuccino',
    'Cervo',
    'Kei',
    'LJ',
    'SJ',
    'Carry',
    'Every',
    'Super Carry',
    'APV',
    'Eeco',
    'Omni',
    'Gypsy',
  ],
  Lexus: [
    'IS',
    'IS F',
    'IS 200t',
    'IS 300',
    'IS 350',
    'ES',
    'ES 250',
    'ES 300',
    'ES 350',
    'GS',
    'GS F',
    'GS 200t',
    'GS 300',
    'GS 350',
    'GS 450h',
    'LS',
    'LS 400',
    'LS 430',
    'LS 460',
    'LS 500',
    'LS 600h',
    'RX',
    'RX 300',
    'RX 350',
    'RX 400h',
    'RX 450h',
    'RX 500h',
    'NX',
    'NX 200t',
    'NX 300',
    'NX 350',
    'UX',
    'UX 200',
    'UX 250h',
    'UX 300e',
    'GX',
    'GX 460',
    'GX 470',
    'LX',
    'LX 450',
    'LX 470',
    'LX 570',
    'LX 600',
    'RC',
    'RC F',
    'RC 200t',
    'RC 300',
    'RC 350',
    'LC',
    'LC 500',
    'LC 500h',
    'LFA',
    'CT',
    'CT 200h',
    'HS',
    'HS 250h',
    'SC',
    'SC 300',
    'SC 400',
    'SC 430',
    'RZ',
  ],
  Infiniti: [
    'Q50',
    'Q50 Red Sport',
    'Q60',
    'Q60 Red Sport',
    'Q70',
    'Q70L',
    'QX50',
    'QX55',
    'QX60',
    'QX70',
    'QX80',
    'Q30',
    'QX30',
    'G35',
    'G37',
    'M35',
    'M37',
    'M45',
    'M56',
    'FX35',
    'FX37',
    'FX45',
    'FX50',
    'EX35',
    'EX37',
    'J30',
    'I30',
    'I35',
    'G20',
    'M30',
    'Q45',
    'I30',
    'JX35',
    'QX4',
    'QX56',
  ],
  Acura: [
    'ILX',
    'TLX',
    'RLX',
    'RDX',
    'MDX',
    'NSX',
    'Integra',
    'Legend',
    'Vigor',
    'ZDX',
    'CDX',
    'CL',
    'CSX',
    'EL',
    'RL',
    'RSX',
    'SLX',
    'TSX',
    'TL',
    'SL',
    'NSX Type S',
    'TLX Type S',
    'MDX Type S',
    'RDX Type S',
  ],
  Daihatsu: [
    'Mira',
    'Move',
    'Tanto',
    'Copen',
    'Terios',
    'Sirion',
    'Charade',
    'Rocky',
    'Hijet',
    'Applause',
    'Cuore',
    'Materia',
    'YRV',
    'Coo',
    'Boon',
    'Esse',
    'Atrai',
    'Naked',
    'Storia',
    'Opti',
    'Leeza',
    'Pyzar',
    'Feroza',
    'Fourtrak',
    'Sportrak',
    'Delta',
    'Charmant',
    'Consorte',
    'Compagno',
    'Fellow',
    'Max',
    'Midget',
    'Mira Gino',
    'Mira e:S',
    'Mira Tocot',
    'Tanto Exe',
    'Tanto Custom',
    'Move Canbus',
    'Move Conte',
    'Copen Cero',
    'Copen Robe',
  ],
  Isuzu: [
    'D-Max',
    'MU-X',
    'Trooper',
    'Rodeo',
    'VehiCROSS',
    'Axiom',
    'Ascender',
    'Bellett',
    'Gemini',
    'Piazza',
    'Impulse',
    'Stylus',
    'Amigo',
    'Hombre',
    'i-Series',
    'Elf',
    'Forward',
    'Giga',
    'N-Series',
    'F-Series',
    'H-Series',
    'C-Series',
    'E-Series',
    'Wizard',
    'Bighorn',
    'MU',
    'MU Wizard',
    'MU-7',
    'D-Max Rodeo',
    'KB',
    'Faster',
    'Pickup',
    'TFR',
    'TF',
    '117 Coupe',
    '117 XD',
    'Florian',
    'Bellett GT',
    'Bellett 1600',
    '117',
  ],
  Hino: [
    'Dutro',
    'Ranger',
    'Profia',
    'Poncho',
    'Liesse',
    'Selega',
    'Blue Ribbon',
    'Contessa',
    'Briska',
    '300 Series',
    '500 Series',
    '700 Series',
    '600 Series',
    'Dutro Hybrid',
    'Profia Hybrid',
    'Ranger Hybrid',
    'Melpha',
    'Rainbow',
    'Dolphin',
    'Hino 300',
    'Hino 500',
    'Hino 700',
    'Hino 600',
  ],
  Mitsuoka: [
    'Viewt',
    'Galue',
    'Himiko',
    'Orochi',
    'Ryugi',
    'Le-Seyde',
    'Dore',
    'MC-1',
    'Convoy88',
    'Like-T3',
    'Nouera',
    'Buddy',
    'Rock Star',
    'Yuga',
    'K-2',
    'K-3',
    'K-4',
    'K-5',
    'K-6',
    'K-7',
    'K-8',
    'K-9',
    'K-10',
  ],
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function forceGarbageCollection(): void {
  if (global.gc) {
    global.gc();
  }
}

async function addJapaneseBrandsModels() {
  await AppDataSource.initialize();

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  let brandsAdded = 0;
  let totalAdded = 0;
  let totalUpdated = 0;
  let brandsProcessed = 0;
  let brandsNotFound = 0;
  const missingBrands: string[] = [];

  const DELAY_BETWEEN_BRANDS = 300;
  const BATCH_SIZE = 10;

  for (const brandData of JAPANESE_BRANDS_TO_ADD) {
    let brand = await brandRepo.findOne({ where: { name: brandData.name } });
    if (!brand) {
      const maxOrder = await brandRepo
        .createQueryBuilder('brand')
        .select('MAX(brand.order)', 'max')
        .getRawOne();
      const newOrder = (maxOrder?.max || 0) + 1;

      const models = JAPANESE_BRANDS_MODELS[brandData.name] || [];
      const initialVehicleType =
        models.length > 0 ? determineVehicleType(models[0], brandData.name) : 'car';
      brand = brandRepo.create({
        name: brandData.name,
        order: newOrder,
        vehicle_types: [initialVehicleType],
      });
      brand = await brandRepo.save(brand);
      brandsAdded++;
    }
    await delay(100);
  }

  const entries = Object.entries(JAPANESE_BRANDS_MODELS);

  for (let idx = 0; idx < entries.length; idx++) {
    const [brandName, models] = entries[idx];
    const brand = await brandRepo.findOne({ where: { name: brandName } });

    if (!brand) {
      brandsNotFound++;
      missingBrands.push(brandName);
      continue;
    }

    brandsProcessed++;
    const existingModels = await modelRepo.find({
      where: { brand_id: brand.id },
      select: ['id', 'name', 'order'],
    });

    const maxOrder =
      existingModels.length > 0 ? Math.max(...existingModels.map((m) => m.order || 0)) : 0;

    const existingModelsMap = new Map<string, VehicleModel>();
    for (const model of existingModels) {
      existingModelsMap.set(model.name.toLowerCase(), model);
    }

    const modelsToCreate: VehicleModel[] = [];
    const modelsToUpdate: VehicleModel[] = [];

    for (let i = 0; i < models.length; i++) {
      const modelName = models[i];
      const modelNameLower = modelName.toLowerCase();

      const existingModel = existingModelsMap.get(modelNameLower);

      if (!existingModel) {
        const vehicleType = determineVehicleType(modelName, brandName);
        const model = modelRepo.create({
          name: modelName,
          brand_id: brand.id,
          order: maxOrder + i + 1,
          vehicle_types: [vehicleType],
        });
        modelsToCreate.push(model);
        totalAdded++;
      } else {
        existingModel.order = maxOrder + i + 1;
        if (!existingModel.vehicle_types?.[0]) {
          existingModel.vehicle_types = [determineVehicleType(modelName, brandName)];
        }
        modelsToUpdate.push(existingModel);
        totalUpdated++;
      }
    }

    if (modelsToCreate.length > 0) {
      for (let i = 0; i < modelsToCreate.length; i += BATCH_SIZE) {
        const batch = modelsToCreate.slice(i, i + BATCH_SIZE);
        await modelRepo.save(batch);
        await delay(50);
      }
    }

    if (modelsToUpdate.length > 0) {
      for (let i = 0; i < modelsToUpdate.length; i += BATCH_SIZE) {
        const batch = modelsToUpdate.slice(i, i + BATCH_SIZE);
        await modelRepo.save(batch);
        await delay(50);
      }
    }

    const allModelsForBrand = await modelRepo.find({
      where: { brand_id: brand.id },
      select: ['vehicle_types'],
    });
    const vehicleTypes = new Set<'car' | 'truck' | 'moto' | 'tire'>();
    for (const model of allModelsForBrand) {
      if (model.vehicle_types?.[0]) {
        vehicleTypes.add(model.vehicle_types[0]);
      }
    }
    if (vehicleTypes.size > 0) {
      brand.vehicle_types = Array.from(vehicleTypes).sort();
      await brandRepo.save(brand);
    } else if (!brand.vehicle_types || brand.vehicle_types.length === 0) {
      const initialVehicleType =
        models.length > 0 ? determineVehicleType(models[0], brandName) : 'car';
      brand.vehicle_types = [initialVehicleType];
      await brandRepo.save(brand);
    }

    if (idx < entries.length - 1) {
      await delay(DELAY_BETWEEN_BRANDS);
      if (idx % 15 === 0) {
        forceGarbageCollection();
      }
    }
  }

  const totalModels = totalAdded + totalUpdated;
  console.log(
    `📦 Јапонски брендови: обработени ${brandsProcessed}, нови брендови ${brandsAdded}, модели ${totalModels} (нови ${totalAdded}, ажурирани ${totalUpdated})`,
  );
  if (brandsNotFound > 0) {
    console.warn(`⚠️  Прескокнати брендови (${brandsNotFound}): ${missingBrands.join(', ')}`);
  }

  const summary = {
    brandsProcessed,
    brandsCreated: brandsAdded,
    brandsMissing: brandsNotFound,
    modelsInserted: totalAdded,
    modelsReordered: totalUpdated,
  };

  console.log(JSON.stringify(summary));

  await AppDataSource.destroy();
}

addJapaneseBrandsModels()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error.message);
    process.exit(1);
  });
