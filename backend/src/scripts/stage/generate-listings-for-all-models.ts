import 'reflect-metadata';

import * as fs from 'fs';
import * as path from 'path';

import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import {
  BodyType,
  ConditionType,
  Currency,
  DriveType,
  FuelType,
  ListingStatus as ListingStatusEnum,
  RegistrationType,
  TransmissionType,
  UserType as UserTypeEnum,
} from '../../common/types';
import { AppDataSource } from '../../data-source';
import { Listing } from '../../listings/entities/listing.entity';
import { Vehicle } from '../../listings/entities/vehicle.entity';
import { User } from '../../users/entities/user.entity';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);

const cities = [
  'Скопје',
  'Битола',
  'Прилеп',
  'Куманово',
  'Охрид',
  'Струга',
  'Велес',
  'Штип',
  'Кавадарци',
  'Гостивар',
  'Тетово',
  'Кичево',
  'Дебар',
  'Струмица',
];

const colors = [
  'white',
  'black',
  'gray',
  'silver',
  'blue',
  'red',
  'yellow',
  'green',
  'brown',
  'orange',
  'violet',
  'beige',
];

const descriptions = [
  'Отлично одржан автомобил, без неисправности. Регуларно сервисиран.',
  'Прекрасен автомобил во одлично состојба. Нова гуми, ново масло.',
  'Автомобил во перфектна состојба, како нов. Одлична можност.',
  'Добро одржан автомобил со цела историја на сервисирање.',
  'Висококвалитетен автомобил, идеален за семејство.',
  'Спортски автомобил во одлично состојба. Одлични перформанси.',
  'Економичен и сигурен автомобил. Перфектен за град.',
  'Луксозен автомобил со сите опции. Премиум квалитет.',
  'Надежен автомобил за долги патувања. Одлична состојба.',
  'Модерен автомобил со најнови технологии. Одлична вредност.',
];

function getSeedImages(): string[] {
  const seedImagesDir = path.join(process.cwd(), 'uploads', 'seed-images');
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  if (!fs.existsSync(seedImagesDir)) {
    return [];
  }

  const files = fs.readdirSync(seedImagesDir);
  return files
    .filter((file) => {
      const filePath = path.join(seedImagesDir, file);
      const isFile = fs.statSync(filePath).isFile();
      const ext = path.extname(file).toLowerCase();
      return isFile && imageExtensions.includes(ext);
    })
    .map((file) => file);
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function generateVin(): string {
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
  let vin = '';
  for (let i = 0; i < 17; i++) {
    vin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return vin;
}

async function generateListingsForAllModels() {
  console.log('🚗 Генерирање на објави за сите модели...');

  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository(User);
  const listingRepo = AppDataSource.getRepository(Listing);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);
  const brandRepo = AppDataSource.getRepository(Brand);

  const users = await userRepo.find({
    where: { type: UserTypeEnum.Individual },
  });

  if (users.length === 0) {
    console.log('❌ Нема корисници. Ве молиме прво извршете го основниот seed скрипт.');
    return;
  }

  const brandsWithModels = await brandRepo.find({
    relations: ['models'],
  });

  const validBrands = brandsWithModels.filter((b) => b.models && b.models.length > 0);

  if (validBrands.length === 0) {
    console.log('❌ Нема достапни брендови со модели.');
    return;
  }

  const allModels: Array<{ brand: Brand; model: VehicleModel }> = [];
  for (const brand of validBrands) {
    for (const model of brand.models) {
      allModels.push({ brand, model });
    }
  }

  console.log(`📊 Најдени се ${allModels.length} модели за генерирање објави`);

  const fuelTypes = Object.values(FuelType);
  const transmissionTypes = Object.values(TransmissionType);
  const driveTypes = Object.values(DriveType);
  const currencies = Object.values(Currency);
  const currentYear = new Date().getFullYear();
  const bodyTypes = Object.values(BodyType);
  const conditionTypes = Object.values(ConditionType);
  const registrationTypes = Object.values(RegistrationType);

  const seedImages = getSeedImages();
  const baseUrl = process.env.API_URL || 'http://localhost:4000';

  if (seedImages.length === 0) {
    console.warn('⚠️  Нема слики во seed-images/. Користи се placeholder.');
  } else {
    console.log(`   📸 Најдени се ${seedImages.length} слики`);
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < allModels.length; i++) {
    const { brand, model } = allModels[i];

    const existingListing = await listingRepo
      .createQueryBuilder('listing')
      .innerJoin('listing.vehicle', 'vehicle')
      .where('vehicle.brand_id = :brandId', { brandId: brand.id })
      .andWhere('vehicle.model_id = :modelId', { modelId: model.id })
      .andWhere('listing.status = :status', { status: ListingStatusEnum.Active })
      .limit(1)
      .getOne();

    if (existingListing) {
      skippedCount++;
      if ((i + 1) % 50 === 0) {
        console.log(`   Проверено ${i + 1}/${allModels.length} модели...`);
      }
      continue;
    }

    const user = getRandomElement(users);
    const year = getRandomInt(2010, currentYear);
    const mileage = getRandomInt(0, 9999999);
    const engineDispl = getRandomFloat(0.99, 6.0, 2);
    const fuel = getRandomElement(fuelTypes);
    const transmission = getRandomElement(transmissionTypes);
    const driveType = getRandomElement(driveTypes);
    const bodyType = getRandomElement(bodyTypes);
    const color = getRandomElement(colors);
    const doors = getRandomElement([3, 4, 5]);

    const city = getRandomElement(cities);
    const price = getRandomInt(5000, 50000);
    const currency = getRandomElement(currencies);
    const description = getRandomElement(descriptions);
    const condition = getRandomElement(conditionTypes);
    const registrationType = getRandomElement(registrationTypes);
    const horsepower = getRandomInt(50, 500);
    const isRegistered = Math.random() > 0.3;
    const registrationExpiresAt = isRegistered
      ? (() => {
          const monthsAhead = getRandomInt(1, 24);
          const date = new Date();
          date.setMonth(date.getMonth() + monthsAhead);
          return date;
        })()
      : null;

    const imageCount = getRandomInt(2, 5);
    let images: string[];
    if (seedImages.length > 0) {
      const selectedImages = getRandomElements(seedImages, Math.min(imageCount, seedImages.length));
      images = selectedImages.map((img) => `${baseUrl}/uploads/seed-images/${img}`);
    } else {
      images = [`${baseUrl}/placeholder-car.jpg`];
    }

    const vin = generateVin();

    const vehicle = vehicleRepo.create({
      brand_id: brand.id,
      model_id: model.id,
      year,
      mileage_km: mileage,
      engine_displ_l: engineDispl,
      fuel,
      transmission,
      drive_type: driveType,
      body_type: bodyType,
      color,
      doors,
    });

    const savedVehicle = await vehicleRepo.save(vehicle);

    const transmissionStr =
      transmission === 'Automatic'
        ? 'Автоматска'
        : transmission === 'Manual'
          ? 'Мануелна'
          : transmission === 'CVT'
            ? 'Варијатор'
            : '';
    const baseTitle = `${brand.name} ${model.name} ${year}`;
    const title = transmissionStr ? `${baseTitle} (${transmissionStr})` : baseTitle;

    const listing = listingRepo.create({
      title,
      price,
      currency,
      city,
      status: ListingStatusEnum.Active,
      description,
      user_id: user.id,
      vehicle_id: savedVehicle.id,
      images,
      vin,
      urgent: Math.random() > 0.8,
      condition,
      registration_type: registrationType,
      horsepower,
      is_registered: isRegistered,
      registration_expires_at: registrationExpiresAt,
      last_updated_at: new Date(),
    });

    await listingRepo.save(listing);
    createdCount++;

    if ((i + 1) % 50 === 0 || i === allModels.length - 1) {
      console.log(
        `   Создадени ${createdCount} нови објави, прескокнати ${skippedCount} (${i + 1}/${allModels.length} модели)`,
      );
    }
  }

  console.log(`\n✅ Генерирањето е завршено!`);
  console.log(`   📊 Вкупно модели: ${allModels.length}`);
  console.log(`   ✅ Создадени нови објави: ${createdCount}`);
  console.log(`   ⏭️  Прескокнати (веќе постојат): ${skippedCount}`);
}

if (require.main === module) {
  generateListingsForAllModels()
    .then(() => {
      if (AppDataSource.isInitialized) {
        AppDataSource.destroy();
        console.log('🔌 Врската со базата е затворена');
      }
      console.log('✅ Скриптот е успешно завршен');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Грешка:', error);
      if (AppDataSource.isInitialized) {
        AppDataSource.destroy();
      }
      process.exit(1);
    });
}

export { generateListingsForAllModels };
