import 'reflect-metadata';

import * as fs from 'fs';
import * as path from 'path';

import { Brand } from '../../brands/entities/brand.entity';
import type { VehicleModel } from '../../brands/entities/vehicle-model.entity';
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
  'green',
  'brown',
  'orange',
  'violet',
  'beige',
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
  console.log('🚗 Generating listings for all models...');

  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository(User);
  const listingRepo = AppDataSource.getRepository(Listing);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);
  const brandRepo = AppDataSource.getRepository(Brand);

  const users = await userRepo.find({
    where: { type: UserTypeEnum.Individual },
  });

  if (users.length === 0) {
    console.log('❌ No users found. Please run the main seed script first.');
    return;
  }

  const brandsWithModels = await brandRepo.find({
    relations: ['models'],
  });

  const validBrands = brandsWithModels.filter((b) => b.models && b.models.length > 0);

  if (validBrands.length === 0) {
    console.log('❌ No brands with models available.');
    return;
  }

  const allModels: Array<{ brand: Brand; model: VehicleModel }> = [];
  for (const brand of validBrands) {
    for (const model of brand.models) {
      allModels.push({ brand, model });
    }
  }

  console.log(`📊 Found ${allModels.length} models for listing generation`);

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
    console.warn('⚠️  No images in seed-images/. Using placeholder.');
  } else {
    console.log(`   📸 Found ${seedImages.length} images`);
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
        console.log(`   Checked ${i + 1}/${allModels.length} models...`);
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

    const imageCount = getRandomInt(2, 5);
    let images: string[];
    if (seedImages.length > 0) {
      const selectedImages = getRandomElements(seedImages, Math.min(imageCount, seedImages.length));
      images = selectedImages.map(
        (img) => `${baseUrl}/api/upload/image/seed-images%2F${encodeURIComponent(img)}`,
      );
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

    const baseTitle = `${brand.name} ${model.name} ${year}`;
    let title = baseTitle;

    if (!model.vehicle_types?.includes('moto')) {
      const transmissionStr =
        transmission === 'Automatic'
          ? 'Automatic'
          : transmission === 'Manual'
            ? 'Manual'
            : transmission === 'CVT'
              ? 'CVT'
              : '';
      title = transmissionStr ? `${baseTitle} (${transmissionStr})` : baseTitle;
    }

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
      last_updated_at: new Date(),
    });

    await listingRepo.save(listing);
    createdCount++;

    if ((i + 1) % 50 === 0 || i === allModels.length - 1) {
      console.log(
        `   Created ${createdCount} new listings, skipped ${skippedCount} (${i + 1}/${allModels.length} models)`,
      );
    }
  }

  console.log(`\n✅ Generation completed!`);
  console.log(`   📊 Total models: ${allModels.length}`);
  console.log(`   ✅ Created new listings: ${createdCount}`);
  console.log(`   ⏭️  Skipped (already exist): ${skippedCount}`);
}

if (require.main === module) {
  generateListingsForAllModels()
    .then(async () => {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        console.log('🔌 Database connection closed');
      }
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('❌ Грешка:', error);
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
      process.exit(1);
    });
}

export { generateListingsForAllModels };
