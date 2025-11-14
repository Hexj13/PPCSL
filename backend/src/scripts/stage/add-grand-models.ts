import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';

const GRAND_AND_EXTENDED_MODELS: Record<string, string[]> = {
  Citroën: [
    'C4 Grand Picasso',
    'C4 Picasso',
    'C3 Picasso',
    'Grand C4 Picasso',
    'C5 Grand Tourer',
    'C8 Grand',
    'Berlingo Grand',
  ],
  Peugeot: [
    '5008 Grand',
    '3008 Grand',
    'Partner Grand',
    'Expert Grand',
    'Rifter Grand',
    'Traveller Grand',
  ],
  Renault: [
    'Grand Scenic',
    'Scenic Grand',
    'Espace Grand',
    'Grand Espace',
    'Kangoo Grand',
    'Trafic Grand',
  ],
  Opel: [
    'Grandland X',
    'Corsa Grand',
    'Astra Grand',
    'Insignia Grand Sport',
    'Combo Grand',
    'Vivaro Grand',
  ],
  Volkswagen: ['Touran Grand', 'Sharan Grand', 'Caravelle Grand', 'Multivan Grand'],
  'Mercedes-Benz': ['V-Class Grand', 'Vito Grand', 'Sprinter Grand'],
  Fiat: ['500L Grand', 'Doblo Grand', 'Scudo Grand', 'Talento Grand'],
  Ford: ['Grand C-MAX', 'S-MAX Grand', 'Galaxy Grand', 'Tourneo Grand'],
  Nissan: ['Grand Livina', 'Grand Murano', 'Pathfinder Grand'],
  Toyota: ['Grand Highlander', 'Land Cruiser Grand', 'Sienna Grand'],
  Honda: ['Pilot Grand', 'Odyssey Grand'],
  Kia: ['Grand Carnival', 'Grand Sedona', 'Sorento Grand'],
  Hyundai: ['Grand Starex', 'Grand Santa Fe', 'H-1 Grand'],
  Mazda: ['CX-9 Grand', 'MPV Grand', 'CX-8 Grand'],
  Suzuki: ['Grand Vitara', 'Grand Escudo', 'XL-7 Grand'],
  Mitsubishi: ['Grand Lancer', 'Grandis', 'Outlander Grand'],
  Dacia: ['Duster Grand', 'Lodgy Grand', 'Jogger Grand'],
  SEAT: ['Alhambra Grand', 'Tarraco Grand'],
  Škoda: ['Superb Grand', 'Octavia Grand', 'Kodiaq Grand'],
  Volvo: ['XC90 Grand', 'XC70 Grand', 'V90 Grand'],
  'Land Rover': ['Range Rover Grand', 'Discovery Grand', 'Defender Grand'],
  Jaguar: ['XF Grand', 'XJ Grand'],
  'Aston Martin': ['Rapide Grand', 'Lagonda Grand'],
  'Rolls-Royce': ['Phantom Grand', 'Ghost Grand'],
  Bentley: ['Continental Grand', 'Flying Spur Grand'],
  Chrysler: ['Voyager Grand', 'Pacifica Grand', 'Town & Country Grand'],
  Dodge: ['Grand Caravan', 'Journey Grand', 'Durango Grand'],
  Jeep: ['Grand Cherokee', 'Grand Wagoneer', 'Commander Grand'],
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function forceGarbageCollection(): void {
  if (global.gc) {
    global.gc();
  }
}

async function addGrandModels() {
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
  const entries = Object.entries(GRAND_AND_EXTENDED_MODELS);

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
        const model = modelRepo.create({
          name: modelName,
          brand_id: brand.id,
          order: maxOrder + i + 1,
        });
        modelsToCreate.push(model);
        totalAdded++;
      } else {
        existingModel.order = maxOrder + i + 1;
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

  console.log(
    `📦 Grand модели: обработени брендови ${brandsProcessed}, додадени модели ${totalAdded}, ажурирани модели ${totalUpdated}`,
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

addGrandModels()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error.message);
    process.exit(1);
  });
