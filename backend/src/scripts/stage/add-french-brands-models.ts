import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { determineVehicleType } from '../data/vehicle-classification';

const FRENCH_BRANDS_MODELS: Record<string, string[]> = {
  Citroën: [
    'C1',
    'C2',
    'C3',
    'C3 Aircross',
    'C3 Picasso',
    'C4',
    'C4 Aircross',
    'C4 Cactus',
    'C4 Picasso',
    'C4 Grand Picasso',
    'Grand C4 Picasso',
    'C5',
    'C5 Aircross',
    'C6',
    'C8',
    'C-Crosser',
    'Berlingo',
    'Jumper',
    'SpaceTourer',
    'Ami',
    'E-Mehari',
    'C-Zero',
    'C-Elysée',
    'C3 Pluriel',
    'C4 Sedan',
    'C5 X',
  ],
  Peugeot: [
    '1007',
    '107',
    '108',
    '206',
    '207',
    '208',
    '301',
    '307',
    '308',
    '407',
    '508',
    '2008',
    '3008',
    '4007',
    '4008',
    '5008',
    'Partner',
    'Expert',
    'Rifter',
    'Traveller',
    'Boxer',
    'Bipper',
    'iOn',
    'e-208',
    'e-2008',
    'e-Expert',
    'e-Partner',
    'RCZ',
  ],
  Renault: [
    'Twingo',
    'Clio',
    'Clio Estate',
    'Symbol',
    'Fluence',
    'Megane',
    'Megane Estate',
    'Megane Coupe',
    'Megane Grand Coupe',
    'Laguna',
    'Laguna Estate',
    'Talisman',
    'Talisman Estate',
    'Scenic',
    'Grand Scenic',
    'Espace',
    'Kangoo',
    'Trafic',
    'Master',
    'Captur',
    'Kadjar',
    'Koleos',
    'Arkana',
    'Austral',
    'Megane E-Tech',
    'Zoe',
    'Twingo Z.E.',
    'Kangoo Z.E.',
    'Master Z.E.',
    'Alpine A110',
    'Alpine A310',
    'Vel Satis',
    'Avantime',
    'Modus',
    'Wind',
    'Sport Spider',
  ],
  Dacia: [
    'Sandero',
    'Sandero Stepway',
    'Duster',
    'Duster Adventure',
    'Logan',
    'Logan MCV',
    'Lodgy',
    'Lodgy Stepway',
    'Dokker',
    'Spring',
    'Jogger',
    'Jogger Hybrid',
    'Bigster',
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

async function addFrenchBrandsModels() {
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
  const entries = Object.entries(FRENCH_BRANDS_MODELS);

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

addFrenchBrandsModels()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error.message);
    process.exit(1);
  });
