import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { determineVehicleType } from '../data/vehicle-classification';

const HISTORICAL_AND_RARE_MODELS: Record<string, string[]> = {
  Volkswagen: [
    'Golf GTI Mk1',
    'Golf GTI Mk2',
    'Golf VR6',
    'Corrado',
    'Scirocco',
    'Passat B3',
    'Passat B4',
    'Jetta',
    'Beetle',
    'Karmann Ghia',
    'Type 2',
    'Touareg',
    'Tiguan Allspace',
    'Sharan',
  ],
  Audi: [
    '80',
    '90',
    '100',
    '200',
    'A2',
    'A8',
    'Q2',
    'e-tron',
    'RS2',
    'RS4',
    'RS6',
    'RS7',
    'S2',
    'S4',
    'S6',
    'S8',
    'TT RS',
    'R8',
    'Quattro',
  ],
  BMW: ['850i', 'Z3', 'Z4', 'i8', 'X2', 'X4', 'iX1', 'iX3'],
  'Mercedes-Benz': [
    '190E',
    'SLK',
    'CLK',
    'CL',
    'SLC',
    'AMG GT',
    'EQS',
    'EQE SUV',
    'GLC Coupe',
    'GLE Coupe',
    'SLS AMG',
  ],
  Porsche: [
    '944',
    '928',
    '968',
    '924',
    'Cayman',
    'Boxster',
    '911 Turbo',
    'Panamera Turbo',
    '911 Carrera',
    '911 GT3',
    '911 GT2',
    'Cayenne Turbo',
  ],
  Opel: [
    'Kadett',
    'Ascona',
    'Omega',
    'Vectra A',
    'Vectra B',
    'Vectra C',
    'Astra F',
    'Astra G',
    'Calibra',
    'Monza',
    'Senator',
    'GT',
    'Manta',
    'Corsa B',
    'Corsa C',
  ],
  Renault: [
    '5',
    '9',
    '11',
    '19',
    '21',
    '25',
    'Megane I',
    'Megane II',
    'Laguna I',
    'Laguna II',
    'Espace',
    'Avantime',
    'Vel Satis',
    'Talisman',
  ],
  Peugeot: [
    '205',
    '206',
    '306',
    '307',
    '405',
    '406',
    '505',
    '605',
    '607',
    '1007',
    '4007',
    '5008',
    'RCZ',
    'Partner',
  ],
  Citroën: [
    '2CV',
    'DS',
    'CX',
    'XM',
    'BX',
    'C15',
    'C25',
    'C4 Grand Picasso',
    'C5',
    'C6',
    'C8',
    'ë-C4',
    'Berlingo',
    'Jumper',
  ],
  Fiat: [
    '126',
    '500 Classic',
    'Punto',
    'Bravo',
    'Brava',
    'Stilo',
    'Multipla',
    'Uno',
    'Tipo',
    'Croma',
    'Coupe',
    'Barchetta',
    'Seicento',
  ],
  'Alfa Romeo': [
    '156',
    '159',
    '147',
    '166',
    '75',
    '33',
    '164',
    'GTV',
    'Spider',
    'Brera',
    '8C Competizione',
    '4C',
  ],
  Lancia: [
    'Delta',
    'Thema',
    'Kappa',
    'Dedra',
    'Lybra',
    'Phedra',
    'Musa',
    'Ypsilon',
    'Flavia',
    'Fulvia',
  ],
  Maserati: [
    '3200 GT',
    '4200 GT',
    'Quattroporte V',
    'GranTurismo',
    'Ghibli',
    'Levante',
    'Grecale',
    'MC20',
    'Bora',
    'Merak',
  ],
  Ferrari: [
    '308',
    '328',
    '348',
    '355',
    '360',
    'F430',
    '458',
    '488',
    'F8',
    'Roma',
    '296 GTB',
    '296 GTS',
    'SF90 Stradale',
    'Purosangue',
    '812 GTS',
    'Testarossa',
    '512 TR',
    'F40',
    'F50',
    'Enzo',
  ],
  Lamborghini: [
    'Countach',
    'Diablo',
    'Murciélago',
    'Gallardo',
    'Aventador',
    'Huracán',
    'Revuelto',
    'Urus',
    'LM002',
  ],
  Bentley: [
    'Continental GT',
    'Flying Spur',
    'Bentayga',
    'Mulsanne',
    'Arnage',
    'Continental R',
    'Turbo R',
  ],
  'Rolls-Royce': [
    'Phantom',
    'Ghost',
    'Cullinan',
    'Spectre',
    'Silver Shadow',
    'Silver Spirit',
    'Corniche',
    'Wraith',
  ],
  Jaguar: [
    'XJ',
    'XK',
    'XF',
    'XE',
    'F-Pace',
    'E-Pace',
    'I-Pace',
    'F-Type',
    'XJS',
    'XJ220',
    'E-Type',
  ],
  'Land Rover': ['Defender', 'Discovery', 'Discovery Sport', 'Freelander'],
  'Range Rover': [
    'Range Rover',
    'Range Rover Sport',
    'Range Rover Velar',
    'Range Rover Evoque',
    'Range Rover Classic',
  ],
  MINI: [
    'Cooper 3-Door',
    'Cooper 5-Door',
    'Cabrio',
    'Countryman',
    'Aceman',
    'Clubman',
    'Paceman',
    'Roadster',
    'Coupe',
  ],
  Volvo: [
    '240',
    '740',
    '940',
    '850',
    'S40',
    'S60',
    'S70',
    'S80',
    'S90',
    'V40',
    'V50',
    'V60',
    'V70',
    'V90',
    'XC40',
    'XC60',
    'XC70',
    'XC90',
    'EX30',
    'EX40',
    'EX90',
    'C30',
    'C70',
  ],
  Saab: ['9-3', '9-5', '900', '9000', '93', '96', '99', 'Sonett'],
  Škoda: [
    'Fabia',
    'Scala',
    'Octavia',
    'Superb',
    'Kamiq',
    'Karoq',
    'Kodiaq',
    'Enyaq',
    'Favorit',
    'Felicia',
    'Rapid',
    'Yeti',
    'Roomster',
  ],
  SEAT: [
    'Ibiza',
    'Leon',
    'Arona',
    'Ateca',
    'Tarraco',
    'Altea',
    'Toledo',
    'Exeo',
    'Cordoba',
    'Arosa',
    'Marbella',
  ],
  Cupra: ['Formentor', 'Born', 'Ateca', 'Leon', 'Tavascan', 'Terramar'],
  'DS Automobiles': ['DS 3', 'DS 4', 'DS 5', 'DS 7', 'DS 9'],
  Honda: [
    'Civic',
    'Accord',
    'CR-V',
    'HR-V',
    'Jazz',
    'e:Ny1',
    'Civic Type R',
    'Pilot',
    'S2000',
    'NSX',
    'Prelude',
    'Integra',
    'CR-X',
  ],
  Toyota: [
    'Aygo X',
    'Yaris',
    'Yaris Cross',
    'Corolla',
    'C-HR',
    'RAV4',
    'Camry',
    'bZ4X',
    'Highlander',
    'Land Cruiser',
    'Prius',
    'Celica',
    'Supra',
    'MR2',
    'Avensis',
    'Auris',
  ],
  Nissan: [
    'Micra',
    'Juke',
    'Qashqai',
    'X-Trail',
    'Ariya',
    'Leaf',
    '350Z',
    '370Z',
    'GT-R',
    'Skyline',
    'Silvia',
    'Patrol',
  ],
  Mazda: [
    'Mazda2',
    'Mazda3',
    'Mazda6',
    'CX-30',
    'CX-5',
    'MX-30',
    'CX-60',
    'MX-5',
    'RX-7',
    'RX-8',
    '323',
    '626',
    '929',
  ],
  Subaru: [
    'Impreza',
    'XV/Crosstrek',
    'Forester',
    'Outback',
    'Solterra',
    'Legacy',
    'WRX',
    'BRZ',
    'SVX',
  ],
  Kia: [
    'Picanto',
    'Rio',
    'Ceed',
    'Niro',
    'Sportage',
    'Sorento',
    'EV6',
    'EV9',
    'Optima',
    'Stinger',
    'Soul',
  ],
  Hyundai: [
    'i10',
    'i20',
    'i30',
    'Bayon',
    'Kona',
    'Tucson',
    'Ioniq 5',
    'Ioniq 6',
    'Ioniq 7',
    'Elantra',
    'Sonata',
    'Genesis',
    'Veloster',
  ],
  Suzuki: ['Swift', 'Ignis', 'Vitara', 'S-Cross', 'Across', 'Baleno', 'SX4'],
  Dacia: ['Spring', 'Sandero', 'Jogger', 'Duster', 'Bigster', 'Logan', 'Lodgy', 'Dokker'],
  Tesla: ['Model 3', 'Model Y', 'Model S', 'Model X', 'Cybertruck', 'Roadster'],
  Polestar: ['2', '3', '4', '1'],
  Lotus: ['Emira', 'Eletre', 'Evija', 'Elise', 'Exige', 'Evora', 'Esprit'],
  'Aston Martin': [
    'DB12',
    'Vantage',
    'DBX',
    'Valour',
    'DB9',
    'DB11',
    'Vanquish',
    'DBS',
    'Rapide',
    'V8 Vantage',
  ],
  McLaren: ['Artura', '750S', 'GT', '765LT', '720S', '570S', '650S', 'MP4-12C', 'F1', 'P1'],
  Smart: ['#1', '#3', 'EQ fortwo', 'Forfour', 'Roadster', 'Crossblade'],
  MG: ['MG3', 'ZS', 'HS', 'MG4', 'MG5', 'Marvel R', 'TF', 'ZR', 'ZS EV'],
  BYD: ['Dolphin', 'Atto 3', 'Seal', 'Han', 'Tang', 'Song', 'Yuan'],
  Chery: ['Omoda 5', 'Tiggo 7', 'Tiggo 8', 'Jaecoo 7', 'QQ'],
  Geely: ['Coolray', 'Geometry C', 'Emgrand', 'Atlas', 'Monjaro', 'Tugella'],
  Haval: ['H6', 'Jolion', 'H9', 'H2', 'H3', 'H4', 'H5', 'H7', 'H8', 'F7', 'F7x'],
  Tank: ['300', '400', '500', '700'],
  'Great Wall': ['Wingle', 'Poer', 'Cannon'],
  Abarth: ['595', '695', '500e', '124 Spider', 'Punto Evo'],
  Vauxhall: ['Corsa', 'Astra', 'Mokka', 'Grandland', 'Insignia', 'Vectra', 'Cavalier', 'Nova'],
  VinFast: ['VF 3', 'VF 6', 'VF 7', 'VF 8', 'VF 9'],
  Nio: ['ET5', 'ET7', 'EL6', 'EL7', 'EC6', 'ES6', 'ES8', 'EC7'],
  XPeng: ['P7', 'G6', 'G9', 'P5', 'G3', 'P7i'],
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function forceGarbageCollection(): void {
  if (global.gc) {
    global.gc();
  }
}

async function addHistoricalModels() {
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
  const entries = Object.entries(HISTORICAL_AND_RARE_MODELS);

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
          vehicle_type: vehicleType,
        });
        modelsToCreate.push(model);
        totalAdded++;
      } else {
        existingModel.order = maxOrder + i + 1;
        if (!existingModel.vehicle_type) {
          existingModel.vehicle_type = determineVehicleType(modelName, brandName);
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

  const totalModels = totalAdded + totalUpdated;
  console.log(
    `📦 Историски модели: обработени брендови ${brandsProcessed}, модели ${totalModels} (нови ${totalAdded}, ажурирани ${totalUpdated})`,
  );
  if (brandsNotFound > 0) {
    console.warn(`⚠️  Прескокнати брендови (${brandsNotFound}): ${missingBrands.join(', ')}`);
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

addHistoricalModels()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error.message);
    process.exit(1);
  });
