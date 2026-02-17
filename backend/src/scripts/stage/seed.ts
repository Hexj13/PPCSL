import 'reflect-metadata';

import * as fs from 'fs';
import * as path from 'path';

import * as bcrypt from 'bcrypt';

import { Brand } from '../../brands/entities/brand.entity';
import type { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import type { BodyType } from '../../common/types';
import {
  ConditionType,
  Currency,
  DriveType,
  FuelType,
  ListingStatus as ListingStatusEnum,
  RegistrationType,
  TransmissionType,
  UserType as UserTypeEnum,
  BODY_TYPES_BY_VEHICLE_TYPE,
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
  'black',
  'white',
  'gray',
  'silver',
  'blue',
  'red',
  'green',
  'yellow',
  'brown',
  'orange',
  'pink',
  'violet',
  'beige',
  'gold',
  'bronze',
  'dark_blue',
  'light_blue',
  'dark_gray',
  'light_gray',
  'metallic_black',
  'metallic_white',
  'metallic_gray',
  'metallic_silver',
  'metallic_blue',
  'metallic_red',
  'pearl',
  'metallic_pearl',
  'matte_black',
  'matte_gray',
  'matte_blue',
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

async function createUsers(count: number = 3): Promise<User[]> {
  console.log(`👥 Creating ${count} users...`);

  const userRepo = AppDataSource.getRepository(User);
  const users: User[] = [];

  for (let i = 1; i <= count; i++) {
    const email = `user${i}@test.com`;
    let user = await userRepo.findOne({ where: { email } });

    if (!user) {
      const hashedPassword = await bcrypt.hash('test123', 10);
      const isBusiness = i === 2;
      user = userRepo.create({
        email,
        password: hashedPassword,
        firstName: `${platformConfig.testUserFirstName}${i}`,
        lastName: platformConfig.testUserLastName,
        phone: `${platformConfig.phonePrefix}7012345${i}`,
        type: isBusiness ? UserTypeEnum.Business : UserTypeEnum.Individual,
        companyName: isBusiness ? `${platformConfig.testCompanyName} ${i}` : null,
        viber: i % 2 === 0,
        whatsapp: i % 2 === 1,
        telegram: i % 3 === 0,
        active: true,
      });
      user = await userRepo.save(user);
      console.log(`   ✅ Created user ${i}: ${email} (${user.type})`);
    } else {
      user.active = true;
      user = await userRepo.save(user);
      console.log(`   ✅ User ${i} already exists: ${email}`);
    }
    users.push(user);
  }

  return users;
}

async function getOrCreateAdminUser() {
  console.log('👑 Creating/updating admin user...');

  const userRepo = AppDataSource.getRepository(User);
  let admin = await userRepo.findOne({ where: { email: 'admin@admin.com' } });

  if (!admin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    admin = userRepo.create({
      email: 'admin@admin.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      phone: `${platformConfig.phonePrefix}70111111`,
      type: UserTypeEnum.Admin,
      active: true,
    });
    admin = await userRepo.save(admin);
    console.log('✅ Created admin user');
  } else {
    admin.type = UserTypeEnum.Admin;
    admin.active = true;
    admin.phone = `${platformConfig.phonePrefix}70111111`;
    admin = await userRepo.save(admin);
    console.log('✅ Updated admin user');
  }

  return admin;
}

async function seedListingsByType(
  users: User[],
  vehicleType: 'car' | 'truck' | 'moto',
  activeCount: number,
  withHistoryCount: number = 0,
) {
  const vehicleTypeLabels = {
    car: '🚗',
    truck: '🚛',
    moto: '🏍️',
  };
  const vehicleTypeNames = {
    car: 'легковых автомобилей',
    truck: 'коммерческого транспорта',
    moto: 'мототранспорта',
  };

  console.log(
    `${vehicleTypeLabels[vehicleType]} Creating ${activeCount} active listings (${vehicleTypeNames[vehicleType]})...`,
  );

  const listingRepo = AppDataSource.getRepository(Listing);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);
  const brandRepo = AppDataSource.getRepository(Brand);

  const baseUrl = process.env.API_URL || 'http://localhost:4000';

  const brandsWithModels = await brandRepo.find({
    relations: ['models'],
  });

  const validBrands = brandsWithModels.filter((b) => {
    if (!b.models || b.models.length === 0) return false;
    return b.models.some((m) => m.vehicle_type === vehicleType);
  });

  if (validBrands.length === 0) {
    console.warn(`⚠️  No brands with ${vehicleType} models available, skipping...`);
    return;
  }

  const fuelTypes = Object.values(FuelType);
  const transmissionTypes = Object.values(TransmissionType);
  const driveTypes = Object.values(DriveType);
  const currencies = Object.values(Currency);
  const currentYear = new Date().getFullYear();
  const bodyTypes = [...BODY_TYPES_BY_VEHICLE_TYPE[vehicleType]] as BodyType[];
  const conditionTypes = Object.values(ConditionType);
  const registrationTypes = Object.values(RegistrationType);

  const seedImages = getSeedImages();

  const activeListings: Listing[] = [];
  const vinsWithHistory: Array<{
    vin: string;
    listing: Listing;
    vehicle: Vehicle;
    brand: Brand;
    model: VehicleModel;
    year: number;
  }> = [];

  const priceRanges = {
    car: { min: 5000, max: 50000 },
    truck: { min: 15000, max: 150000 },
    moto: { min: 2000, max: 25000 },
  };

  const mileageRanges = {
    car: { min: 0, max: 300000 },
    truck: { min: 0, max: 500000 },
    moto: { min: 0, max: 100000 },
  };

  const engineDisplRanges = {
    car: { min: 1.0, max: 6.0 },
    truck: { min: 2.0, max: 15.0 },
    moto: { min: 0.1, max: 2.0 },
  };

  const horsepowerRanges = {
    car: { min: 50, max: 500 },
    truck: { min: 100, max: 800 },
    moto: { min: 10, max: 200 },
  };

  const yearRanges = {
    car: { min: 2010, max: currentYear },
    truck: { min: 2005, max: currentYear },
    moto: { min: 2010, max: currentYear },
  };

  for (let i = 0; i < activeCount; i++) {
    const user = getRandomElement(users);
    const brand = getRandomElement(validBrands);
    const typeModels = brand.models.filter((m) => m.vehicle_type === vehicleType);
    if (typeModels.length === 0) {
      console.warn(`⚠️  Brand ${brand.name} has no ${vehicleType} models, skipping...`);
      continue;
    }
    const model = getRandomElement(typeModels);

    const year = getRandomInt(yearRanges[vehicleType].min, yearRanges[vehicleType].max);
    const mileage = getRandomInt(mileageRanges[vehicleType].min, mileageRanges[vehicleType].max);
    const engineDispl = getRandomFloat(
      engineDisplRanges[vehicleType].min,
      engineDisplRanges[vehicleType].max,
      1,
    );
    const fuel = getRandomElement(fuelTypes);
    const transmission = getRandomElement(transmissionTypes);
    const driveType = vehicleType === 'moto' ? DriveType.RWD : getRandomElement(driveTypes);
    const bodyType = getRandomElement(bodyTypes);
    const color = getRandomElement(colors);
    const doors = vehicleType === 'moto' ? undefined : getRandomElement([3, 4, 5]);

    const city = getRandomElement(cities);
    const price = getRandomInt(priceRanges[vehicleType].min, priceRanges[vehicleType].max);
    const currency = getRandomElement(currencies);
    const description = getRandomElement(descriptions);
    const condition = getRandomElement(conditionTypes);
    const registrationType = getRandomElement(registrationTypes);
    const horsepower = getRandomInt(
      horsepowerRanges[vehicleType].min,
      horsepowerRanges[vehicleType].max,
    );
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
      images = selectedImages.map(
        (img) => `${baseUrl}/api/upload/image/seed-images%2F${encodeURIComponent(img)}`,
      );
    } else {
      const placeholder =
        vehicleType === 'moto'
          ? 'placeholder-moto.jpg'
          : vehicleType === 'truck'
            ? 'placeholder-truck.jpg'
            : 'placeholder-car.jpg';
      images = [`${baseUrl}/${placeholder}`];
    }

    const vin = generateVin();

    const vehicleData: Partial<Vehicle> & {
      brand_id: string;
      model_id: string;
      year: number;
      body_type: BodyType;
    } = {
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
    };
    if (doors !== undefined) {
      vehicleData.doors = doors;
    }

    const vehicle = vehicleRepo.create(vehicleData) as unknown as Vehicle;

    const savedVehicle = await vehicleRepo.save(vehicle);

    const transmissionStr =
      transmission === 'Automatic'
        ? platformConfig.transmissionLabels.automatic
        : transmission === 'Manual'
          ? platformConfig.transmissionLabels.manual
          : transmission === 'CVT'
            ? platformConfig.transmissionLabels.cvt
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
      urgent: i % 5 === 0,
      condition,
      registration_type: registrationType,
      horsepower,
      is_registered: isRegistered,
      registration_expires_at: registrationExpiresAt,
      last_updated_at: new Date(),
    });

    const savedListing = await listingRepo.save(listing);
    activeListings.push(savedListing);

    if ((i + 1) % 10 === 0) {
      console.log(`   Created ${i + 1}/${activeCount} active listings...`);
    }

    if (i < withHistoryCount) {
      vinsWithHistory.push({
        vin,
        listing: savedListing,
        vehicle: savedVehicle,
        brand,
        model,
        year,
      });
    }
  }

  console.log(`✅ Created all ${activeCount} active listings (${vehicleTypeNames[vehicleType]})!`);

  if (vinsWithHistory.length > 0) {
    console.log(`\n📜 Creating VIN history for ${vinsWithHistory.length} listings...`);
    for (const vinData of vinsWithHistory) {
      await createVinHistory(
        vinData.vin,
        vinData.vehicle,
        vinData.brand,
        vinData.model,
        users,
        vinData.year,
        vehicleType,
      );
    }
    console.log(`✅ Created VIN history!`);
  }
}

async function seedListings(
  users: User[],
  activeCount: number = 100,
  withHistoryCount: number = 10,
) {
  const carCount = Math.floor(activeCount * 0.7);
  const truckCount = Math.floor(activeCount * 0.2);
  const motoCount = activeCount - carCount - truckCount;

  await seedListingsByType(users, 'car', carCount, Math.floor(withHistoryCount * 0.7));
  await seedListingsByType(users, 'truck', truckCount, Math.floor(withHistoryCount * 0.2));
  await seedListingsByType(users, 'moto', motoCount, Math.floor(withHistoryCount * 0.1));
}

async function createVinHistory(
  vin: string,
  baseVehicle: Vehicle,
  brand: Brand,
  model: VehicleModel,
  users: User[],
  baseYear: number,
  vehicleType: 'car' | 'truck' | 'moto' = 'car',
) {
  const listingRepo = AppDataSource.getRepository(Listing);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);

  const historyCount = getRandomInt(2, 5);
  const baseUrl = process.env.API_URL || 'http://localhost:4000';
  const fuelTypes = Object.values(FuelType);
  const transmissionTypes = Object.values(TransmissionType);
  const driveTypes = Object.values(DriveType);
  const currencies = Object.values(Currency);
  const bodyTypes = [...BODY_TYPES_BY_VEHICLE_TYPE[vehicleType]] as BodyType[];
  const conditionTypes = Object.values(ConditionType);
  const registrationTypes = Object.values(RegistrationType);

  const seedImages = getSeedImages();

  console.log(
    `   📜 Creating ${historyCount} historical listings for VIN ${vin.substring(0, 8)}...`,
  );

  let previousMileage = baseVehicle.mileage_km || 0;
  const startYear = baseYear - historyCount;

  const mileageIncreaseRanges = {
    car: { min: 10000, max: 30000 },
    truck: { min: 20000, max: 50000 },
    moto: { min: 5000, max: 15000 },
  };

  const priceRanges = {
    car: { min: 3000, max: 40000 },
    truck: { min: 10000, max: 120000 },
    moto: { min: 1000, max: 20000 },
  };

  const horsepowerRanges = {
    car: { min: 50, max: 500 },
    truck: { min: 100, max: 800 },
    moto: { min: 10, max: 200 },
  };

  for (let i = 0; i < historyCount; i++) {
    const historyUser = getRandomElement(users.filter((u) => u.type !== UserTypeEnum.Admin));
    const historyYear = startYear + i;
    const mileageIncrease = getRandomInt(
      mileageIncreaseRanges[vehicleType].min,
      mileageIncreaseRanges[vehicleType].max,
    );
    const historyMileage = previousMileage - mileageIncrease;
    previousMileage = historyMileage;

    const fuel = getRandomElement(fuelTypes);
    const transmission = getRandomElement(transmissionTypes);
    const driveType = vehicleType === 'moto' ? DriveType.RWD : getRandomElement(driveTypes);
    const bodyType = getRandomElement(bodyTypes);
    const color = getRandomElement(colors);
    const doors = vehicleType === 'moto' ? undefined : getRandomElement([3, 4, 5]);
    const city = getRandomElement(cities);
    const price = getRandomInt(priceRanges[vehicleType].min, priceRanges[vehicleType].max);
    const currency = getRandomElement(currencies);
    const description = getRandomElement(descriptions);
    const condition = getRandomElement(conditionTypes);
    const registrationType = getRandomElement(registrationTypes);
    const horsepower = getRandomInt(
      horsepowerRanges[vehicleType].min,
      horsepowerRanges[vehicleType].max,
    );
    const isRegistered = Math.random() > 0.3;
    const registrationExpiresAt = isRegistered
      ? (() => {
          const monthsAhead = getRandomInt(1, 24);
          const date = new Date();
          date.setMonth(date.getMonth() + monthsAhead);
          return date;
        })()
      : null;

    const imageCount = getRandomInt(2, 4);
    let images: string[];
    if (seedImages.length > 0) {
      const selectedImages = getRandomElements(seedImages, Math.min(imageCount, seedImages.length));
      images = selectedImages.map(
        (img) => `${baseUrl}/api/upload/image/seed-images%2F${encodeURIComponent(img)}`,
      );
    } else {
      const placeholder =
        vehicleType === 'moto'
          ? 'placeholder-moto.jpg'
          : vehicleType === 'truck'
            ? 'placeholder-truck.jpg'
            : 'placeholder-car.jpg';
      images = [`${baseUrl}/${placeholder}`];
    }

    const historyVehicleData: Partial<Vehicle> & {
      brand_id: string;
      model_id: string;
      year: number;
      body_type: BodyType;
    } = {
      brand_id: brand.id,
      model_id: model.id,
      year: historyYear,
      mileage_km: Math.max(0, historyMileage),
      engine_displ_l: baseVehicle.engine_displ_l,
      fuel,
      transmission,
      drive_type: driveType,
      body_type: bodyType,
      color,
    };
    if (doors !== undefined) {
      historyVehicleData.doors = doors;
    }

    const historyVehicle = vehicleRepo.create(historyVehicleData) as unknown as Vehicle;

    const savedHistoryVehicle = await vehicleRepo.save(historyVehicle);

    const transmissionStr =
      transmission === 'Automatic'
        ? platformConfig.transmissionLabels.automatic
        : transmission === 'Manual'
          ? platformConfig.transmissionLabels.manual
          : transmission === 'CVT'
            ? platformConfig.transmissionLabels.cvt
            : '';
    const baseTitle = `${brand.name} ${model.name} ${historyYear}`;
    const title = transmissionStr ? `${baseTitle} (${transmissionStr})` : baseTitle;

    const historyDate = new Date();
    historyDate.setDate(historyDate.getDate() - (historyCount - i) * 90 - getRandomInt(0, 30));

    const historyListing = listingRepo.create({
      title,
      price,
      currency,
      city,
      status: ListingStatusEnum.Closed,
      description,
      user_id: historyUser.id,
      vehicle_id: savedHistoryVehicle.id,
      images,
      vin,
      condition,
      registration_type: registrationType,
      horsepower,
      is_registered: isRegistered,
      registration_expires_at: registrationExpiresAt,
      last_updated_at: historyDate,
      created_at: historyDate,
      updated_at: historyDate,
    });

    await listingRepo.save(historyListing);
  }
}

export async function seed() {
  try {
    if (!AppDataSource.isInitialized) {
      console.log('🔌 Connecting to database...');
      await AppDataSource.initialize();
      console.log('✅ Connected to database');
    }

    const admin = await getOrCreateAdminUser();
    const regularUsers = await createUsers(3);
    const allUsers = [admin, ...regularUsers];

    console.log(`\n📊 Total ${allUsers.length} users:`);
    console.log(`   - 1 admin`);
    console.log(`   - ${regularUsers.length} regular users\n`);

    await seedListings(allUsers, 150, 15);

    console.log('\n🎉 All data successfully seeded!');
    console.log('\n📝 Test credentials:');
    console.log('   Admin:');
    console.log('     Email: admin@admin.com');
    console.log('     Password: admin123');
    console.log('   Users:');
    for (let i = 1; i <= regularUsers.length; i++) {
      console.log(`     Email: user${i}@test.com`);
      console.log(`     Password: test123`);
    }
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

if (require.main === module) {
  seed()
    .then(async () => {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        console.log('🔌 Database connection closed');
      }
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('❌ Error:', error);
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
      process.exit(1);
    });
}
