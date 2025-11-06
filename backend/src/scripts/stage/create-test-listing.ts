import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';

import { Brand } from '../../brands/entities/brand.entity';
import {
  BodyType,
  ConditionType,
  Currency,
  DriveType,
  FuelType,
  ListingStatus as ListingStatusEnum,
  RegistrationType,
  TransmissionType,
} from '../../common/types';
import { AppDataSource } from '../../data-source';
import { Listing } from '../../listings/entities/listing.entity';
import { Vehicle } from '../../listings/entities/vehicle.entity';
import { User } from '../../users/entities/user.entity';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);

function generateVin(): string {
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
  let vin = '';
  for (let i = 0; i < 17; i++) {
    vin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return vin;
}

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

async function createTestListing() {
  try {
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Connected to database');

    const userRepo = AppDataSource.getRepository(User);
    const listingRepo = AppDataSource.getRepository(Listing);
    const vehicleRepo = AppDataSource.getRepository(Vehicle);
    const brandRepo = AppDataSource.getRepository(Brand);

    const user = await userRepo.findOne({ where: { email: 'user1@test.com' } });
    if (!user) {
      throw new Error('User user1@test.com not found. Please run seed first.');
    }

    const brandsWithModels = await brandRepo.find({
      relations: ['models'],
    });

    const validBrands = brandsWithModels.filter((b) => b.models && b.models.length > 0);
    if (validBrands.length === 0) {
      throw new Error('No brands with models available!');
    }

    const brand = validBrands[0];
    const model = brand.models[0];
    const currentYear = new Date().getFullYear();

    const seedImages = getSeedImages();
    const baseUrl = process.env.API_URL || 'http://localhost:4000';

    if (seedImages.length === 0) {
      console.warn('⚠️  No images found in seed-images/. Using placeholder.');
    } else {
      console.log(`📸 Found ${seedImages.length} images - will use ALL of them`);
    }

    const images =
      seedImages.length > 0
        ? seedImages.map((img) => `${baseUrl}/uploads/seed-images/${img}`)
        : [`${baseUrl}/placeholder-car.jpg`];

    const vin = generateVin();

    const vehicle = vehicleRepo.create({
      brand_id: brand.id,
      model_id: model.id,
      year: currentYear - 2,
      mileage_km: 50000,
      engine_displ_l: 2.0,
      fuel: FuelType.Petrol,
      transmission: TransmissionType.Automatic,
      drive_type: DriveType.FWD,
      body_type: BodyType.Sedan,
      color: 'Синя',
      doors: 4,
    });

    const savedVehicle = await vehicleRepo.save(vehicle);

    const registrationExpiresAt = new Date();
    registrationExpiresAt.setMonth(registrationExpiresAt.getMonth() + 12);

    const listing = listingRepo.create({
      title: `${brand.name} ${model.name} ${currentYear - 2} - Тест со многу слики`,
      price: 25000,
      currency: Currency.EUR,
      city: 'Скопје',
      status: ListingStatusEnum.Active,
      description: `Тестово објавување со максимален број на слики (${images.length} слики) за проверка на перформанси и приказ на страницата за објавување.`,
      user_id: user.id,
      vehicle_id: savedVehicle.id,
      images,
      vin,
      urgent: true,
      condition: ConditionType.Undamaged,
      registration_type: RegistrationType.Local,
      horsepower: 200,
      is_registered: true,
      registration_expires_at: registrationExpiresAt,
      last_updated_at: new Date(),
    });

    const savedListing = await listingRepo.save(listing);

    console.log('\n✅ Test listing created successfully!');
    console.log(`\n📊 Details:`);
    console.log(`   ID: ${savedListing.id}`);
    console.log(`   Title: ${savedListing.title}`);
    console.log(`   Images: ${images.length}`);
    console.log(`   VIN: ${vin}`);
    console.log(`\n🔗 View at: http://localhost:3000/listings/${savedListing.id}`);
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

createTestListing()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
