import 'reflect-metadata';

import * as fs from 'fs';
import * as path from 'path';

import { Brand } from '../../brands/entities/brand.entity';
import type { BodyType } from '../../common/types';
import {
  BODY_TYPES_BY_VEHICLE_TYPE,
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
import { getPlatformConfig } from '../platforms';
import { checkEnvironment, checkPlatform } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);
checkPlatform(['md']);

const platformConfig = getPlatformConfig();
const { cities, descriptions } = platformConfig;

const colors = [
  'white',
  'black',
  'gray',
  'silver',
  'blue',
  'red',
  'yellow',
  'orange',
  'dark_blue',
  'dark_gray',
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
    .sort();
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min: number, max: number, decimals: number = 1): number {
  const value = Math.random() * (max - min) + min;
  return parseFloat(value.toFixed(decimals));
}

function generateVin(): string {
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
  let vin = '';
  for (let i = 0; i < 17; i++) {
    vin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return vin;
}

async function seedTrucks(activeCount: number = 50) {
  console.log(`🚛 Creating ${activeCount} active truck listings...`);

  await AppDataSource.initialize();

  const listingRepo = AppDataSource.getRepository(Listing);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);
  const brandRepo = AppDataSource.getRepository(Brand);
  const userRepo = AppDataSource.getRepository(User);

  const users = await userRepo.find({
    where: { type: UserTypeEnum.Individual },
  });

  if (users.length === 0) {
    throw new Error('No users found. Please run the main seed script first.');
  }

  const baseUrl = process.env.API_URL || 'http://localhost:4000';

  const brandsWithModels = await brandRepo.find({
    relations: ['models'],
  });

  const TRUCK_MODEL_KEYWORDS = [
    'Actros',
    'Arocs',
    'Antos',
    'Atego',
    'Axor',
    'Econic',
    'Unimog',
    'Zetros',
    'Sprinter',
    'Vito',
    'V-Class',
    'Transit',
    'Master',
    'Daily',
    'Crafter',
    'Hilux',
    'Tacoma',
    'Tundra',
    'Silverado',
    'Colorado',
    'Sierra',
    'Canyon',
    'Ram',
    'Promaster',
    'ProMaster',
    'D-Max',
    'L200',
    'Triton',
    'Navara',
    'Frontier',
    'Titan',
    'BT-50',
    'Amarok',
    'Ridgeline',
    'Cybertruck',
    'R1T',
    'FH',
    'FM',
    'FMX',
    'VNR',
    'VNL',
    'VHD',
    'N-Series',
    'F-Series',
    'Giga',
    'Forward',
    'Elf',
    'Hiace',
    'Proace',
  ];

  const validBrands = brandsWithModels.filter((b) => {
    if (!b.models || b.models.length === 0) return false;
    return b.models.some((m) => {
      if (m.vehicle_type !== 'truck') return false;
      const modelName = m.name.toLowerCase();
      return TRUCK_MODEL_KEYWORDS.some((keyword) => modelName.includes(keyword.toLowerCase()));
    });
  });

  if (validBrands.length === 0) {
    throw new Error('No truck brands with models available!');
  }

  const fuelTypes = [FuelType.Diesel, FuelType.Petrol];
  const transmissionTypes = [TransmissionType.Manual, TransmissionType.Automatic];
  const driveTypes = Object.values(DriveType);
  const currencies = Object.values(Currency);
  const currentYear = new Date().getFullYear();
  const truckBodyTypes = [...BODY_TYPES_BY_VEHICLE_TYPE.truck] as BodyType[];
  const conditionTypes = Object.values(ConditionType);
  const registrationTypes = Object.values(RegistrationType);

  const seedImages = getSeedImages();
  if (seedImages.length === 0) {
    console.warn('⚠️  No images found in seed-images/. Using placeholder.');
  } else {
    console.log(`   📸 Found ${seedImages.length} images in seed-images/`);
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < activeCount; i++) {
    const user = getRandomElement(users);
    const brand = getRandomElement(validBrands);
    const truckModels = brand.models.filter((m) => {
      if (m.vehicle_type !== 'truck') return false;
      const modelName = m.name.toLowerCase();
      return TRUCK_MODEL_KEYWORDS.some((keyword) => modelName.includes(keyword.toLowerCase()));
    });
    if (truckModels.length === 0) {
      skippedCount++;
      continue;
    }
    const model = getRandomElement(truckModels);

    const year = getRandomInt(2005, currentYear);
    const mileage = getRandomInt(50000, 800000);
    const engineDispl = getRandomFloat(3.0, 16.0, 1);
    const fuel = getRandomElement(fuelTypes);
    const transmission = getRandomElement(transmissionTypes);
    const driveType = getRandomElement(driveTypes);
    const bodyType = getRandomElement(truckBodyTypes);
    const color = getRandomElement(colors);

    const city = getRandomElement(cities);
    const price = getRandomInt(15000, 200000);
    const currency = getRandomElement(currencies);
    const description = getRandomElement(descriptions);
    const condition = getRandomElement(conditionTypes);
    const registrationType = getRandomElement(registrationTypes);
    const horsepower = getRandomInt(150, 800);
    const isRegistered = Math.random() > 0.2;
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
      images = selectedImages.map(
        (img) => `${baseUrl}/api/upload/image/seed-images%2F${encodeURIComponent(img)}`,
      );
    } else {
      images = [`${baseUrl}/placeholder-truck.jpg`];
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
      body_type: bodyType as BodyType,
      color,
    });

    const savedVehicle = await vehicleRepo.save(vehicle);

    const transmissionStr =
      transmission === 'Automatic'
        ? platformConfig.transmissionLabels.automatic
        : platformConfig.transmissionLabels.manual;
    const title = `${brand.name} ${model.name} ${year} ${transmissionStr}`;

    const now = new Date();
    const daysAgo = activeCount - i;
    const createdDate = new Date(now);
    createdDate.setDate(createdDate.getDate() - daysAgo);

    const listing = listingRepo.create({
      user_id: user.id,
      vehicle_id: savedVehicle.id,
      title,
      price,
      currency,
      city,
      description,
      status: ListingStatusEnum.Active,
      images,
      urgent: Math.random() > 0.9,
      is_new: year >= currentYear - 1,
      vin,
      condition,
      registration_type: registrationType,
      horsepower,
      power_kw: Math.round(horsepower * 0.735499),
      is_registered: isRegistered,
      registration_expires_at: registrationExpiresAt,
      equipment: [],
      created_at: createdDate,
      updated_at: createdDate,
    });

    await listingRepo.save(listing);
    createdCount++;

    if ((i + 1) % 10 === 0) {
      console.log(`   ✅ Created ${i + 1}/${activeCount} listings...`);
    }
  }

  console.log(`\n✅ Successfully created ${createdCount} truck listings`);
  if (skippedCount > 0) {
    console.log(`⚠️  Skipped ${skippedCount} listings (no truck models available)`);
  }
  await AppDataSource.destroy();
}

if (require.main === module) {
  seedTrucks(50)
    .then(() => {
      console.log('\n🎉 Truck seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error during truck seeding:', error);
      process.exit(1);
    });
}

export { seedTrucks };
