import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';

const FRENCH_BRANDS_MODELS: Record<string, string[]> = {
  Citroën: [
    'C1',
    'C2',
    'C3',
    'C3 Aircross',
    'C3 Picasso',
    'C4',
    'C4 Aircross',
    'C4 Cactus',
    'C4 Picasso',
    'C4 Grand Picasso',
    'Grand C4 Picasso',
    'C5',
    'C5 Aircross',
    'C5 Grand Tourer',
    'C6',
    'C8',
    'C-Crosser',
    'Berlingo',
    'Berlingo Grand',
    'Jumper',
    'Spacetourer',
    'Ami',
    'DS3',
    'DS4',
    'DS5',
    'DS7 Crossback',
    'E-Mehari',
    'C-Zero',
    'C-Elysée',
    'C3 Pluriel',
    'C4 Sedan',
    'C5 X',
  ],
  Peugeot: [
    '1007',
    '107',
    '108',
    '206',
    '207',
    '208',
    '301',
    '307',
    '308',
    '407',
    '508',
    '2008',
    '3008',
    '4007',
    '4008',
    '5008',
    'Partner',
    'Partner Grand',
    'Expert',
    'Expert Grand',
    'Rifter',
    'Rifter Grand',
    'Traveller',
    'Traveller Grand',
    'Boxer',
    'Bipper',
    'iOn',
    'e-208',
    'e-2008',
    'e-Expert',
    'e-Partner',
    'RCZ',
    '4008 GT',
    '5008 GT',
  ],
  Renault: [
    'Twingo',
    'Clio',
    'Clio Estate',
    'Symbol',
    'Fluence',
    'Megane',
    'Megane Estate',
    'Megane Coupe',
    'Megane Grand Coupe',
    'Laguna',
    'Laguna Estate',
    'Talisman',
    'Talisman Estate',
    'Scenic',
    'Grand Scenic',
    'Scenic Grand',
    'Espace',
    'Grand Espace',
    'Kangoo',
    'Kangoo Grand',
    'Trafic',
    'Trafic Grand',
    'Master',
    'Master Grand',
    'Captur',
    'Kadjar',
    'Koleos',
    'Arkana',
    'Austral',
    'Megane E-Tech',
    'Zoe',
    'Twingo Z.E.',
    'Kangoo Z.E.',
    'Master Z.E.',
    'Alpine A110',
    'Alpine A310',
    'Vel Satis',
    'Avantime',
    'Modus',
    'Wind',
    'Sport Spider',
  ],
  Dacia: [
    'Sandero',
    'Sandero Stepway',
    'Duster',
    'Duster Adventure',
    'Logan',
    'Logan MCV',
    'Lodgy',
    'Lodgy Stepway',
    'Dokker',
    'Spring',
    'Jogger',
    'Jogger Hybrid',
    'Bigster',
    'Manifesto',
  ],
};

async function addFrenchBrandsModels() {
  console.log('🚀 Започнување на додавање на француски марки и модели...\n');

  await AppDataSource.initialize();
  console.log('✅ Поврзано со базата на податоци\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  let totalAdded = 0;
  let totalUpdated = 0;
  let brandsProcessed = 0;
  let brandsNotFound = 0;

  for (const [brandName, models] of Object.entries(FRENCH_BRANDS_MODELS)) {
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

addFrenchBrandsModels()
  .then(() => {
    console.log('✅ Скриптот заврши успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error);
    process.exit(1);
  });
