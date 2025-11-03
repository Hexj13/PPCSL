import 'reflect-metadata';
import { AppDataSource } from './data-source';
import { User } from './users/entities/user.entity';
import { Listing } from './listings/entities/listing.entity';
import { Currency, ListingStatus as ListingStatusEnum } from './common/types';
import { Vehicle } from './listings/entities/vehicle.entity';
import { FuelType, TransmissionType, BodyType } from './common/types';
import { Brand } from './brands/entities/brand.entity';

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
  return date.toLocaleDateString('mk-MK', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

const cities = ['Скопје', 'Битола', 'Прилеп', 'Куманово', 'Охрид', 'Струга', 'Велес', 'Штип'];
const colors = ['Бела', 'Црна', 'Сива', 'Сребрена', 'Сина', 'Црвена'];
const descriptions = [
  'Отлично одржан автомобил, без неисправности.',
  'Прекрасен автомобил во одлично состојба.',
  'Автомобил во перфектна состојба, како нов.',
  'Добро одржан автомобил со цела историја на сервисирање.',
];

const existingImages = [
  '51cdb605-1b5f-429d-a29d-65919195341b.jpg',
  '53c102ff-ee5d-4dbb-a30c-aebd63364759.jpg',
  '667466c5-a5b8-4dde-9d1e-3d72dd3c7fd3.jpeg',
  '8b35bce3-c831-4ec0-93b4-9fa4d4e3a1ce.jpg',
];

async function seedVinTestData() {
  console.log('🔧 Креирање тест податоци со VIN...');

  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository(User);
  const listingRepo = AppDataSource.getRepository(Listing);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);
  const brandRepo = AppDataSource.getRepository(Brand);

  const user = await userRepo.findOne({ where: { email: 'user@test.com' } });
  if (!user) {
    console.log('❌ Тест корисникот не постои. Ве молиме прво извршете го основниот seed скрипт.');
    return;
  }

  const brands = await brandRepo.find({ relations: ['models'] });
  const validBrands = brands.filter((b) => b.models && b.models.length > 0);
  if (validBrands.length === 0) {
    console.log('❌ Нема достапни брендови. Ве молиме прво извршете го основниот seed скрипт.');
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

    console.log(`\n📦 Креирање ${count} објави со VIN: ${vin}`);

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
          ? 'Автоматска'
          : transmission === 'Manual'
            ? 'Мануелна'
            : 'Варијатор';
      const title = `${brand.name} ${model.name} ${year} ${transmissionStr}`;

      const now = new Date();
      const daysAgo = count - i;
      const createdDate = new Date(now);
      createdDate.setDate(createdDate.getDate() - daysAgo * 30);

      const status = i === 0 ? ListingStatusEnum.Active : ListingStatusEnum.Closed;

      const updatedDate = status === ListingStatusEnum.Closed ? new Date(createdDate) : new Date();

      if (status === ListingStatusEnum.Closed) {
        updatedDate.setDate(updatedDate.getDate() + getRandomInt(15, 90));
      }

      const listing = listingRepo.create({
        title,
        price,
        currency,
        city,
        status,
        description,
        user_id: user.id,
        vehicle_id: savedVehicle.id,
        images,
        vin,
        last_updated_at: createdDate,
        created_at: createdDate,
        updated_at: updatedDate,
      });

      await listingRepo.save(listing);

      console.log(
        `   ${listingNumber}. ${title} - ${status === ListingStatusEnum.Closed ? 'Затворено' : 'Активно'} - ${formatDate(updatedDate)}`,
      );
    }
  }

  console.log(`\n✅ Создадени ${listingNumber} тест објави со VIN!\n`);
  console.log('📋 Резюме:');
  console.log('   - 1HGBH41JXMN109186: 4 објави (1 активна, 3 затворени)');
  console.log('   - WBAWL73529P123456: 3 објави (1 активна, 2 затворени)');
  console.log('   - JM7TB1824J0123456: 3 објави (1 активна, 2 затворени)');
  console.log(
    '\n💡 За да тестирате, отворете некоја активна објава и проверете дали се прикажуваат претходните затворени објави.',
  );
}

seedVinTestData()
  .then(() => {
    console.log('✅ Скриптот заврши успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error);
    process.exit(1);
  })
  .finally(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });
