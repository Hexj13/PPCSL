import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';

const BRANDS_AND_MODELS = {
  Volkswagen: [
    'Golf',
    'Polo',
    'Passat',
    'Tiguan',
    'T-Roc',
    'ID.3',
    'ID.4',
    'ID.7',
    'Arteon',
    'Touran',
    'Touareg',
    'Sharan',
    'Jetta',
    'T-Cross',
    'Tiguan Allspace',
  ],
  Audi: [
    'A1',
    'A3',
    'A4',
    'A5',
    'A6',
    'A7',
    'A8',
    'Q2',
    'Q3',
    'Q5',
    'Q7',
    'Q8',
    'e-tron',
    'e-tron GT',
    'Q4 e-tron',
    'TT',
    'R8',
  ],
  BMW: [
    '1 Series',
    '2 Series',
    '2 Series Gran Coupé',
    '3 Series',
    '4 Series',
    '5 Series',
    '6 Series',
    '7 Series',
    '8 Series',
    'X1',
    'X2',
    'X3',
    'X4',
    'X5',
    'X6',
    'X7',
    'Z4',
    'i4',
    'iX',
    'iX1',
    'iX3',
  ],
  'Mercedes-Benz': [
    'A-Class',
    'B-Class',
    'C-Class',
    'E-Class',
    'S-Class',
    'CLA',
    'CLS',
    'GLA',
    'GLB',
    'GLC',
    'GLE',
    'GLS',
    'G-Class',
    'SL',
    'SLC',
    'AMG GT',
    'EQE',
    'EQA',
    'EQB',
    'EQS',
    'Actros',
    'Arocs',
    'Antos',
    'Atego',
    'Econic',
    'Unimog',
  ],
  Porsche: [
    '911',
    'Cayenne',
    'Macan',
    'Taycan',
    'Panamera',
    '718 Cayman',
    '718 Boxster',
    'Boxster',
    'Cayman',
  ],
  Opel: [
    'Corsa',
    'Astra',
    'Mokka',
    'Grandland',
    'Crossland',
    'Insignia',
    'Zafira',
    'Combo',
    'Vivaro',
    'Movano',
  ],
  Renault: [
    'Clio',
    'Captur',
    'Austral',
    'Megane',
    'Megane E-Tech',
    'Scenic',
    'Scenic E-Tech',
    'Arkana',
    'Twingo',
    'Espace',
    'Talisman',
    'Kadjar',
    'Koleos',
    'T',
    'C',
    'K',
    'D',
    'Master',
  ],
  Peugeot: [
    '208',
    '2008',
    '308',
    '3008',
    '408',
    '508',
    '5008',
    'e-208',
    'e-3008',
    'Partner',
    'Expert',
    'Rifter',
    'Traveller',
  ],
  Citroën: [
    'C3',
    'C3 Aircross',
    'C4',
    'C4 X',
    'C5',
    'C5 Aircross',
    'C6',
    'ë-C4',
    'Berlingo',
    'Berlingo VP',
    'Jumper',
    'SpaceTourer',
  ],
  Fiat: [
    '500',
    '500e',
    '500X',
    '500L',
    'Panda',
    'Punto',
    'Tipo',
    'Doblo',
    'Scudo',
    'Talento',
    '600e',
  ],
  'Alfa Romeo': ['Giulia', 'Stelvio', 'Tonale', 'Junior'],
  Lancia: ['Ypsilon'],
  Maserati: ['Ghibli', 'Quattroporte', 'Levante', 'Grecale', 'MC20', 'GranTurismo'],
  Ferrari: ['Roma', '296 GTB', '296 GTS', 'SF90 Stradale', 'Purosangue', '812 GTS'],
  Lamborghini: ['Huracán', 'Revuelto', 'Urus'],
  Bentley: ['Continental GT', 'Flying Spur', 'Bentayga'],
  Bugatti: ['Chiron', 'Mistral', 'Bolide'],
  'Rolls-Royce': ['Phantom', 'Ghost', 'Cullinan', 'Spectre'],
  Jaguar: ['XE', 'XF', 'XJ', 'F-Pace', 'E-Pace', 'I-Pace', 'F-Type', 'XK'],
  'Land Rover': [
    'Defender',
    'Discovery',
    'Discovery Sport',
    'Range Rover',
    'Range Rover Sport',
    'Range Rover Velar',
    'Range Rover Evoque',
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
    'EX30',
    'XC40',
    'EX40',
    'XC60',
    'XC70',
    'XC90',
    'EX90',
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
    'C30',
    'C70',
    'FH',
    'FM',
    'FMX',
    'FM Low',
    'VNR',
    'VNL',
    'VHD',
  ],
  Saab: ['9-3', '9-5', '900', '9000'],
  Škoda: [
    'Fabia',
    'Scala',
    'Octavia',
    'Superb',
    'Kamiq',
    'Karoq',
    'Kodiaq',
    'Enyaq',
    'Rapid',
    'Yeti',
    'Roomster',
  ],
  SEAT: ['Ibiza', 'Leon', 'Arona', 'Ateca', 'Tarraco', 'Alhambra', 'Altea', 'Toledo', 'Exeo'],
  Cupra: ['Formentor', 'Born', 'Ateca', 'Leon', 'Tavascan'],
  'DS Automobiles': ['DS 3', 'DS 4', 'DS 7', 'DS 9'],
  Isuzu: ['D-Max', 'MU-X', 'N-Series', 'F-Series', 'Giga', 'Forward', 'Elf'],
  Mitsubishi: ['ASX', 'Eclipse Cross', 'Outlander', 'Space Star', 'L200', 'Lancer', 'Pajero'],
  Honda: [
    'Civic',
    'Accord',
    'CR-V',
    'HR-V',
    'Jazz',
    'e:Ny1',
    'Pilot',
    'Passport',
    'Ridgeline',
    'Civic Type R',
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
    'Hilux',
  ],
  Nissan: [
    'Micra',
    'Juke',
    'Qashqai',
    'X-Trail',
    'Ariya',
    'Leaf',
    'Pathfinder',
    'Navara',
    'Patrol',
    'Sentra',
    'Altima',
  ],
  Mazda: ['Mazda2', 'Mazda3', 'Mazda6', 'CX-30', 'CX-5', 'CX-9', 'MX-30', 'MX-5', 'CX-60', 'CX-8'],
  Subaru: ['Impreza', 'XV/Crosstrek', 'Forester', 'Outback', 'Solterra', 'Legacy', 'WRX', 'BRZ'],
  Kia: [
    'Picanto',
    'Rio',
    'Ceed',
    'Niro',
    'Sportage',
    'Sorento',
    'EV6',
    'EV9',
    'Stinger',
    'Optima',
    'Carnival',
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
    'Elantra',
    'Sonata',
    'Santa Fe',
    'Palisade',
    'Veloster',
  ],
  Suzuki: ['Swift', 'Ignis', 'Vitara', 'S-Cross', 'Across', 'Baleno', 'SX4'],
  Dacia: ['Spring', 'Sandero', 'Jogger', 'Duster', 'Bigster', 'Logan', 'Lodgy', 'Dokker'],
  Alpine: ['A110'],
  Infiniti: ['Q50', 'Q60', 'QX50', 'QX55', 'QX60', 'QX80'],
  Genesis: ['G70', 'G80', 'G90', 'GV60', 'GV70', 'GV80'],
  Tesla: ['Model 3', 'Model Y', 'Model S', 'Model X', 'Cybertruck', 'Roadster'],
  Polestar: ['2', '3', '4'],
  Lotus: ['Emira', 'Eletre', 'Evija'],
  'Aston Martin': ['DB12', 'Vantage', 'DBX', 'Valour'],
  McLaren: ['Artura', '750S', 'GT', '765LT'],
  Koenigsegg: ['Jesko', 'Gemera', 'Regera'],
  Pagani: ['Huayra', 'Utopia'],
  Rivian: ['R1T', 'R1S'],
  Lucid: ['Air', 'Gravity'],
  Smart: ['#1', '#3', 'EQ fortwo', 'Forfour', 'Roadster', 'Crossblade'],
  MG: ['MG3', 'ZS', 'HS', 'MG4', 'MG5', 'Marvel R'],
  'Lynk & Co': ['01', '02', '03', '09'],
  BYD: ['Dolphin', 'Atto 3', 'Seal', 'Han', 'Tang', 'Song', 'Yuan'],
  Chery: ['Omoda 5', 'Tiggo 7', 'Tiggo 8', 'Jaecoo 7', 'QQ', 'A1', 'A3'],
  Geely: ['Coolray', 'Geometry C', 'Emgrand', 'Atlas', 'Monjaro', 'Tugella'],
  'Great Wall': ['Haval Jolion', 'Haval H6', 'Tank 300', 'Haval H9', 'Wingle'],
  Jensen: ['Interceptor'],
  TVR: ['Griffith'],
  Morgan: ['Plus Four', 'Plus Six', 'Super 3'],
  Abarth: ['595', '695', '500e'],
  Caterham: ['Seven 170', 'Seven 340', 'Seven 485'],
  BAC: ['Mono', 'Mono R'],
  Zagato: ['Mostro', 'IsoRivolta GTZ'],
  Ginetta: ['G40', 'G56', 'Akula'],
  Vauxhall: ['Corsa', 'Astra', 'Mokka', 'Grandland'],
  Rimac: ['Nevera'],
  Gumpert: ['Apollo'],
  Donkervoort: ['F22', 'D8 GTO'],
  Proton: ['Saga', 'X50', 'X70'],
  'Saic Motor': ['Roewe i5', 'Roewe RX5', 'Maxus Euniq 6'],
  VinFast: ['VF 3', 'VF 6', 'VF 7', 'VF 8', 'VF 9'],
  Nio: ['ET5', 'ET7', 'EL6', 'EL7', 'EC6'],
  XPeng: ['P7', 'G6', 'G9', 'P5'],
  Aiways: ['U5', 'U6'],
  Seres: ['3', '5'],
  Hongqi: ['H9', 'HS5', 'E-HS9'],
  Fisker: ['Ocean', 'Pear'],
  'Faraday Future': ['FF 91 2.0'],
  MAN: ['TGL', 'TGM', 'TGS', 'TGX', 'eTGE', 'eTGM'],
  Scania: ['P-Series', 'G-Series', 'R-Series', 'S-Series', 'L-Series', 'XT'],
  Iveco: ['Daily', 'Eurocargo', 'Stralis', 'Hi-Way', 'Tector', 'S-Way'],
  DAF: ['LF', 'CF', 'XF', 'XG', 'XG+', 'XF Electric'],
  Freightliner: ['Cascadia', 'Coronado', 'M2', 'Business Class', 'Century Class'],
  Kenworth: ['T680', 'T880', 'W900', 'T800', 'T600', 'K270', 'K370'],
  Peterbilt: ['579', '389', '567', '520', '348', '337', '220'],
  Mack: ['Anthem', 'Pinnacle', 'Granite', 'TerraPro', 'MD Series', 'LR Series'],
  Hino: ['300 Series', '500 Series', '700 Series', 'Dutro'],
  Fuso: ['Canter', 'Fighter', 'Super Great', 'Rosa'],
  'UD Trucks': ['Quon', 'Condor', 'Croner', 'Kazet'],
  'Western Star': ['4700', '4900', '5700', '6900'],
  International: ['LT Series', 'HX Series', 'MV Series', 'ProStar'],
  Navistar: ['International LT', 'International HX', 'International MV'],
  'Ford Trucks': ['Cargo', 'F-MAX', 'F-150', 'F-250', 'F-350', 'F-450', 'F-550'],
  'Chevrolet Trucks': ['Silverado 1500', 'Silverado 2500', 'Silverado 3500', 'Colorado'],
  'GMC Trucks': ['Sierra 1500', 'Sierra 2500', 'Sierra 3500', 'Canyon'],
  'Ram Trucks': ['1500', '2500', '3500', '4500', '5500'],
  'Dodge Trucks': ['Ram 1500', 'Ram 2500', 'Ram 3500'],
  Tatra: ['Tatra 815', 'Tatra Phoenix', 'Tatra Force'],
  Kamaz: ['KamAZ-4310', 'KamAZ-65117', 'KamAZ-5490'],
  GAZ: ['GAZ-3302', 'GAZ-3308', 'GAZ-3310', 'GAZon Next'],
  Ural: ['Ural-4320', 'Ural-6370', 'Ural-63685'],
  MAZ: ['MAZ-6312', 'MAZ-5440', 'MAZ-6430'],
  BelAZ: ['BelAZ-7555', 'BelAZ-75710', 'BelAZ-7513'],
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function forceGarbageCollection(): void {
  if (global.gc) {
    global.gc();
  }
}

async function addBrandsAndModels() {
  await AppDataSource.initialize();

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  let order = 1;
  let totalBrands = 0;
  let newBrands = 0;
  let newModels = 0;
  let updatedModels = 0;

  const brandsEntries = Object.entries(BRANDS_AND_MODELS);
  const DELAY_BETWEEN_BRANDS = 200;
  const BATCH_SIZE = 10;

  for (let idx = 0; idx < brandsEntries.length; idx++) {
    const [brandName, models] = brandsEntries[idx];
    let brand = await brandRepo.findOne({ where: { name: brandName } });

    if (!brand) {
      brand = brandRepo.create({
        name: brandName,
        order: order++,
      });
      brand = await brandRepo.save(brand);
      newBrands++;
    } else {
      brand.order = order++;
      brand = await brandRepo.save(brand);
    }
    totalBrands++;

    const existingModels = await modelRepo.find({
      where: { brand_id: brand.id },
      select: ['id', 'name'],
    });
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
        const model = modelRepo.create({
          name: modelName,
          brand_id: brand.id,
          order: i + 1,
        });
        modelsToCreate.push(model);
        newModels++;
      } else {
        existingModel.order = i + 1;
        modelsToUpdate.push(existingModel);
        updatedModels++;
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

    if (idx < brandsEntries.length - 1) {
      await delay(DELAY_BETWEEN_BRANDS);
      if (idx % 20 === 0) {
        forceGarbageCollection();
      }
    }
  }

  console.log(
    `📦 Основни брендови: обработени ${totalBrands}, нови брендови ${newBrands}, модели ${newModels + updatedModels} (нови ${newModels}, ажурирани ${updatedModels})`,
  );

  const summary = {
    brandsProcessed: totalBrands,
    brandsCreated: newBrands,
    modelsInserted: newModels,
    modelsReordered: updatedModels,
  };

  console.log(JSON.stringify(summary));

  await AppDataSource.destroy();
}

addBrandsAndModels()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error.message);
    process.exit(1);
  });
