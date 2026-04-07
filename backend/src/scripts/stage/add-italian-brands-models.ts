import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { determineVehicleType } from '../data/vehicle-classification';

const ITALIAN_BRANDS_TO_ADD = [
  { name: 'Fiat', order: 290 },
  { name: 'Alfa Romeo', order: 291 },
  { name: 'Lancia', order: 292 },
  { name: 'Maserati', order: 293 },
  { name: 'Ferrari', order: 294 },
  { name: 'Lamborghini', order: 295 },
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
    'Junior',
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function forceGarbageCollection(): void {
  if (global.gc) {
    global.gc();
  }
}

async function addItalianBrandsModels() {
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

  for (const brandData of ITALIAN_BRANDS_TO_ADD) {
    let brand = await brandRepo.findOne({ where: { name: brandData.name } });
    if (!brand) {
      const maxOrder = await brandRepo
        .createQueryBuilder('brand')
        .select('MAX(brand.order)', 'max')
        .getRawOne();
      const newOrder = (maxOrder?.max || 0) + 1;

      const models = ITALIAN_BRANDS_MODELS[brandData.name] || [];
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

  const entries = Object.entries(ITALIAN_BRANDS_MODELS);

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
    `📦 Italian brands: processed ${brandsProcessed}, new brands ${brandsAdded}, models ${totalModels} (new ${totalAdded}, reordered ${totalUpdated})`,
  );
  if (brandsNotFound > 0) {
    console.warn(`⚠️  Skipped brands (${brandsNotFound}): ${missingBrands.join(', ')}`);
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

addItalianBrandsModels()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error.message);
    process.exit(1);
  });
