import 'reflect-metadata';
import * as bcrypt from 'bcrypt';

import { Brand } from '../brands/entities/brand.entity';
import { VehicleModel } from '../brands/entities/vehicle-model.entity';
import {
  BodyType,
  Currency,
  FuelType,
  ListingStatus as ListingStatusEnum,
  TransmissionType,
  UserType as UserTypeEnum,
} from '../common/types';
import { AppDataSource } from '../data-source';
import { Listing } from '../listings/entities/listing.entity';
import { Vehicle } from '../listings/entities/vehicle.entity';
import { User } from '../users/entities/user.entity';

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
  'Бела',
  'Црна',
  'Сива',
  'Сребрена',
  'Сиња',
  'Црвена',
  'Жолта',
  'Зелена',
  'Кафена',
  'Портокалова',
  'Виолетова',
  'Беж',
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

const existingImages = [
  '51cdb605-1b5f-429d-a29d-65919195341b.jpg',
  '53c102ff-ee5d-4dbb-a30c-aebd63364759.jpg',
  '667466c5-a5b8-4dde-9d1e-3d72dd3c7fd3.jpeg',
  '8b35bce3-c831-4ec0-93b4-9fa4d4e3a1ce.jpg',
  '99f40493-e6ad-4bfe-9d44-f5a2a9c0907b.jpeg',
  'b0fbad8e-6106-4690-9d51-4b52e80c9acb.jpg',
  'beed18ab-2e6d-4812-ad08-0d92e2e82721.jpg',
  'c1cd5895-8349-4286-92c2-74ee11a876e8.jpeg',
  'e034e8c1-3689-4cc4-ba9c-b0209827ad64.jpg',
  'efc90a60-b978-476c-b1e0-66c33af13d02.jpg',
];

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

async function seedBrandsAndModels() {
  console.log('🌱 Seeding brands and models...');

  const brandsData = [
    { name: 'Toyota', order: 1 },
    { name: 'Volkswagen', order: 2 },
    { name: 'BMW', order: 3 },
    { name: 'Mercedes-Benz', order: 4 },
    { name: 'Audi', order: 5 },
    { name: 'Ford', order: 6 },
    { name: 'Renault', order: 7 },
    { name: 'Peugeot', order: 8 },
    { name: 'Opel', order: 9 },
    { name: 'Škoda', order: 10 },
    { name: 'Hyundai', order: 11 },
    { name: 'Kia', order: 12 },
    { name: 'Nissan', order: 13 },
    { name: 'Mazda', order: 14 },
    { name: 'Honda', order: 15 },
    { name: 'Volvo', order: 16 },
    { name: 'Fiat', order: 17 },
    { name: 'Seat', order: 18 },
    { name: 'Citroën', order: 19 },
    { name: 'Dacia', order: 20 },
  ];

  const modelsData: Record<string, string[]> = {
    Toyota: [
      'Corolla',
      'Camry',
      'RAV4',
      'Yaris',
      'Prius',
      'Land Cruiser',
      'Highlander',
      'C-HR',
      'Auris',
      'Avensis',
    ],
    Volkswagen: [
      'Golf',
      'Passat',
      'Polo',
      'Tiguan',
      'Jetta',
      'Touran',
      'Touareg',
      'T-Cross',
      'Arteon',
      'T-Roc',
    ],
    BMW: [
      '3 Series',
      '5 Series',
      'X3',
      'X5',
      '1 Series',
      '7 Series',
      'X1',
      '4 Series',
      'X6',
      '2 Series',
    ],
    'Mercedes-Benz': [
      'C-Class',
      'E-Class',
      'S-Class',
      'GLE',
      'GLC',
      'A-Class',
      'B-Class',
      'GLA',
      'CLA',
      'G-Class',
    ],
    Audi: ['A4', 'A6', 'Q5', 'Q7', 'A3', 'A5', 'Q3', 'TT', 'A8', 'Q8'],
    Ford: [
      'Focus',
      'Fiesta',
      'Mondeo',
      'Kuga',
      'Explorer',
      'Mustang',
      'Edge',
      'Transit',
      'Ranger',
      'EcoSport',
    ],
    Renault: [
      'Clio',
      'Megane',
      'Captur',
      'Kadjar',
      'Scenic',
      'Laguna',
      'Talisman',
      'Koleos',
      'Zoe',
      'Twingo',
    ],
    Peugeot: [
      '308',
      '208',
      '3008',
      '5008',
      '2008',
      '508',
      'Partner',
      'Expert',
      'Rifter',
      'Traveller',
    ],
    Opel: [
      'Corsa',
      'Astra',
      'Insignia',
      'Crossland X',
      'Grandland X',
      'Mokka',
      'Vivaro',
      'Combo',
      'Zafira',
      'Adam',
    ],
    Škoda: [
      'Octavia',
      'Superb',
      'Kodiaq',
      'Kamiq',
      'Karoq',
      'Fabia',
      'Scala',
      'Rapid',
      'Citigo',
      'Enyaq',
    ],
    Hyundai: [
      'i30',
      'i20',
      'Tucson',
      'Santa Fe',
      'Elantra',
      'Kona',
      'Ioniq',
      'Sonata',
      'ix35',
      'Accent',
    ],
    Kia: [
      'Sportage',
      'Ceed',
      'Rio',
      'Sorento',
      'Picanto',
      'Optima',
      'Niro',
      'Stonic',
      'Soul',
      'Stinger',
    ],
    Nissan: [
      'Qashqai',
      'Micra',
      'Juke',
      'X-Trail',
      'Leaf',
      'Sentra',
      'Altima',
      'Pathfinder',
      'Note',
      'Navara',
    ],
    Mazda: ['3', '6', 'CX-5', 'CX-3', 'CX-30', 'MX-5', '2', 'CX-9', 'CX-8', 'CX-60'],
    Honda: [
      'Civic',
      'Accord',
      'CR-V',
      'HR-V',
      'Jazz',
      'Pilot',
      'Fit',
      'Insight',
      'Passport',
      'Ridgeline',
    ],
    Volvo: ['XC60', 'XC90', 'V40', 'V60', 'V90', 'XC40', 'S60', 'S90', 'XC70', 'V70'],
    Fiat: ['500', 'Punto', 'Tipo', 'Panda', '500X', '500L', 'Bravo', 'Doblo', 'Scudo', 'Fullback'],
    Seat: [
      'Ibiza',
      'Leon',
      'Ateca',
      'Arona',
      'Tarraco',
      'Alhambra',
      'Altea',
      'Toledo',
      'Exeo',
      'Formentor',
    ],
    Citroën: [
      'C3',
      'C4',
      'C5',
      'Berlingo',
      'Cactus',
      'Picasso',
      'Jumper',
      'Spacetourer',
      'Ami',
      'C4 Cactus',
    ],
    Dacia: [
      'Sandero',
      'Duster',
      'Logan',
      'Lodgy',
      'Dokker',
      'Spring',
      'Jogger',
      'Sandero Stepway',
      'Duster Adventure',
      'Lodgy Stepway',
    ],
  };

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  const brands: Brand[] = [];

  for (const brandData of brandsData) {
    let brand = await brandRepo.findOne({ where: { name: brandData.name } });
    if (!brand) {
      brand = brandRepo.create({ name: brandData.name, order: brandData.order });
      brand = await brandRepo.save(brand);
    } else {
      brand.order = brandData.order;
      brand = await brandRepo.save(brand);
    }
    brands.push(brand);
  }

  for (const brand of brands) {
    const models = modelsData[brand.name] || [];
    for (let i = 0; i < models.length; i++) {
      const modelName = models[i];
      let model = await modelRepo.findOne({
        where: { name: modelName, brand_id: brand.id },
      });
      if (!model) {
        model = modelRepo.create({
          name: modelName,
          brand_id: brand.id,
          order: i + 1,
        });
        await modelRepo.save(model);
      } else {
        model.order = i + 1;
        await modelRepo.save(model);
      }
    }
  }

  console.log(`✅ Created ${brands.length} brands and models`);
  return brands;
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
        firstName: `Тест${i}`,
        lastName: 'Корисник',
        phone: `+3897012345${i}`,
        type: isBusiness ? UserTypeEnum.Business : UserTypeEnum.Individual,
        companyName: isBusiness ? `Тест Компанија ${i}` : null,
        viber: i % 2 === 0,
        whatsapp: i % 2 === 1,
        telegram: i % 3 === 0,
      });
      user = await userRepo.save(user);
      console.log(`   ✅ Created user ${i}: ${email} (${user.type})`);
    } else {
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
      phone: '+38970111111',
      type: UserTypeEnum.Admin,
    });
    admin = await userRepo.save(admin);
    console.log('✅ Created admin user');
  } else {
    admin.type = UserTypeEnum.Admin;
    admin = await userRepo.save(admin);
    console.log('✅ Updated admin user');
  }

  return admin;
}

async function seedListings(
  users: User[],
  brands: Brand[],
  activeCount: number = 100,
  withHistoryCount: number = 10,
) {
  console.log(`🚗 Creating ${activeCount} active listings...`);

  const listingRepo = AppDataSource.getRepository(Listing);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);
  const brandRepo = AppDataSource.getRepository(Brand);

  const baseUrl = process.env.API_URL || 'http://localhost:4000';

  const brandsWithModels = await brandRepo.find({
    relations: ['models'],
  });

  const validBrands = brandsWithModels.filter((b) => b.models && b.models.length > 0);

  if (validBrands.length === 0) {
    throw new Error('No brands with models available!');
  }

  const fuelTypes = Object.values(FuelType);
  const transmissionTypes = Object.values(TransmissionType);
  const currencies = Object.values(Currency);
  const currentYear = new Date().getFullYear();
  const bodyTypes = Object.values(BodyType);

  const activeListings: Listing[] = [];

  for (let i = 0; i < activeCount; i++) {
    const user = getRandomElement(users);
    const brand = getRandomElement(validBrands);
    const model = getRandomElement(brand.models);

    const year = getRandomInt(2010, currentYear);
    const mileage = getRandomInt(5000, 200000);
    const engineDispl = getRandomFloat(1.0, 5.0, 1);
    const fuel = getRandomElement(fuelTypes);
    const transmission = getRandomElement(transmissionTypes);
    const bodyType = getRandomElement(bodyTypes);
    const color = getRandomElement(colors);
    const doors = getRandomElement([3, 4, 5]);

    const city = getRandomElement(cities);
    const price = getRandomInt(5000, 50000);
    const currency = getRandomElement(currencies);
    const description = getRandomElement(descriptions);

    const imageCount = getRandomInt(2, 5);
    const selectedImages = getRandomElements(existingImages, imageCount);
    const images = selectedImages.map((img) => `${baseUrl}/uploads/${img}`);

    const vin = i < withHistoryCount ? generateVin() : undefined;

    const vehicle = vehicleRepo.create({
      brand_id: brand.id,
      model_id: model.id,
      year,
      mileage_km: mileage,
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
      urgent: i % 5 === 0,
      last_updated_at: new Date(),
    });

    const savedListing = await listingRepo.save(listing);
    activeListings.push(savedListing);

    if ((i + 1) % 10 === 0) {
      console.log(`   Created ${i + 1}/${activeCount} active listings...`);
    }

    if (i < withHistoryCount && vin) {
      await createVinHistory(vin, savedVehicle, brand, model, users, year, i);
    }
  }

  console.log(`✅ Created all ${activeCount} active listings!`);
}

async function createVinHistory(
  vin: string,
  baseVehicle: Vehicle,
  brand: Brand,
  model: VehicleModel,
  users: User[],
  baseYear: number,
  _listingIndex: number,
) {
  const listingRepo = AppDataSource.getRepository(Listing);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);

  const historyCount = getRandomInt(2, 5);
  const baseUrl = process.env.API_URL || 'http://localhost:4000';
  const fuelTypes = Object.values(FuelType);
  const transmissionTypes = Object.values(TransmissionType);
  const currencies = Object.values(Currency);
  const bodyTypes = Object.values(BodyType);

  console.log(
    `   📜 Creating ${historyCount} historical listings for VIN ${vin.substring(0, 8)}...`,
  );

  let previousMileage = baseVehicle.mileage_km || 0;
  const startYear = baseYear - historyCount;

  for (let i = 0; i < historyCount; i++) {
    const historyUser = getRandomElement(users.filter((u) => u.type !== UserTypeEnum.Admin));
    const historyYear = startYear + i;
    const mileageIncrease = getRandomInt(10000, 30000);
    const historyMileage = previousMileage - mileageIncrease;
    previousMileage = historyMileage;

    const fuel = getRandomElement(fuelTypes);
    const transmission = getRandomElement(transmissionTypes);
    const bodyType = getRandomElement(bodyTypes);
    const color = getRandomElement(colors);
    const doors = getRandomElement([3, 4, 5]);
    const city = getRandomElement(cities);
    const price = getRandomInt(3000, 40000);
    const currency = getRandomElement(currencies);
    const description = getRandomElement(descriptions);

    const imageCount = getRandomInt(2, 4);
    const selectedImages = getRandomElements(existingImages, imageCount);
    const images = selectedImages.map((img) => `${baseUrl}/uploads/${img}`);

    const historyVehicle = vehicleRepo.create({
      brand_id: brand.id,
      model_id: model.id,
      year: historyYear,
      mileage_km: Math.max(0, historyMileage),
      engine_displ_l: baseVehicle.engine_displ_l,
      fuel,
      transmission,
      body_type: bodyType,
      color,
      doors,
    });

    const savedHistoryVehicle = await vehicleRepo.save(historyVehicle);

    const transmissionStr =
      transmission === 'Automatic'
        ? 'Автоматска'
        : transmission === 'Manual'
          ? 'Мануелна'
          : transmission === 'CVT'
            ? 'Варијатор'
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
      last_updated_at: historyDate,
      created_at: historyDate,
      updated_at: historyDate,
    });

    await listingRepo.save(historyListing);
  }
}

async function seed() {
  try {
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Connected to database');

    const brands = await seedBrandsAndModels();
    const admin = await getOrCreateAdminUser();
    const regularUsers = await createUsers(3);
    const allUsers = [admin, ...regularUsers];

    console.log(`\n📊 Total ${allUsers.length} users:`);
    console.log(`   - 1 admin`);
    console.log(`   - ${regularUsers.length} regular users\n`);

    await seedListings(allUsers, brands, 100, 10);

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
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

seed()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
