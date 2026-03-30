import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { determineVehicleType } from '../data/vehicle-classification';
import { checkEnvironment, checkPlatform } from '../script-guard';

checkEnvironment(['production', 'stage', 'development', 'test']);
checkPlatform(['common']);

const MISSING_BRANDS_AND_MODELS: Record<string, string[]> = {
  Dodge: [
    'Challenger',
    'Charger',
    'Durango',
    'Journey',
    'Grand Caravan',
    'Viper',
    'Dart',
    'Avenger',
    'Caliber',
    'Magnum',
    'Intrepid',
    'Stratus',
    'Neon',
    'Stealth',
    'Ram 1500',
    'Ram 2500',
    'Ram 3500',
    'Ramcharger',
    'Dakota',
  ],
  Lada: [
    'Granta',
    'Vesta',
    'XRAY',
    'Largus',
    'Niva',
    '4x4',
    'Kalina',
    'Priora',
    'Samara',
    '2101',
    '2102',
    '2103',
    '2104',
    '2105',
    '2106',
    '2107',
    '2108',
    '2109',
    '2110',
    '2111',
    '2112',
    '2113',
    '2114',
    '2115',
  ],
  ВАЗ: [
    'Granta',
    'Vesta',
    'XRAY',
    'Largus',
    'Niva',
    '4x4',
    'Kalina',
    'Priora',
    'Samara',
    '2101',
    '2102',
    '2103',
    '2104',
    '2105',
    '2106',
    '2107',
    '2108',
    '2109',
    '2110',
    '2111',
    '2112',
    '2113',
    '2114',
    '2115',
  ],
  УАЗ: [
    'Patriot',
    'Hunter',
    'Pickup',
    'Cargo',
    'Profi',
    '452',
    '469',
    '3151',
    '3153',
    '3160',
    '3162',
    '3163',
  ],
  ГАЗ: [
    'Volga',
    'GAZ-21',
    'GAZ-24',
    'GAZ-3102',
    'GAZ-31029',
    'GAZ-3110',
    'GAZ-31105',
    'GAZ-3111',
    'Sobol',
    'Gazelle',
    'GAZelle Next',
  ],
  ЗАЗ: ['Tavria', 'Slavuta', 'Sens', 'Chance', 'Forza', 'Lanos', 'Vida', '965', '966', '968'],
  ЛуАЗ: ['969', '969M', '1302', '13021'],
  Москвич: [
    '2140',
    '2141',
    '2142',
    '2138',
    '2139',
    '408',
    '412',
    'Святогор',
    'Князь Владимир',
    'Дуэт',
  ],
  Иж: ['2126', '21261', '2717', '27175'],
  Daewoo: [
    'Matiz',
    'Lanos',
    'Nexia',
    'Leganza',
    'Nubira',
    'Evanda',
    'Magnus',
    'Tacuma',
    'Rezzo',
    'Kalos',
    'Gentra',
    'Gentra X',
  ],
  FAW: [
    'Besturn B30',
    'Besturn B50',
    'Besturn B70',
    'Besturn X40',
    'Besturn X80',
    'Oley',
    'V2',
    'V5',
    'Jinn',
    'Vita',
  ],
  JMC: ['Yusheng S350', 'Yusheng S330', 'Vigus', 'Baodian', 'Shuailing'],
  'Mercedes-Maybach': ['S-Class', 'GLS', '57', '62', 'Landaulet'],
  Datsun: ['Go', 'Go+', 'on-Do', 'mi-Do', 'Redi-Go'],
  Scion: ['tC', 'xB', 'xD', 'iA', 'iM', 'FR-S'],
  Rover: ['75', '45', '25', 'Streetwise', 'CityRover', 'MG Rover'],
  Tata: [
    'Nano',
    'Indica',
    'Indigo',
    'Safari',
    'Sumo',
    'Xenon',
    'Aria',
    'Vista',
    'Manza',
    'Hexa',
    'Harrier',
    'Nexon',
    'Tiago',
    'Tigor',
    'Altroz',
  ],
  'Renault Samsung': ['SM3', 'SM5', 'SM6', 'SM7', 'QM5', 'QM6'],
  Ravon: ['R2', 'R4', 'Gentra', 'Nexia'],
  ARO: ['10', '24', '244', '243'],
  Aito: ['M5', 'M7', 'M9'],
  Maextro: ['S800'],
  Yangwang: ['U8', 'U9'],
  Avatr: ['11', '12'],
  BAIC: ['BJ20', 'BJ40', 'BJ80', 'BJ90', 'EU5', 'EU7', 'X25', 'X35', 'X55', 'X65'],
  BAW: ['BJ212', 'BJ40', 'BJ80', 'Fenix'],
  Brilliance: ['H230', 'H330', 'H530', 'V5', 'V6', 'V7'],
  Denza: ['D9', 'N7', 'N8'],
  Exeed: ['TX', 'TXL', 'VX', 'LX', 'RX'],
  Haima: ['3', '5', '7', '8', 'S5', 'S7', 'M3', 'M5', 'M6', 'M8'],
  HiPhi: ['X', 'Z', 'Y'],
  Hozon: ['Neta S', 'Neta U', 'Neta V'],
  'IM Motors': ['L7', 'LS6', 'LS7'],
  Jac: ['J2', 'J3', 'J5', 'J6', 'S1', 'S2', 'S3', 'S5', 'T40', 'T50', 'T60', 'T70', 'T80'],
  Jetour: ['X70', 'X90', 'X95', 'Dashing', 'T2'],
  LEVC: ['TX', 'VN5'],
  Leapmotor: ['C01', 'C11', 'T03', 'S01'],
  Luxeed: ['S7'],
  'Polar Stone': ['01'],
  Riddara: ['RD6'],
  Venucia: ['D60', 'T60', 'T70', 'T90', 'Star', 'V-Online'],
  Voyah: ['Free', 'Dreamer', 'Passenger'],
  Weltmeister: ['EX5', 'EX6', 'W6'],
  Xiaomi: ['SU7', 'YU7'],
  Zotye: ['T600', 'T700', 'T800', 'SR9', 'E200', 'Z300', 'Z500', 'Z700'],
  iCar: ['03', 'V23'],
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function forceGarbageCollection(): void {
  if (global.gc) {
    global.gc();
  }
}

async function addMissingCarBrands() {
  await AppDataSource.initialize();

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  let brandsAdded = 0;
  let totalModelsAdded = 0;
  let totalModelsUpdated = 0;
  let brandsProcessed = 0;

  const DELAY_BETWEEN_BRANDS = 200;
  const BATCH_SIZE = 10;

  const maxOrderResult = await brandRepo
    .createQueryBuilder('brand')
    .select('MAX(brand.order)', 'max')
    .getRawOne();
  let currentOrder = (maxOrderResult?.max || 0) + 1;

  const entries = Object.entries(MISSING_BRANDS_AND_MODELS);

  for (let idx = 0; idx < entries.length; idx++) {
    const [brandName, models] = entries[idx];
    let brand = await brandRepo.findOne({ where: { name: brandName } });

    if (!brand) {
      const initialVehicleType =
        models.length > 0 ? determineVehicleType(models[0], brandName) : 'car';
      brand = brandRepo.create({
        name: brandName,
        order: currentOrder++,
        vehicle_types: [initialVehicleType],
      });
      brand = await brandRepo.save(brand);
      brandsAdded++;
      console.log(`✅ Создана марка: ${brandName}`);
    } else {
      console.log(`♻️  Марка уже существует: ${brandName}`);
    }

    brandsProcessed++;

    if (models.length === 0) {
      console.log(`  ⚠️  Нет моделей для ${brandName}`);
      continue;
    }

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
        totalModelsAdded++;
      } else {
        existingModel.order = maxOrder + i + 1;
        if (!existingModel.vehicle_types?.[0]) {
          existingModel.vehicle_types = [determineVehicleType(modelName, brandName)];
        }
        modelsToUpdate.push(existingModel);
        totalModelsUpdated++;
      }
    }

    if (modelsToCreate.length > 0) {
      for (let i = 0; i < modelsToCreate.length; i += BATCH_SIZE) {
        const batch = modelsToCreate.slice(i, i + BATCH_SIZE);
        await modelRepo.save(batch);
        await delay(50);
      }
      console.log(`  ✅ Добавлено моделей: ${modelsToCreate.length}`);
    }

    if (modelsToUpdate.length > 0) {
      for (let i = 0; i < modelsToUpdate.length; i += BATCH_SIZE) {
        const batch = modelsToUpdate.slice(i, i + BATCH_SIZE);
        await modelRepo.save(batch);
        await delay(50);
      }
      console.log(`  ♻️  Обновлено моделей: ${modelsToUpdate.length}`);
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
      if (idx % 20 === 0) {
        forceGarbageCollection();
      }
    }
  }

  console.log('\n📊 Итоги:');
  console.log(`   Обработано марок: ${brandsProcessed}`);
  console.log(`   Создано марок: ${brandsAdded}`);
  console.log(`   Добавлено моделей: ${totalModelsAdded}`);
  console.log(`   Обновлено моделей: ${totalModelsUpdated}`);

  await AppDataSource.destroy();
}

addMissingCarBrands()
  .then(() => {
    console.log('\n✨ Скрипт выполнен успешно!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });
