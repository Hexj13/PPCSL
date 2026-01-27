import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { determineVehicleType } from '../data/vehicle-classification';

const COMMERCIAL_MODELS: Record<string, string[]> = {
  Citroën: [
    'Nemo',
    'Jumpy',
    'Dispatch',
    'Berlingo Van',
    'Berlingo Multispace',
    'Jumper Van',
    'Jumper Combi',
    'SpaceTourer',
    'e-Berlingo',
    'e-Jumpy',
    'e-Jumper',
    'e-SpaceTourer',
  ],
  Peugeot: [
    'Bipper',
    'Boxer',
    'Boxer Van',
    'Boxer Combi',
    'Partner Van',
    'Partner Tepee',
    'Expert Van',
    'Expert Combi',
    'Expert Tepee',
    'Rifter',
    'Traveller',
    'e-Partner',
    'e-Expert',
    'e-Boxer',
  ],
  Renault: [
    'Kangoo Van',
    'Kangoo Express',
    'Kangoo Maxi',
    'Trafic Van',
    'Trafic Passenger',
    'Master Van',
    'Master LCV',
    'Master Bus',
    'Master Chassis Cab',
    'Kangoo Z.E.',
    'Master Z.E.',
    'Trafic E-Tech',
    'Kangoo Rapid',
    'Master Rapid',
  ],
  Fiat: [
    'Doblo',
    'Doblo Cargo',
    'Doblo Combi',
    'Scudo',
    'Talento',
    'Ducato Van',
    'Ducato Combi',
    'Ducato Chassis Cab',
    'Fiorino',
    'Qubo',
    'e-Ducato',
    'e-Doblo',
  ],
  Volkswagen: [
    'Caddy',
    'Caddy Maxi',
    'Caddy Life',
    'Transporter',
    'Transporter Kombi',
    'Transporter Caravelle',
    'Transporter California',
    'Crafter',
    'Crafter Van',
    'Crafter Kombi',
    'Crafter Chassis Cab',
    'Amarok',
    'e-Crafter',
    'ID. Buzz Cargo',
  ],
  'Mercedes-Benz': [
    'Citan',
    'Citan Tourer',
    'Vito',
    'Vito Tourer',
    'Vito Mixto',
    'Sprinter',
    'Sprinter Van',
    'Sprinter Kombi',
    'Sprinter Chassis Cab',
    'Metris',
    'eCitan',
    'eVito',
    'eSprinter',
  ],
  Opel: [
    'Combo',
    'Combo Cargo',
    'Combo Life',
    'Vivaro',
    'Vivaro Van',
    'Vivaro Life',
    'Movano',
    'Movano Van',
    'Movano Combi',
    'Movano Chassis Cab',
    'Combo-e',
    'Vivaro-e',
    'Movano-e',
  ],
  Ford: [
    'Transit Courier',
    'Transit Connect',
    'Transit Custom',
    'Transit',
    'Transit Van',
    'Transit Kombi',
    'Transit Chassis Cab',
    'Transit Bus',
    'Ranger',
    'E-Transit',
    'E-Transit Custom',
    'Tourneo Connect',
    'Tourneo Custom',
    'Tourneo Courier',
  ],
  Toyota: [
    'Proace',
    'Proace City',
    'Proace Van',
    'Proace Verso',
    'Hiace',
    'Hiace Van',
    'Hiace Commuter',
    'Hiace GL Grandia',
    'Hiace Super Grandia',
    'Hilux',
    'Tacoma',
    'Tundra',
  ],
  Nissan: [
    'NV200',
    'NV300',
    'NV400',
    'e-NV200',
    'Navara',
    'Titan',
    'Frontier',
    'NV200 Van',
    'NV300 Van',
    'NV400 Van',
  ],
  Škoda: [
    'Kodiaq',
    'Karoq',
    'Kamiq',
    'Octavia',
    'Superb',
    'Fabia',
    'Scala',
    'Rapid',
    'Citigo',
    'Enyaq',
  ],
  SEAT: [
    'Ibiza',
    'Leon',
    'Arona',
    'Ateca',
    'Tarraco',
    'Alhambra',
    'Altea',
    'Toledo',
    'Exeo',
    'Formentor',
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
    'H-1',
    'H-1 Van',
    'Staria',
    'Santa Cruz',
    'Porter',
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
    'Carnival',
    'Mohave',
    'Bongo',
    'K2500',
    'K2700',
  ],
  Mazda: ['Mazda2', 'Mazda3', 'Mazda6', 'CX-30', 'CX-5', 'MX-30', 'CX-60', 'BT-50', 'B-Series'],
  Honda: ['Civic', 'Accord', 'CR-V', 'HR-V', 'Jazz', 'e:Ny1', 'Ridgeline'],
  Isuzu: ['D-Max', 'MU-X', 'Elf', 'Forward', 'Giga', 'N-Series', 'F-Series'],
  GMC: ['Sierra', 'Sierra 1500', 'Sierra 2500', 'Sierra 3500', 'Canyon', 'Savana'],
  Ram: ['1500', '2500', '3500', 'ProMaster', 'ProMaster City'],
  Mitsubishi: ['L200', 'L300', 'L400', 'Triton', 'Canter', 'Fuso'],
  Suzuki: ['Carry', 'Every', 'Super Carry', 'APV', 'Eeco'],
  Daihatsu: ['Hijet', 'Atrai', 'Naked', 'Storia', 'Opti'],
  Dacia: ['Dokker', 'Dokker Van', 'Logan MCV', 'Logan Van', 'Logan Pick-Up'],
  Chevrolet: ['Express', 'Silverado'],
  Dodge: ['ProMaster', 'ProMaster City'],
  Lifan: ['Solano', 'Cebrium', 'X60', 'X50'],
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function forceGarbageCollection(): void {
  if (global.gc) {
    global.gc();
  }
}

async function addCommercialModels() {
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
  const entries = Object.entries(COMMERCIAL_MODELS);

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

  console.log(
    `📦 Комерцијални модели: обработени брендови ${brandsProcessed}, додадени модели ${totalAdded}, ажурирани модели ${totalUpdated}`,
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

addCommercialModels()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error.message);
    process.exit(1);
  });
