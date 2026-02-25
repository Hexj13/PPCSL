import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { determineVehicleType } from '../data/vehicle-classification';

const GERMAN_BRANDS_MODELS: Record<string, string[]> = {
  BMW: [
    '1 Series',
    '2 Series',
    '2 Series Active Tourer',
    '2 Series Gran Coupe',
    '3 Series',
    '3 Series GT',
    '3 Series Touring',
    '4 Series',
    '4 Series Gran Coupe',
    '5 Series',
    '5 Series GT',
    '5 Series Touring',
    '6 Series',
    '6 Series Gran Coupe',
    '6 Series GT',
    '7 Series',
    '8 Series',
    '8 Series Gran Coupe',
    'X1',
    'X2',
    'X3',
    'X4',
    'X5',
    'X6',
    'X7',
    'XM',
    'Z3',
    'Z4',
    'Z8',
    'i3',
    'i4',
    'iX',
    'iX1',
    'iX3',
    'i8',
    'M2',
    'M3',
    'M4',
    'M5',
    'M6',
    'M8',
    'X3 M',
    'X4 M',
    'X5 M',
    'X6 M',
    'Z3 M',
    'Z4 M',
    'M135i',
    'M235i',
    'M340i',
    'M550i',
    'M760i',
    'Alpina B3',
    'Alpina B5',
    'Alpina B7',
    'Alpina XD3',
    'Alpina XD4',
  ],
  'Mercedes-Benz': [
    'A-Class',
    'A-Class Sedan',
    'B-Class',
    'C-Class',
    'C-Class Coupe',
    'C-Class Cabriolet',
    'C-Class Estate',
    'CLA',
    'CLA Shooting Brake',
    'CLS',
    'E-Class',
    'E-Class Coupe',
    'E-Class Cabriolet',
    'E-Class Estate',
    'S-Class',
    'S-Class Coupe',
    'S-Class Cabriolet',
    'GLA',
    'GLB',
    'GLK',
    'GLC',
    'GLC Coupe',
    'GLE',
    'GLE Coupe',
    'GLS',
    'G-Class',
    'SL',
    'SLC',
    'SLK',
    'SLR',
    'SLS AMG',
    'AMG GT',
    'AMG GT 4-Door',
    'AMG GT Roadster',
    'AMG GT Black Series',
    'EQC',
    'EQA',
    'EQB',
    'EQE',
    'EQE SUV',
    'EQS',
    'EQS SUV',
    'EQV',
    'V-Class',
    'Vito',
    'Sprinter',
    'Metris',
    'Citan',
    'AMG A 35',
    'AMG A 45',
    'AMG C 43',
    'AMG C 63',
    'AMG E 53',
    'AMG E 63',
    'AMG S 63',
    'AMG S 65',
    'AMG G 63',
    'AMG G 65',
    'Maybach S-Class',
    'Maybach GLS',
  ],
  Audi: [
    'A1',
    'A1 Sportback',
    'A2',
    'A3',
    'A3 Sportback',
    'A3 Sedan',
    'A3 Cabriolet',
    'A4',
    'A4 Avant',
    'A4 Allroad',
    'A5',
    'A5 Sportback',
    'A5 Coupe',
    'A5 Cabriolet',
    'A6',
    'A6 Avant',
    'A6 Allroad',
    'A7',
    'A7 Sportback',
    'A8',
    'A8 L',
    'Q2',
    'Q3',
    'Q3 Sportback',
    'Q4 e-tron',
    'Q4 Sportback e-tron',
    'Q5',
    'Q5 Sportback',
    'Q5 e-tron',
    'Q6',
    'Q7',
    'Q8',
    'Q8 e-tron',
    'Q8 Sportback e-tron',
    'e-tron',
    'e-tron Sportback',
    'e-tron GT',
    'e-tron S',
    'TT',
    'TT Coupe',
    'TT Roadster',
    'TTS',
    'TT RS',
    'R8',
    'R8 Coupe',
    'R8 Spyder',
    'S1',
    'S3',
    'S4',
    'S5',
    'S6',
    'S7',
    'S8',
    'SQ2',
    'SQ5',
    'SQ7',
    'SQ8',
    'RS3',
    'RS4',
    'RS4 Avant',
    'RS5',
    'RS5 Sportback',
    'RS6',
    'RS6 Avant',
    'RS7',
    'RS7 Sportback',
    'RS Q3',
    'RS Q8',
    'RS e-tron GT',
  ],
  Volkswagen: [
    'Polo',
    'Polo GTI',
    'Golf',
    'Golf GTI',
    'Golf R',
    'Golf Estate',
    'Golf Plus',
    'Golf Sportsvan',
    'Golf Cabriolet',
    'Jetta',
    'Passat',
    'Passat Variant',
    'Passat CC',
    'Arteon',
    'Arteon Shooting Brake',
    'Phaeton',
    'T-Cross',
    'T-Roc',
    'T-Roc Cabriolet',
    'Tiguan',
    'Tiguan Allspace',
    'Touareg',
    'Touran',
    'Sharan',
    'Caravelle',
    'Multivan',
    'California',
    'Amarok',
    'ID.3',
    'ID.4',
    'ID.5',
    'ID.6',
    'ID. Buzz',
    'ID. Buzz Cargo',
    'e-Golf',
    'e-Up!',
    'Scirocco',
    'Beetle',
    'Eos',
    'CC',
    'Up!',
    'Fox',
    'Lupo',
    'Bora',
    'Vento',
    'Corrado',
    'Karmann Ghia',
  ],
  Porsche: [
    '911',
    '911 Carrera',
    '911 Carrera S',
    '911 Carrera 4',
    '911 Carrera 4S',
    '911 Turbo',
    '911 Turbo S',
    '911 GT3',
    '911 GT3 RS',
    '911 GT2',
    '911 GT2 RS',
    '911 Targa',
    '911 Targa 4',
    '911 Targa 4S',
    '911 Speedster',
    'Cayenne',
    'Cayenne S',
    'Cayenne Turbo',
    'Cayenne GTS',
    'Cayenne Coupe',
    'Cayenne E-Hybrid',
    'Macan',
    'Macan S',
    'Macan Turbo',
    'Macan GTS',
    'Panamera',
    'Panamera 4',
    'Panamera 4S',
    'Panamera Turbo',
    'Panamera GTS',
    'Panamera Turbo S',
    'Panamera Sport Turismo',
    'Taycan',
    'Taycan 4S',
    'Taycan Turbo',
    'Taycan Turbo S',
    'Taycan Cross Turismo',
    'Boxster',
    'Boxster S',
    'Boxster GTS',
    'Cayman',
    'Cayman S',
    'Cayman GTS',
    '718 Boxster',
    '718 Boxster S',
    '718 Cayman',
    '718 Cayman S',
    '718 Spyder',
    '718 GT4',
    '918 Spyder',
  ],
  Opel: [
    'Corsa',
    'Corsa-e',
    'Corsa OPC',
    'Astra',
    'Astra GTC',
    'Astra Sports Tourer',
    'Astra OPC',
    'Insignia',
    'Insignia Grand Sport',
    'Insignia Sports Tourer',
    'Insignia Country Tourer',
    'Mokka',
    'Mokka-e',
    'Mokka X',
    'Crossland',
    'Crossland X',
    'Grandland',
    'Grandland X',
    'Antara',
    'Frontera',
    'Zafira',
    'Zafira Tourer',
    'Combo',
    'Combo Life',
    'Combo Cargo',
    'Vivaro',
    'Vivaro Life',
    'Movano',
    'Movano Combi',
    'Adam',
    'Karl',
    'Ampera',
    'Ampera-e',
    'Cascada',
    'Monza',
    'Omega',
    'Vectra',
    'Calibra',
    'Kadett',
    'Ascona',
    'Rekord',
    'Senator',
    'GT',
    'Speedster',
    'Tigra',
  ],
  Smart: [
    'Fortwo',
    'Fortwo Cabrio',
    'Fortwo Electric Drive',
    'Forfour',
    'Forfour Electric Drive',
    'Roadster',
    'Crossblade',
  ],
  Maybach: ['S-Class', 'GLS', '57', '62', 'Landaulet'],
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function forceGarbageCollection(): void {
  if (global.gc) {
    global.gc();
  }
}

async function addGermanBrandsModels() {
  await AppDataSource.initialize();

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  let totalAdded = 0;
  let totalUpdated = 0;
  let brandsProcessed = 0;
  let brandsNotFound = 0;
  const missingBrands: string[] = [];

  const DELAY_BETWEEN_BRANDS = 300;
  const BATCH_SIZE = 10;
  const entries = Object.entries(GERMAN_BRANDS_MODELS);

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

    if (idx < entries.length - 1) {
      await delay(DELAY_BETWEEN_BRANDS);
      if (idx % 15 === 0) {
        forceGarbageCollection();
      }
    }
  }

  const summary = {
    brandsProcessed,
    brandsCreated: 0,
    brandsMissing: brandsNotFound,
    modelsInserted: totalAdded,
    modelsReordered: totalUpdated,
  };

  console.log(JSON.stringify(summary));

  await AppDataSource.destroy();
}

addGermanBrandsModels()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error.message);
    process.exit(1);
  });
