import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { Brand } from '../brands/entities/brand.entity';
import { VehicleModel } from '../brands/entities/vehicle-model.entity';

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
  BMW: [
    'E30',
    'E36',
    'E46',
    'E39',
    'E38',
    'E34',
    'M3 E30',
    'M3 E36',
    'M3 E46',
    'M5 E34',
    'M5 E39',
    '850i',
    'Z3',
    'Z4',
    'i8',
    'X2',
    'X4',
    'iX1',
    'iX3',
  ],
  'Mercedes-Benz': [
    '190E',
    'W124',
    'W126',
    'W140',
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
  'Land Rover': [
    'Defender',
    'Discovery',
    'Discovery Sport',
    'Range Rover',
    'Range Rover Sport',
    'Range Rover Velar',
    'Range Rover Evoque',
    'Range Rover Classic',
    'Freelander',
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
  Cupra: ['Formentor', 'Born', 'Ateca', 'Leon', 'Tavascan', 'Terra'],
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
    'Leaf Plus',
    'Ariya e-4ORCE',
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
    'EV9 GT',
    'Sportage Hybrid',
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
    'N Vision 74',
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
  MG: ['MG3', 'ZS', 'HS', 'MG4', 'MG5', 'Marvel R', 'TF', 'ZR', 'ZS', 'ZS EV'],
  BYD: ['Dolphin', 'Atto 3', 'Seal', 'Han', 'Tang', 'Song', 'Yuan'],
  Chery: ['Omoda 5', 'Tiggo 7', 'Tiggo 8', 'Jaecoo 7', 'QQ', 'A1', 'A3'],
  Geely: ['Coolray', 'Geometry C', 'Emgrand', 'Atlas', 'Monjaro', 'Tugella'],
  'Great Wall': ['Haval Jolion', 'Haval H6', 'Tank 300', 'Haval H9', 'Wingle'],
  Abarth: ['595', '695', '500e', '124 Spider', 'Punto Evo'],
  Vauxhall: ['Corsa', 'Astra', 'Mokka', 'Grandland', 'Insignia', 'Vectra', 'Cavalier', 'Nova'],
  VinFast: ['VF 3', 'VF 6', 'VF 7', 'VF 8', 'VF 9'],
  Nio: ['ET5', 'ET7', 'EL6', 'EL7', 'EC6', 'ES6', 'ES8', 'EC7'],
  XPeng: ['P7', 'G6', 'G9', 'P5', 'G3', 'P7i'],
};

async function addHistoricalModels() {
  console.log('🚀 Започнување на додавање на историски и ретки модели...\n');

  await AppDataSource.initialize();
  console.log('✅ Поврзано со базата на податоци\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  let totalAdded = 0;
  let totalUpdated = 0;
  let brandsProcessed = 0;

  for (const [brandName, models] of Object.entries(HISTORICAL_AND_RARE_MODELS)) {
    const brand = await brandRepo.findOne({ where: { name: brandName } });

    if (!brand) {
      console.log(`⚠️  Бренд "${brandName}" не е пронајден, прескокнување...\n`);
      continue;
    }

    brandsProcessed++;
    const existingModels = await modelRepo.find({
      where: { brand_id: brand.id },
    });

    const maxOrder =
      existingModels.length > 0 ? Math.max(...existingModels.map((m) => m.order || 0)) : 0;

    let added = 0;
    let updated = 0;

    for (let i = 0; i < models.length; i++) {
      const modelName = models[i];
      const modelNameLower = modelName.toLowerCase();

      const existingModel = existingModels.find((m) => m.name.toLowerCase() === modelNameLower);

      if (!existingModel) {
        const model = modelRepo.create({
          name: modelName,
          brand_id: brand.id,
          order: maxOrder + i + 1,
        });
        await modelRepo.save(model);
        added++;
      } else {
        existingModel.order = maxOrder + i + 1;
        await modelRepo.save(existingModel);
        updated++;
      }
    }

    totalAdded += added;
    totalUpdated += updated;

    console.log(`📊 ${brandName}:`);
    console.log(`   - Додадени модели: ${added}`);
    console.log(`   - Ажурирани модели: ${updated}`);
    console.log(`   - Вкупно модели: ${existingModels.length + added}\n`);
  }

  console.log(`\n✅ Завршено!`);
  console.log(`   - Обработени брендови: ${brandsProcessed}`);
  console.log(`   - Вкупно додадени модели: ${totalAdded}`);
  console.log(`   - Вкупно ажурирани модели: ${totalUpdated}\n`);

  await AppDataSource.destroy();
  console.log('🔌 Врската со базата на податоци е затворена');
}

addHistoricalModels()
  .then(() => {
    console.log('✅ Скриптот заврши успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error);
    process.exit(1);
  });
