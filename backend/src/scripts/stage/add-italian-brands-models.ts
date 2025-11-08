import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';

const ITALIAN_BRANDS_TO_ADD = [
  // Основни италијански брендови (ако недостасуваат)
  { name: 'Fiat', order: 290 },
  { name: 'Alfa Romeo', order: 291 },
  { name: 'Lancia', order: 292 },
  { name: 'Maserati', order: 293 },
  { name: 'Ferrari', order: 294 },
  { name: 'Lamborghini', order: 295 },
  // Плус помали/ретки брендови
  { name: 'Abarth', order: 300 },
  { name: 'De Tomaso', order: 301 },
  { name: 'Autobianchi', order: 302 },
  { name: 'Innocenti', order: 303 },
  { name: 'Pagani', order: 304 },
  { name: 'Mazzanti', order: 305 },
  { name: 'Bizzarrini', order: 306 },
  { name: 'Iso', order: 307 },
];

const ITALIAN_BRANDS_MODELS: Record<string, string[]> = {
  Fiat: [
    '500',
    '500e',
    '500X',
    '500L',
    'Panda',
    'Tipo',
    'Punto',
    'Grande Punto',
    'Bravo',
    'Brava',
    'Stilo',
    'Uno',
    'Seicento',
    'Cinquecento',
    'Multipla',
    'Croma',
    'Coupe',
    'Barchetta',
    '124',
    '124 Spider',
    '600e',
    'Linea',
    'Albea',
    'Siena',
    'Palio',
    'Marea',
    'Idea',
    'Stilo Multiwagon',
    'Tempra',
    'Regata',
    'Ritmo',
    'X1/9',
    '127',
    '128',
    '131',
    '132',
    'Freemont',
    'Ducato',
    'Fiorino',
    'Qubo',
    'Doblo',
    'Talento',
    'Scudo',
  ],
  'Alfa Romeo': [
    'Giulia',
    'Stelvio',
    'Tonale',
    'Giulietta',
    '147',
    '156',
    '159',
    '166',
    '75',
    '33',
    '164',
    'Brera',
    'Spider',
    'GT',
    '4C',
    '8C Competizione',
    'MiTo',
    'GTV',
    'SZ',
    'RZ',
  ],
  Lancia: [
    'Ypsilon',
    'Delta',
    'Thema',
    'Kappa',
    'Dedra',
    'Lybra',
    'Musa',
    'Phedra',
    'Flavia',
    'Fulvia',
    'Beta',
    'Gamma',
    'Monte Carlo',
    'Stratos',
    'Aurelia',
    'Appia',
    'Prisma',
    'Thesis',
  ],
  Maserati: [
    'Ghibli',
    'Quattroporte',
    'Levante',
    'Grecale',
    'GranTurismo',
    'GranCabrio',
    'MC20',
    'MC12',
    'Bora',
    'Merak',
    'Khamsin',
    'Biturbo',
    'Shamal',
    'Spyder',
    'Coupe',
    '3200 GT',
    '4200 GT',
  ],
  Ferrari: [
    '296 GTB',
    '296 GTS',
    '488',
    '458',
    'F430',
    '360',
    '355',
    '348',
    '328',
    '308',
    'Testarossa',
    '512 TR',
    '550 Maranello',
    '575M',
    '599 GTB',
    '612 Scaglietti',
    'F12berlinetta',
    '812 Superfast',
    '812 GTS',
    'Roma',
    'Portofino',
    'California',
    'LaFerrari',
    'Enzo',
    'F50',
    'F40',
    'SF90 Stradale',
    'Purosangue',
    'Dino 246',
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
    'Miura',
    'Jalpa',
    'Espada',
    'Islero',
    'Jarama',
    'Urraco',
    'Sian',
  ],
  Pagani: ['Zonda', 'Zonda F', 'Zonda R', 'Huayra', 'Huayra Roadster', 'Huayra BC', 'Utopia'],
  Abarth: [
    '500',
    '595',
    '695',
    '124 Spider',
    'Punto',
    'Grande Punto',
    '131 Abarth',
    'Ritmo Abarth',
  ],
  'De Tomaso': ['Pantera', 'Mangusta', 'Longchamp', 'Guara'],
  Autobianchi: ['A112', 'A111', 'Bianchina', 'Y10', 'Abarth A112'],
  Innocenti: ['Mini', 'Mini De Tomaso', 'Mille', 'Elba'],
  Mazzanti: ['Evantra'],
  Bizzarrini: ['5300 GT', '5300 GT Revival'],
  Iso: ['Grifo', 'Rivolta', 'Fidia', 'Lele'],
};

async function addItalianBrandsModels() {
  console.log('🚀 Започнување на додавање на италијански марки и модели...\n');

  await AppDataSource.initialize();
  console.log('✅ Поврзано со базата на податоци\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  let brandsAdded = 0;
  let totalAdded = 0;
  let totalUpdated = 0;
  let brandsProcessed = 0;
  let brandsNotFound = 0;

  // Креирај ги недостасувачките брендови
  for (const brandData of ITALIAN_BRANDS_TO_ADD) {
    let brand = await brandRepo.findOne({ where: { name: brandData.name } });
    if (!brand) {
      const maxOrder = await brandRepo
        .createQueryBuilder('brand')
        .select('MAX(brand.order)', 'max')
        .getRawOne();
      const newOrder = (maxOrder?.max || 0) + 1;

      brand = brandRepo.create({ name: brandData.name, order: newOrder });
      brand = await brandRepo.save(brand);
      brandsAdded++;
      console.log(`✅ Креиран нов бренд: ${brandData.name}`);
    }
  }

  if (brandsAdded > 0) {
    console.log(`\n📊 Креирани ${brandsAdded} нови брендови\n`);
  }

  // Додај модели за сите италијански брендови (вкл. постоечки)
  for (const [brandName, models] of Object.entries(ITALIAN_BRANDS_MODELS)) {
    const brand = await brandRepo.findOne({ where: { name: brandName } });

    if (!brand) {
      brandsNotFound++;
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
        console.log(`  ✅ Додаден модел: ${modelName}`);
      } else {
        existingModel.order = maxOrder + i + 1;
        await modelRepo.save(existingModel);
        updated++;
      }
    }

    totalAdded += added;
    totalUpdated += updated;

    if (added > 0 || updated > 0) {
      console.log(`\n📊 ${brandName}:`);
      console.log(`   - Додадени модели: ${added}`);
      console.log(`   - Ажурирани модели: ${updated}`);
      console.log(`   - Вкупно модели: ${existingModels.length + added}\n`);
    } else {
      console.log(`\n📊 ${brandName}:`);
      console.log(`   - Сите модели веќе постојат\n`);
    }
  }

  console.log(`\n✅ Завршено!`);
  console.log(`   - Креирани нови брендови: ${brandsAdded}`);
  console.log(`   - Обработени брендови: ${brandsProcessed}`);
  console.log(`   - Брендови не пронајдени: ${brandsNotFound}`);
  console.log(`   - Вкупно додадени модели: ${totalAdded}`);
  console.log(`   - Вкупно ажурирани модели: ${totalUpdated}\n`);

  await AppDataSource.destroy();
  console.log('🔌 Врската со базата на податоци е затворена');
}

addItalianBrandsModels()
  .then(() => {
    console.log('✅ Скриптот заврши успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error);
    process.exit(1);
  });
