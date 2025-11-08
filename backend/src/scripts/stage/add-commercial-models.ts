import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';

const COMMERCIAL_MODELS: Record<string, string[]> = {
  Citroën: [
    'Nemo',
    'Jumpy',
    'Dispatch',
    'Berlingo Van',
    'Berlingo Multispace',
    'Jumper Van',
    'Jumper Combi',
    'SpaceTourer',
    'e-Berlingo',
    'e-Jumpy',
    'e-Jumper',
    'e-SpaceTourer',
  ],
  Peugeot: [
    'Bipper',
    'Boxer',
    'Boxer Van',
    'Boxer Combi',
    'Partner Van',
    'Partner Tepee',
    'Expert Van',
    'Expert Combi',
    'Expert Tepee',
    'Rifter',
    'Traveller',
    'e-Partner',
    'e-Expert',
    'e-Boxer',
  ],
  Renault: [
    'Kangoo Van',
    'Kangoo Express',
    'Kangoo Maxi',
    'Trafic Van',
    'Trafic Passenger',
    'Master Van',
    'Master LCV',
    'Master Bus',
    'Master Chassis Cab',
    'Kangoo Z.E.',
    'Master Z.E.',
    'Trafic E-Tech',
    'Kangoo Rapid',
    'Master Rapid',
  ],
  Fiat: [
    'Doblo',
    'Doblo Cargo',
    'Doblo Combi',
    'Scudo',
    'Talento',
    'Ducato Van',
    'Ducato Combi',
    'Ducato Chassis Cab',
    'Fiorino',
    'Qubo',
    'e-Ducato',
    'e-Doblo',
  ],
  Volkswagen: [
    'Caddy',
    'Caddy Maxi',
    'Caddy Life',
    'Transporter',
    'Transporter Kombi',
    'Transporter Caravelle',
    'Transporter California',
    'Crafter',
    'Crafter Van',
    'Crafter Kombi',
    'Crafter Chassis Cab',
    'Amarok',
    'e-Crafter',
    'ID. Buzz Cargo',
  ],
  'Mercedes-Benz': [
    'Citan',
    'Citan Tourer',
    'Vito',
    'Vito Tourer',
    'Vito Mixto',
    'Sprinter',
    'Sprinter Van',
    'Sprinter Kombi',
    'Sprinter Chassis Cab',
    'Metris',
    'eCitan',
    'eVito',
    'eSprinter',
  ],
  Opel: [
    'Combo',
    'Combo Cargo',
    'Combo Life',
    'Vivaro',
    'Vivaro Van',
    'Vivaro Life',
    'Movano',
    'Movano Van',
    'Movano Combi',
    'Movano Chassis Cab',
    'Combo-e',
    'Vivaro-e',
    'Movano-e',
  ],
  Ford: [
    'Transit Courier',
    'Transit Connect',
    'Transit Custom',
    'Transit',
    'Transit Van',
    'Transit Kombi',
    'Transit Chassis Cab',
    'Transit Bus',
    'Ranger',
    'E-Transit',
    'E-Transit Custom',
    'Tourneo Connect',
    'Tourneo Custom',
    'Tourneo Courier',
  ],
  Toyota: [
    'Proace',
    'Proace City',
    'Proace Van',
    'Proace Verso',
    'Hiace',
    'Hiace Van',
    'Hiace Commuter',
    'Hiace GL Grandia',
    'Hiace Super Grandia',
    'Hilux',
    'Tacoma',
    'Tundra',
  ],
  Nissan: [
    'NV200',
    'NV300',
    'NV400',
    'e-NV200',
    'Navara',
    'Titan',
    'Frontier',
    'NV200 Van',
    'NV300 Van',
    'NV400 Van',
  ],
  Škoda: [
    'Kodiaq',
    'Karoq',
    'Kamiq',
    'Octavia',
    'Superb',
    'Fabia',
    'Scala',
    'Rapid',
    'Citigo',
    'Enyaq',
  ],
  SEAT: [
    'Ibiza',
    'Leon',
    'Arona',
    'Ateca',
    'Tarraco',
    'Alhambra',
    'Altea',
    'Toledo',
    'Exeo',
    'Formentor',
  ],
  Hyundai: [
    'i10',
    'i20',
    'i30',
    'Bayon',
    'Kona',
    'Tucson',
    'Ioniq 5',
    'Ioniq 6',
    'H-1',
    'Staria',
    'Santa Cruz',
  ],
  Kia: [
    'Picanto',
    'Rio',
    'Ceed',
    'Niro',
    'Sportage',
    'Sorento',
    'EV6',
    'EV9',
    'Carnival',
    'Mohave',
  ],
  Mazda: ['Mazda2', 'Mazda3', 'Mazda6', 'CX-30', 'CX-5', 'MX-30', 'CX-60', 'BT-50', 'B-Series'],
  Honda: ['Civic', 'Accord', 'CR-V', 'HR-V', 'Jazz', 'e:Ny1', 'Ridgeline'],
  Isuzu: ['D-Max', 'MU-X', 'Elf', 'Forward', 'Giga', 'N-Series', 'F-Series'],
  GMC: ['Sierra', 'Sierra 1500', 'Sierra 2500', 'Sierra 3500', 'Canyon', 'Savana'],
  Ram: ['1500', '2500', '3500', 'ProMaster', 'ProMaster City'],
  Mitsubishi: ['L200', 'L300', 'L400', 'Triton', 'Canter', 'Fuso'],
  Suzuki: ['Carry', 'Every', 'Super Carry', 'APV', 'Eeco'],
  Daihatsu: ['Hijet', 'Atrai', 'Naked', 'Storia', 'Opti'],
  Dacia: ['Dokker', 'Dokker Van', 'Logan MCV', 'Logan Van', 'Logan Pick-Up'],
};

async function addCommercialModels() {
  console.log('🚚 Започнување на додавање на комерцијални и полу-комерцијални модели...\n');

  await AppDataSource.initialize();
  console.log('✅ Поврзано со базата на податоци\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  let totalAdded = 0;
  let totalUpdated = 0;
  let brandsProcessed = 0;
  let brandsNotFound = 0;

  for (const [brandName, models] of Object.entries(COMMERCIAL_MODELS)) {
    const brand = await brandRepo.findOne({ where: { name: brandName } });

    if (!brand) {
      brandsNotFound++;
      console.log(`⚠️  Бренд "${brandName}" не е пронајден, прескокнување...\n`);
      continue;
    }

    brandsProcessed++;
    const existingModels = await modelRepo.find({
      where: { brand_id: brand.id },
    });

    const maxOrder =
      existingModels.length > 0 ? Math.max(...existingModels.map((m) => m.order || 0)) : 0;

    let added = 0;
    let updated = 0;

    for (let i = 0; i < models.length; i++) {
      const modelName = models[i];
      const modelNameLower = modelName.toLowerCase();

      const existingModel = existingModels.find((m) => m.name.toLowerCase() === modelNameLower);

      if (!existingModel) {
        const model = modelRepo.create({
          name: modelName,
          brand_id: brand.id,
          order: maxOrder + i + 1,
        });
        await modelRepo.save(model);
        added++;
        console.log(`  ✅ Додаден модел: ${modelName}`);
      } else {
        existingModel.order = maxOrder + i + 1;
        await modelRepo.save(existingModel);
        updated++;
      }
    }

    totalAdded += added;
    totalUpdated += updated;

    if (added > 0 || updated > 0) {
      console.log(`\n📊 ${brandName}:`);
      console.log(`   - Додадени модели: ${added}`);
      console.log(`   - Ажурирани модели: ${updated}`);
      console.log(`   - Вкупно модели: ${existingModels.length + added}\n`);
    } else {
      console.log(`\n📊 ${brandName}:`);
      console.log(`   - Сите модели веќе постојат\n`);
    }
  }

  console.log(`\n✅ Завршено!`);
  console.log(`   - Обработени брендови: ${brandsProcessed}`);
  console.log(`   - Брендови не пронајдени: ${brandsNotFound}`);
  console.log(`   - Вкупно додадени модели: ${totalAdded}`);
  console.log(`   - Вкупно ажурирани модели: ${totalUpdated}\n`);

  await AppDataSource.destroy();
  console.log('🔌 Врската со базата на податоци е затворена');
}

addCommercialModels()
  .then(() => {
    console.log('✅ Скриптот заврши успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error);
    process.exit(1);
  });
