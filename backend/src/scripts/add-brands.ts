import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { Brand } from '../brands/entities/brand.entity';
import { VehicleModel } from '../brands/entities/vehicle-model.entity';

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
  ],
  Audi: ['A1', 'A3', 'A4', 'A6', 'Q3', 'Q5', 'Q7', 'Q8', 'e-tron GT', 'Q4 e-tron'],
  BMW: [
    '1 Series',
    '2 Series Gran Coupé',
    '3 Series',
    '5 Series',
    '7 Series',
    'X1',
    'X3',
    'X5',
    'i4',
    'iX',
  ],
  'Mercedes-Benz': [
    'A-Class',
    'C-Class',
    'E-Class',
    'S-Class',
    'GLA',
    'GLC',
    'GLE',
    'GLS',
    'EQE',
    'EQA',
  ],
  Porsche: ['911', 'Cayenne', 'Macan', 'Taycan', 'Panamera', '718 Cayman', '718 Boxster'],
  Opel: ['Corsa', 'Astra', 'Mokka', 'Grandland', 'Crossland', 'Insignia'],
  Renault: ['Clio', 'Captur', 'Austral', 'Megane E-Tech', 'Arkana', 'Scenic E-Tech', 'Twingo'],
  Peugeot: ['208', '2008', '308', '3008', '408', '508', 'e-208', 'e-3008'],
  Citroën: ['C3', 'C3 Aircross', 'C4', 'C4 X', 'C5 Aircross', 'ë-C4', 'Berlingo VP'],
  Fiat: ['500', '500e', '500X', 'Panda', 'Tipo', '600e'],
  'Alfa Romeo': ['Giulia', 'Stelvio', 'Tonale', 'Junior'],
  Lancia: ['Ypsilon'],
  Maserati: ['Ghibli', 'Quattroporte', 'Levante', 'Grecale', 'MC20', 'GranTurismo'],
  Ferrari: ['Roma', '296 GTB', '296 GTS', 'SF90 Stradale', 'Purosangue', '812 GTS'],
  Lamborghini: ['Huracán', 'Revuelto', 'Urus'],
  Bentley: ['Continental GT', 'Flying Spur', 'Bentayga'],
  Bugatti: ['Chiron', 'Mistral', 'Bolide'],
  'Rolls-Royce': ['Phantom', 'Ghost', 'Cullinan', 'Spectre'],
  Jaguar: ['F-Pace', 'E-Pace', 'I-Pace', 'F-Type'],
  'Land Rover': [
    'Defender',
    'Discovery',
    'Discovery Sport',
    'Range Rover',
    'Range Rover Sport',
    'Range Rover Velar',
    'Range Rover Evoque',
  ],
  MINI: ['Cooper 3-Door', 'Cooper 5-Door', 'Cabrio', 'Countryman', 'Aceman'],
  Volvo: ['EX30', 'XC40', 'EX40', 'XC60', 'EX90', 'S60', 'V60'],
  Saab: ['9-3', '9-5'],
  Škoda: ['Fabia', 'Scala', 'Octavia', 'Superb', 'Kamiq', 'Karoq', 'Kodiaq', 'Enyaq'],
  SEAT: ['Ibiza', 'Leon', 'Arona', 'Ateca', 'Tarraco'],
  Cupra: ['Formentor', 'Born', 'Ateca', 'Leon', 'Tavascan'],
  'DS Automobiles': ['DS 3', 'DS 4', 'DS 7', 'DS 9'],
  Isuzu: ['D-Max', 'MU-X'],
  Mitsubishi: ['ASX', 'Eclipse Cross', 'Outlander', 'Space Star'],
  Honda: ['Civic', 'Accord', 'CR-V', 'HR-V', 'Jazz', 'e:Ny1'],
  Toyota: ['Aygo X', 'Yaris', 'Yaris Cross', 'Corolla', 'C-HR', 'RAV4', 'Camry', 'bZ4X'],
  Nissan: ['Micra', 'Juke', 'Qashqai', 'X-Trail', 'Ariya', 'Leaf'],
  Mazda: ['Mazda2', 'Mazda3', 'Mazda6', 'CX-30', 'CX-5', 'MX-30', 'CX-60'],
  Subaru: ['Impreza', 'XV/Crosstrek', 'Forester', 'Outback', 'Solterra'],
  Kia: ['Picanto', 'Rio', 'Ceed', 'Niro', 'Sportage', 'Sorento', 'EV6', 'EV9'],
  Hyundai: ['i10', 'i20', 'i30', 'Bayon', 'Kona', 'Tucson', 'Ioniq 5', 'Ioniq 6'],
  Suzuki: ['Swift', 'Ignis', 'Vitara', 'S-Cross', 'Across'],
  Dacia: ['Spring', 'Sandero', 'Jogger', 'Duster', 'Bigster'],
  Alpine: ['A110'],
  Infiniti: ['Q50', 'Q60', 'QX55'],
  Genesis: ['G70', 'G80', 'G90', 'GV60', 'GV70', 'GV80'],
  Tesla: ['Model 3', 'Model Y', 'Model S', 'Model X'],
  Polestar: ['2', '3', '4'],
  Lotus: ['Emira', 'Eletre', 'Evija'],
  'Aston Martin': ['DB12', 'Vantage', 'DBX', 'Valour'],
  McLaren: ['Artura', '750S', 'GT', '765LT'],
  Koenigsegg: ['Jesko', 'Gemera', 'Regera'],
  Pagani: ['Huayra', 'Utopia'],
  Rivian: ['R1T', 'R1S'],
  Lucid: ['Air', 'Gravity'],
  Smart: ['#1', '#3', 'EQ fortwo'],
  MG: ['MG3', 'ZS', 'HS', 'MG4', 'MG5', 'Marvel R'],
  'Lynk & Co': ['01', '02', '03', '09'],
  BYD: ['Dolphin', 'Atto 3', 'Seal', 'Han', 'Tang'],
  Chery: ['Omoda 5', 'Tiggo 7', 'Tiggo 8', 'Jaecoo 7'],
  Geely: ['Coolray', 'Geometry C', 'Emgrand', 'Atlas'],
  'Great Wall': ['Haval Jolion', 'Haval H6', 'Tank 300'],
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
};

async function addBrandsAndModels() {
  console.log('🚀 Започнување на додавање на марки и модели...\n');

  await AppDataSource.initialize();
  console.log('✅ Поврзано со базата на податоци\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  let order = 1;
  let totalBrands = 0;
  let totalModels = 0;
  let newBrands = 0;
  let newModels = 0;

  for (const [brandName, models] of Object.entries(BRANDS_AND_MODELS)) {
    let brand = await brandRepo.findOne({ where: { name: brandName } });

    if (!brand) {
      brand = brandRepo.create({
        name: brandName,
        order: order++,
      });
      brand = await brandRepo.save(brand);
      newBrands++;
      console.log(`✅ Креиран нов бренд: ${brandName}`);
    } else {
      brand.order = order++;
      brand = await brandRepo.save(brand);
      console.log(`♻️  Ажуриран бренд: ${brandName}`);
    }
    totalBrands++;

    const existingModels = await modelRepo.find({
      where: { brand_id: brand.id },
    });
    const existingModelsMap = new Set(existingModels.map((m) => m.name));

    for (let i = 0; i < models.length; i++) {
      const modelName = models[i];

      if (!existingModelsMap.has(modelName)) {
        const model = modelRepo.create({
          name: modelName,
          brand_id: brand.id,
          order: i + 1,
        });
        await modelRepo.save(model);
        newModels++;
        totalModels++;
      } else {
        const existingModel = existingModels.find((m) => m.name === modelName);
        if (existingModel) {
          existingModel.order = i + 1;
          await modelRepo.save(existingModel);
        }
        totalModels++;
      }
    }

    console.log(`   ✓ ${models.length} модели за ${brandName}`);
  }

  console.log(`\n✅ Завршено!`);
  console.log(`\n📊 Статистика:`);
  console.log(`   - Вкупно марки: ${totalBrands}`);
  console.log(`   - Нови марки: ${newBrands}`);
  console.log(`   - Вкупно модели: ${totalModels}`);
  console.log(`   - Нови модели: ${newModels}\n`);

  await AppDataSource.destroy();
  console.log('🔌 Врската со базата на податоци е затворена');
}

addBrandsAndModels()
  .then(() => {
    console.log('✅ Скриптот заврши успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error);
    process.exit(1);
  });
