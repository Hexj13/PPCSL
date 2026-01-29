import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import {
  BodyType,
  Currency,
  FuelType,
  ListingStatus as ListingStatusEnum,
  TransmissionType,
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

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

const cities = platformConfig.cities.slice(0, 8);
const colors = ['white', 'black', 'gray', 'silver', 'blue', 'red'];
const descriptions = platformConfig.descriptions.slice(0, 4);

const existingImages = [
  '51cdb605-1b5f-429d-a29d-65919195341b.jpg',
  '53c102ff-ee5d-4dbb-a30c-aebd63364759.jpg',
  '667466c5-a5b8-4dde-9d1e-3d72dd3c7fd3.jpeg',
  '8b35bce3-c831-4ec0-93b4-9fa4d4e3a1ce.jpg',
];

async function seedVinTestData() {
  console.log('🔧 Creating test data with VIN...');

  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository(User);
  const listingRepo = AppDataSource.getRepository(Listing);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);
  const brandRepo = AppDataSource.getRepository(Brand);

  const user = await userRepo.findOne({ where: { email: 'user@test.com' } });
  if (!user) {
    console.log('❌ Test user does not exist. Please run the main seed script first.');
    return;
  }

  const brands = await brandRepo.find({ relations: ['models'] });
  const validBrands = brands.filter((b) => b.models && b.models.length > 0);
  if (validBrands.length === 0) {
    console.log('❌ No brands available. Please run the main seed script first.');
    return;
  }

  const fuelTypes = Object.values(FuelType);
  const transmissionTypes = Object.values(TransmissionType);
  const bodyTypes = Object.values(BodyType);
  const currencies = Object.values(Currency);
  const baseUrl = process.env.API_URL || 'http://localhost:4000';
  const currentYear = new Date().getFullYear();

  const vinGroups = [
    { vin: '1HGBH41JXMN109186', count: 4 },
    { vin: 'WBAWL73529P123456', count: 3 },
    { vin: 'JM7TB1824J0123456', count: 3 },
  ];

  let listingNumber = 0;

  for (const vinGroup of vinGroups) {
    const { vin, count } = vinGroup;
    const brand = getRandomElement(validBrands);
    const model = getRandomElement(brand.models);

    console.log(`\n📦 Creating ${count} listings with VIN: ${vin}`);

    for (let i = 0; i < count; i++) {
      listingNumber++;
      const year = getRandomInt(2015, currentYear - 1);
      const mileage = getRandomInt(10000, 150000);
      const engineDispl = getRandomFloat(1.6, 3.0);
      const fuel = getRandomElement(fuelTypes);
      const transmission = getRandomElement(transmissionTypes);
      const bodyType = getRandomElement(bodyTypes);
      const color = getRandomElement(colors);
      const doors = getRandomElement([4, 5]);

      const city = getRandomElement(cities);
      const price = getRandomInt(8000, 35000);
      const currency = getRandomElement(currencies);
      const description = getRandomElement(descriptions);

      const imageCount = getRandomInt(2, 3);
      const selectedImages = existingImages.slice(0, imageCount);
      const images = selectedImages.map((img) => `${baseUrl}/uploads/${img}`);

      const vehicle = vehicleRepo.create({
        brand_id: brand.id,
        model_id: model.id,
        year,
        mileage_km: mileage + i * 5000,
        engine_displ_l: engineDispl,
        fuel,
        transmission,
        body_type: bodyType,
        color,
        doors,
      });

      const savedVehicle = await vehicleRepo.save(vehicle);

      const transmissionStr =
        transmission === 'Automatic'
          ? platformConfig.transmissionLabels.automatic
          : transmission === 'Manual'
            ? platformConfig.transmissionLabels.manual
            : platformConfig.transmissionLabels.cvt;
      const title = `${brand.name} ${model.name} ${year} ${transmissionStr}`;

      const now = new Date();
      const daysAgo = count - i;
      const createdDate = new Date(now);
      createdDate.setDate(createdDate.getDate() - daysAgo * 30);

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
        last_updated_at: createdDate,
        created_at: createdDate,
        updated_at: createdDate,
      });

      await listingRepo.save(listing);

      console.log(`   ${listingNumber}. ${title} - Active - ${formatDate(createdDate)}`);
    }
  }

  console.log(`\n✅ Created ${listingNumber} test listings with VIN!\n`);
  console.log('📋 Summary:');
  console.log('   - 1HGBH41JXMN109186: 4 listings (all active)');
  console.log('   - WBAWL73529P123456: 3 listings (all active)');
  console.log('   - JM7TB1824J0123456: 3 listings (all active)');
  console.log(
    '\n💡 To test, open a listing and check if other listings with same VIN are displayed.',
  );
}

seedVinTestData()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });
