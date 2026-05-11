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
const { cities, descriptions, truckDescriptions, motoDescriptions } = platformConfig;

const STAGE_ADMIN_PASSWORD = 'GGGgggTEST777';
const MAX_ACTIVE_LISTINGS_PER_USER = 50;
const MDL_PER_EUR = 19.5;

type VehicleType = 'car' | 'truck' | 'moto';
type BrandTier = 'budget' | 'mid' | 'premium' | 'luxury';
type WeightedOption<T> = {
  value: T;
  weight: number;
};

type FuelTypeValue = (typeof FuelType)[keyof typeof FuelType];
type TransmissionTypeValue = (typeof TransmissionType)[keyof typeof TransmissionType];
type DriveTypeValue = (typeof DriveType)[keyof typeof DriveType];
type ConditionTypeValue = (typeof ConditionType)[keyof typeof ConditionType];
type RegistrationTypeValue = (typeof RegistrationType)[keyof typeof RegistrationType];
type CurrencyValue = (typeof Currency)[keyof typeof Currency];

const colorWeights: Array<WeightedOption<string>> = [
  { value: 'black', weight: 16 },
  { value: 'white', weight: 15 },
  { value: 'gray', weight: 13 },
  { value: 'silver', weight: 12 },
  { value: 'metallic_black', weight: 8 },
  { value: 'metallic_white', weight: 8 },
  { value: 'metallic_gray', weight: 8 },
  { value: 'metallic_silver', weight: 8 },
  { value: 'blue', weight: 6 },
  { value: 'dark_blue', weight: 5 },
  { value: 'light_blue', weight: 3 },
  { value: 'red', weight: 5 },
  { value: 'metallic_blue', weight: 4 },
  { value: 'metallic_red', weight: 4 },
  { value: 'green', weight: 2 },
  { value: 'yellow', weight: 1 },
  { value: 'brown', weight: 2 },
  { value: 'orange', weight: 1 },
  { value: 'pink', weight: 1 },
  { value: 'violet', weight: 1 },
  { value: 'beige', weight: 2 },
  { value: 'gold', weight: 1 },
  { value: 'bronze', weight: 1 },
  { value: 'dark_gray', weight: 2 },
  { value: 'light_gray', weight: 2 },
  { value: 'pearl', weight: 2 },
  { value: 'metallic_pearl', weight: 1 },
  { value: 'matte_black', weight: 1 },
  { value: 'matte_gray', weight: 1 },
  { value: 'matte_blue', weight: 1 },
];

const brandTierGroups: Record<BrandTier, string[]> = {
  budget: [
    'DACIA',
    'LADA',
    'DAEWOO',
    'CHERY',
    'GEELY',
    'BYD',
    'FAW',
    'GREAT WALL',
    'SSANGYONG',
    'RENAULT SAMSUNG',
    'MG',
    'ZAZ',
  ],
  mid: [
    'TOYOTA',
    'VOLKSWAGEN',
    'HYUNDAI',
    'KIA',
    'SKODA',
    'FORD',
    'NISSAN',
    'RENAULT',
    'OPEL',
    'PEUGEOT',
    'CITROEN',
    'CITROËN',
    'FIAT',
    'SEAT',
    'HONDA',
    'MAZDA',
    'SUZUKI',
    'MITSUBISHI',
    'CHEVROLET',
  ],
  premium: [
    'BMW',
    'AUDI',
    'MERCEDES-BENZ',
    'MERCEDES',
    'VOLVO',
    'LEXUS',
    'INFINITI',
    'ACURA',
    'MINI',
    'JAGUAR',
    'ALFA ROMEO',
  ],
  luxury: [
    'PORSCHE',
    'BENTLEY',
    'MASERATI',
    'FERRARI',
    'LAMBORGHINI',
    'ROLLS-ROYCE',
    'ASTON MARTIN',
    'MCLAREN',
  ],
};

const yearRanges: Record<VehicleType, { min: number; maxOffset: number }> = {
  car: { min: 2010, maxOffset: 0 },
  truck: { min: 2008, maxOffset: 0 },
  moto: { min: 2012, maxOffset: 0 },
};

const annualMileageRanges: Record<VehicleType, Record<BrandTier, { min: number; max: number }>> = {
  car: {
    budget: { min: 12000, max: 28000 },
    mid: { min: 10000, max: 25000 },
    premium: { min: 8000, max: 22000 },
    luxury: { min: 6000, max: 18000 },
  },
  truck: {
    budget: { min: 25000, max: 70000 },
    mid: { min: 22000, max: 65000 },
    premium: { min: 20000, max: 55000 },
    luxury: { min: 18000, max: 45000 },
  },
  moto: {
    budget: { min: 3000, max: 10000 },
    mid: { min: 2500, max: 9000 },
    premium: { min: 2000, max: 7000 },
    luxury: { min: 1500, max: 5000 },
  },
};

const displacementRanges: Record<VehicleType, Record<BrandTier, { min: number; max: number }>> = {
  car: {
    budget: { min: 1.0, max: 2.0 },
    mid: { min: 1.2, max: 2.8 },
    premium: { min: 1.6, max: 4.2 },
    luxury: { min: 2.0, max: 6.5 },
  },
  truck: {
    budget: { min: 2.2, max: 4.5 },
    mid: { min: 3.0, max: 6.5 },
    premium: { min: 3.5, max: 8.0 },
    luxury: { min: 5.0, max: 12.0 },
  },
  moto: {
    budget: { min: 0.125, max: 0.5 },
    mid: { min: 0.3, max: 0.9 },
    premium: { min: 0.6, max: 1.3 },
    luxury: { min: 1.0, max: 2.3 },
  },
};

const horsepowerRanges: Record<VehicleType, { min: number; max: number }> = {
  car: { min: 60, max: 650 },
  truck: { min: 100, max: 900 },
  moto: { min: 12, max: 280 },
};

const hpPerLiterRanges: Record<BrandTier, { min: number; max: number }> = {
  budget: { min: 45, max: 70 },
  mid: { min: 55, max: 85 },
  premium: { min: 70, max: 115 },
  luxury: { min: 90, max: 150 },
};

const priceRangesEur: Record<VehicleType, Record<BrandTier, { min: number; max: number }>> = {
  car: {
    budget: { min: 3500, max: 15000 },
    mid: { min: 6000, max: 32000 },
    premium: { min: 12000, max: 70000 },
    luxury: { min: 30000, max: 250000 },
  },
  truck: {
    budget: { min: 9000, max: 35000 },
    mid: { min: 15000, max: 65000 },
    premium: { min: 25000, max: 100000 },
    luxury: { min: 50000, max: 220000 },
  },
  moto: {
    budget: { min: 1200, max: 6000 },
    mid: { min: 3000, max: 12000 },
    premium: { min: 7000, max: 25000 },
    luxury: { min: 15000, max: 70000 },
  },
};

const fuelWeights: Record<VehicleType, Array<WeightedOption<FuelTypeValue>>> = {
  car: [
    { value: FuelType.Petrol, weight: 40 },
    { value: FuelType.Diesel, weight: 27 },
    { value: FuelType.Hybrid, weight: 12 },
    { value: FuelType.LPG, weight: 8 },
    { value: FuelType.Electric, weight: 7 },
    { value: FuelType.MHEV, weight: 4 },
    { value: FuelType.PHEV, weight: 2 },
  ],
  truck: [
    { value: FuelType.Diesel, weight: 78 },
    { value: FuelType.Petrol, weight: 14 },
    { value: FuelType.LPG, weight: 6 },
    { value: FuelType.Hybrid, weight: 2 },
  ],
  moto: [
    { value: FuelType.Petrol, weight: 88 },
    { value: FuelType.Electric, weight: 8 },
    { value: FuelType.Hybrid, weight: 3 },
    { value: FuelType.LPG, weight: 1 },
  ],
};

const transmissionWeights: Record<VehicleType, Array<WeightedOption<TransmissionTypeValue>>> = {
  car: [
    { value: TransmissionType.Automatic, weight: 42 },
    { value: TransmissionType.Manual, weight: 44 },
    { value: TransmissionType.CVT, weight: 10 },
    { value: TransmissionType.Robot, weight: 4 },
  ],
  truck: [
    { value: TransmissionType.Manual, weight: 62 },
    { value: TransmissionType.Automatic, weight: 29 },
    { value: TransmissionType.Robot, weight: 9 },
  ],
  moto: [
    { value: TransmissionType.Manual, weight: 90 },
    { value: TransmissionType.Automatic, weight: 8 },
    { value: TransmissionType.CVT, weight: 2 },
  ],
};

const driveWeights: Record<VehicleType, Array<WeightedOption<DriveTypeValue>>> = {
  car: [
    { value: DriveType.FWD, weight: 52 },
    { value: DriveType.RWD, weight: 20 },
    { value: DriveType.AWD, weight: 28 },
  ],
  truck: [
    { value: DriveType.RWD, weight: 70 },
    { value: DriveType.AWD, weight: 30 },
  ],
  moto: [{ value: DriveType.RWD, weight: 100 }],
};

const conditionWeights: Array<WeightedOption<ConditionTypeValue>> = [
  { value: ConditionType.Undamaged, weight: 78 },
  { value: ConditionType.Damaged, weight: 16 },
  { value: ConditionType.ForParts, weight: 6 },
];

const registrationWeights: Array<WeightedOption<RegistrationTypeValue>> = [
  { value: RegistrationType.Local, weight: 48 },
  { value: RegistrationType.Foreign, weight: 14 },
  { value: RegistrationType.Cleared, weight: 30 },
  { value: RegistrationType.NotCleared, weight: 8 },
];

const currencyWeights: Array<WeightedOption<CurrencyValue>> = [
  { value: Currency.EUR, weight: 85 },
  { value: Currency.MDL, weight: 15 },
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

function pickWeighted<T>(options: Array<WeightedOption<T>>): T {
  const total = options.reduce((sum, option) => sum + option.weight, 0);
  if (total <= 0) {
    throw new Error('Weighted options total must be greater than zero');
  }

  const roll = Math.random() * total;
  let current = 0;

  for (const option of options) {
    current += option.weight;
    if (roll <= current) {
      return option.value;
    }
  }

  return options[options.length - 1].value;
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function normalizeBrandName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function getBrandTier(brandName: string): BrandTier {
  const normalized = normalizeBrandName(brandName);

  const foundTier = (Object.keys(brandTierGroups) as BrandTier[]).find((tier) =>
    brandTierGroups[tier].includes(normalized),
  );

  return foundTier ?? 'mid';
}

function getVehicleDescriptions(vehicleType: VehicleType): string[] {
  if (vehicleType === 'truck' && truckDescriptions.length > 0) {
    return truckDescriptions;
  }

  if (vehicleType === 'moto' && motoDescriptions.length > 0) {
    return motoDescriptions;
  }

  return descriptions;
}

function getDoorsByBodyType(bodyType: BodyType): number | undefined {
  if (
    bodyType === 'Sedan' ||
    bodyType === 'Wagon' ||
    bodyType === 'SUV' ||
    bodyType === 'Minivan' ||
    bodyType === 'Van' ||
    bodyType === 'Truck' ||
    bodyType === 'Bus' ||
    bodyType === 'SemiTruck' ||
    bodyType === 'Tractor' ||
    bodyType === 'SpecialEquipment'
  ) {
    return getRandomElement([4, 5]);
  }

  if (bodyType === 'Coupe' || bodyType === 'Convertible') {
    return getRandomElement([2, 3]);
  }

  if (bodyType === 'Hatchback') {
    return getRandomElement([3, 5]);
  }

  return undefined;
}

function generateYear(vehicleType: VehicleType, currentYear: number): number {
  const yearRange = yearRanges[vehicleType];
  return getRandomInt(yearRange.min, currentYear - yearRange.maxOffset);
}

function generateMileage(
  vehicleType: VehicleType,
  tier: BrandTier,
  year: number,
  currentYear: number,
): number {
  const age = Math.max(0, currentYear - year);
  const annualRange = annualMileageRanges[vehicleType][tier];
  const annualMileage = getRandomInt(annualRange.min, annualRange.max);
  const mileageNoise = getRandomFloat(0.8, 1.2, 2);
  const estimated = age * annualMileage * mileageNoise;

  const floorByType: Record<VehicleType, number> = {
    car: age <= 1 ? 500 : 1500,
    truck: age <= 1 ? 1000 : 4000,
    moto: age <= 1 ? 300 : 800,
  };

  const capByType: Record<VehicleType, number> = {
    car: 380000,
    truck: 900000,
    moto: 160000,
  };

  return Math.round(clamp(estimated, floorByType[vehicleType], capByType[vehicleType]));
}

function generateEngineDisplacement(
  vehicleType: VehicleType,
  tier: BrandTier,
  fuel: FuelTypeValue,
): number {
  if (fuel === FuelType.Electric) {
    return 0;
  }

  const range = displacementRanges[vehicleType][tier];
  const decimals = vehicleType === 'moto' ? 3 : 1;
  return getRandomFloat(range.min, range.max, decimals);
}

function generateHorsepower(
  vehicleType: VehicleType,
  tier: BrandTier,
  fuel: FuelTypeValue,
  engineDispl: number,
): number {
  if (fuel === FuelType.Electric) {
    const electricRanges: Record<VehicleType, { min: number; max: number }> = {
      car: { min: 110, max: 480 },
      truck: { min: 180, max: 650 },
      moto: { min: 35, max: 210 },
    };

    return getRandomInt(electricRanges[vehicleType].min, electricRanges[vehicleType].max);
  }

  const hpPerLiter = hpPerLiterRanges[tier];
  const multiplierByType: Record<VehicleType, number> = {
    car: 1,
    truck: 0.92,
    moto: 1.12,
  };

  const hpRaw =
    engineDispl *
    getRandomFloat(hpPerLiter.min, hpPerLiter.max, 2) *
    multiplierByType[vehicleType] *
    getRandomFloat(0.9, 1.12, 2);

  return Math.round(
    clamp(hpRaw, horsepowerRanges[vehicleType].min, horsepowerRanges[vehicleType].max),
  );
}

function calculatePrice(
  vehicleType: VehicleType,
  tier: BrandTier,
  year: number,
  mileage: number,
  condition: ConditionTypeValue,
  currency: CurrencyValue,
  currentYear: number,
): number {
  const baseRange = priceRangesEur[vehicleType][tier];
  const basePriceEur = getRandomInt(baseRange.min, baseRange.max);

  const age = Math.max(0, currentYear - year);
  const ageFactor = Math.max(0.26, Math.pow(0.93, age));

  const mileageReference: Record<VehicleType, number> = {
    car: 350000,
    truck: 800000,
    moto: 150000,
  };

  const mileagePenalty = Math.min(0.35, (mileage / mileageReference[vehicleType]) * 0.35);

  const conditionFactor: Record<ConditionTypeValue, number> = {
    [ConditionType.Undamaged]: 1,
    [ConditionType.Damaged]: 0.74,
    [ConditionType.ForParts]: 0.43,
  };

  const eurPrice = basePriceEur * ageFactor * (1 - mileagePenalty) * conditionFactor[condition];

  const floorEurByType: Record<VehicleType, number> = {
    car: 800,
    truck: 2500,
    moto: 400,
  };

  const normalizedEur = Math.max(floorEurByType[vehicleType], eurPrice);

  if (currency === Currency.MDL) {
    return roundToNearest(normalizedEur * MDL_PER_EUR, 100);
  }

  return roundToNearest(normalizedEur, 50);
}

function generateVin(): string {
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
  let vin = '';
  for (let i = 0; i < 17; i++) {
    vin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return vin;
}

function getUserForListing(users: User[], globalIndex: number): User {
  return users[globalIndex % users.length];
}

function validateListingsLimitPerUser(usersCount: number, activeCount: number): void {
  const maxAllowed = usersCount * MAX_ACTIVE_LISTINGS_PER_USER;
  if (activeCount > maxAllowed) {
    throw new Error(
      `Cannot create ${activeCount} active listings with ${usersCount} users and max ${MAX_ACTIVE_LISTINGS_PER_USER} listings per user`,
    );
  }
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
    const hashedPassword = await bcrypt.hash(STAGE_ADMIN_PASSWORD, 10);
    admin = userRepo.create({
      email: 'admin@admin.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      phone: `${platformConfig.phonePrefix}70111111`,
      phoneVerified: true,
      preferredLocale: 'ro',
      type: UserTypeEnum.Admin,
      active: true,
    });
    admin = await userRepo.save(admin);
    console.log('✅ Created admin user');
  } else {
    admin.type = UserTypeEnum.Admin;
    admin.active = true;
    admin.phone = `${platformConfig.phonePrefix}70111111`;
    admin.phoneVerified = true;
    admin.preferredLocale = 'ro';
    admin.password = await bcrypt.hash(STAGE_ADMIN_PASSWORD, 10);
    admin = await userRepo.save(admin);
    console.log('✅ Updated admin user');
  }

  return admin;
}

async function seedListingsByType(
  users: User[],
  vehicleType: VehicleType,
  activeCount: number,
  withHistoryCount: number = 0,
  startUserOffset: number = 0,
) {
  const vehicleTypeLabels: Record<VehicleType, string> = {
    car: '🚗',
    truck: '🚛',
    moto: '🏍️',
  };
  const vehicleTypeNames: Record<VehicleType, string> = {
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
    return b.models.some((m) => m.vehicle_types?.includes(vehicleType));
  });

  if (validBrands.length === 0) {
    console.warn(`⚠️  No brands with ${vehicleType} models available, skipping...`);
    return;
  }

  const currentYear = new Date().getFullYear();
  const bodyTypes = [...BODY_TYPES_BY_VEHICLE_TYPE[vehicleType]] as BodyType[];
  const seedImages = getSeedImages();
  const vehicleDescriptions = getVehicleDescriptions(vehicleType);
  const vinsWithHistory: Array<{
    vin: string;
    listing: Listing;
    vehicle: Vehicle;
    brand: Brand;
    model: VehicleModel;
    year: number;
  }> = [];

  for (let i = 0; i < activeCount; i++) {
    const user = getUserForListing(users, startUserOffset + i);
    const brand = getRandomElement(validBrands);
    const typeModels = brand.models.filter((m) => m.vehicle_types?.includes(vehicleType));
    if (typeModels.length === 0) {
      console.warn(`⚠️  Brand ${brand.name} has no ${vehicleType} models, skipping...`);
      continue;
    }
    const model = getRandomElement(typeModels);
    const tier = getBrandTier(brand.name);

    const year = generateYear(vehicleType, currentYear);
    const mileage = generateMileage(vehicleType, tier, year, currentYear);
    const fuel = pickWeighted(fuelWeights[vehicleType]);
    const engineDispl = generateEngineDisplacement(vehicleType, tier, fuel);
    const horsepower = generateHorsepower(vehicleType, tier, fuel, engineDispl);
    const transmission = pickWeighted(transmissionWeights[vehicleType]);
    const driveType = pickWeighted(driveWeights[vehicleType]);
    const bodyType = getRandomElement(bodyTypes);
    const color = pickWeighted(colorWeights);
    const doors = vehicleType === 'moto' ? undefined : getDoorsByBodyType(bodyType);

    const city = getRandomElement(cities);
    const condition = pickWeighted(conditionWeights);
    const registrationType = pickWeighted(registrationWeights);
    const currency = pickWeighted(currencyWeights);
    const price = calculatePrice(
      vehicleType,
      tier,
      year,
      mileage,
      condition,
      currency,
      currentYear,
    );
    const description = getRandomElement(vehicleDescriptions);

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
      transmission === TransmissionType.Automatic
        ? platformConfig.transmissionLabels.automatic
        : transmission === TransmissionType.Manual
          ? platformConfig.transmissionLabels.manual
          : transmission === TransmissionType.CVT
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
      urgent: Math.random() < 0.08,
      condition,
      registration_type: registrationType,
      horsepower,
      last_updated_at: new Date(),
    });

    const savedListing = await listingRepo.save(listing);

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
  validateListingsLimitPerUser(users.length, activeCount);

  const carCount = Math.floor(activeCount * 0.7);
  const truckCount = Math.floor(activeCount * 0.2);
  const motoCount = activeCount - carCount - truckCount;

  const carHistoryCount = Math.round(withHistoryCount * 0.7);
  const truckHistoryCount = Math.round(withHistoryCount * 0.2);
  const motoHistoryCount = withHistoryCount - carHistoryCount - truckHistoryCount;

  let offset = 0;

  await seedListingsByType(users, 'car', carCount, carHistoryCount, offset);
  offset += carCount;

  await seedListingsByType(users, 'truck', truckCount, truckHistoryCount, offset);
  offset += truckCount;

  await seedListingsByType(users, 'moto', motoCount, motoHistoryCount, offset);

  const minPerUser = Math.floor(activeCount / users.length);
  const maxPerUser = Math.ceil(activeCount / users.length);

  console.log('\n📊 Active listing distribution:');
  console.log(`   - Users: ${users.length}`);
  console.log(`   - Total active listings: ${activeCount}`);
  console.log(
    `   - Expected per user: ${minPerUser}-${maxPerUser} (cap ${MAX_ACTIVE_LISTINGS_PER_USER})`,
  );
}

async function createVinHistory(
  vin: string,
  baseVehicle: Vehicle,
  brand: Brand,
  model: VehicleModel,
  users: User[],
  baseYear: number,
  vehicleType: VehicleType = 'car',
) {
  const listingRepo = AppDataSource.getRepository(Listing);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);

  const historyCount = getRandomInt(2, 5);
  const baseUrl = process.env.API_URL || 'http://localhost:4000';
  const bodyTypes = [...BODY_TYPES_BY_VEHICLE_TYPE[vehicleType]] as BodyType[];
  const seedImages = getSeedImages();
  const vehicleDescriptions = getVehicleDescriptions(vehicleType);
  const currentMileage = Math.max(0, baseVehicle.mileage_km || 0);

  console.log(
    `   📜 Creating ${historyCount} historical listings for VIN ${vin.substring(0, 8)}...`,
  );

  const mileageDropRanges: Record<VehicleType, { min: number; max: number }> = {
    car: { min: 8000, max: 22000 },
    truck: { min: 15000, max: 45000 },
    moto: { min: 3000, max: 10000 },
  };

  const totalMileageDrop =
    historyCount > 0
      ? getRandomInt(
          mileageDropRanges[vehicleType].min * historyCount,
          mileageDropRanges[vehicleType].max * historyCount,
        )
      : 0;

  const oldestMileage = Math.max(0, currentMileage - totalMileageDrop);
  const tier = getBrandTier(brand.name);
  const baseYearSafe = Math.max(baseYear, 1990);
  let previousHistoryMileage = oldestMileage;

  for (let i = 0; i < historyCount; i++) {
    const nonAdminUsers = users.filter((u) => u.type !== UserTypeEnum.Admin);
    const historyUser = getRandomElement(nonAdminUsers.length > 0 ? nonAdminUsers : users);
    const historyYear = Math.max(1990, baseYearSafe - historyCount + i);
    const progress = (i + 1) / (historyCount + 1);

    const targetMileage = oldestMileage + (currentMileage - oldestMileage) * progress;
    const noisyMileage = Math.round(targetMileage + getRandomInt(-2500, 2500));
    const historyMileage = clamp(Math.max(previousHistoryMileage, noisyMileage), 0, currentMileage);
    previousHistoryMileage = historyMileage;

    const fuel = pickWeighted(fuelWeights[vehicleType]);
    const transmission = pickWeighted(transmissionWeights[vehicleType]);
    const driveType = pickWeighted(driveWeights[vehicleType]);
    const bodyType = getRandomElement(bodyTypes);
    const color = pickWeighted(colorWeights);
    const doors = vehicleType === 'moto' ? undefined : getDoorsByBodyType(bodyType);
    const city = getRandomElement(cities);
    const condition = pickWeighted(conditionWeights);
    const registrationType = pickWeighted(registrationWeights);
    const currency = pickWeighted(currencyWeights);
    const engineDispl = generateEngineDisplacement(vehicleType, tier, fuel);
    const horsepower = generateHorsepower(vehicleType, tier, fuel, engineDispl);
    const price = calculatePrice(
      vehicleType,
      tier,
      historyYear,
      historyMileage,
      condition,
      currency,
      new Date().getFullYear(),
    );
    const description = getRandomElement(vehicleDescriptions);

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
      mileage_km: historyMileage,
      engine_displ_l: engineDispl,
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
      transmission === TransmissionType.Automatic
        ? platformConfig.transmissionLabels.automatic
        : transmission === TransmissionType.Manual
          ? platformConfig.transmissionLabels.manual
          : transmission === TransmissionType.CVT
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
    console.log(`     Password: ${STAGE_ADMIN_PASSWORD}`);
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
