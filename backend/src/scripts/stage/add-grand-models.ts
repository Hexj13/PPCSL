import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';

const GRAND_AND_EXTENDED_MODELS: Record<string, string[]> = {
  Citroën: [
    'C4 Grand Picasso',
    'C4 Picasso',
    'C3 Picasso',
    'Grand C4 Picasso',
    'C5 Grand Tourer',
    'C8 Grand',
    'Berlingo Grand',
  ],
  Peugeot: [
    '5008 Grand',
    '3008 Grand',
    'Partner Grand',
    'Expert Grand',
    'Rifter Grand',
    'Traveller Grand',
  ],
  Renault: [
    'Grand Scenic',
    'Scenic Grand',
    'Espace Grand',
    'Grand Espace',
    'Kangoo Grand',
    'Trafic Grand',
  ],
  Opel: [
    'Grandland X',
    'Corsa Grand',
    'Astra Grand',
    'Insignia Grand Sport',
    'Combo Grand',
    'Vivaro Grand',
  ],
  Volkswagen: ['Touran Grand', 'Sharan Grand', 'Caravelle Grand', 'Multivan Grand'],
  'Mercedes-Benz': ['V-Class Grand', 'Vito Grand', 'Sprinter Grand'],
  Fiat: ['500L Grand', 'Doblo Grand', 'Scudo Grand', 'Talento Grand'],
  Ford: ['Grand C-MAX', 'S-MAX Grand', 'Galaxy Grand', 'Tourneo Grand'],
  Nissan: ['Grand Livina', 'Grand Murano', 'Pathfinder Grand'],
  Toyota: ['Grand Highlander', 'Land Cruiser Grand', 'Sienna Grand'],
  Honda: ['Pilot Grand', 'Odyssey Grand'],
  Kia: ['Grand Carnival', 'Grand Sedona', 'Sorento Grand'],
  Hyundai: ['Grand Starex', 'Grand Santa Fe', 'H-1 Grand'],
  Mazda: ['CX-9 Grand', 'MPV Grand', 'CX-8 Grand'],
  Suzuki: ['Grand Vitara', 'Grand Escudo', 'XL-7 Grand'],
  Mitsubishi: ['Grand Lancer', 'Grandis', 'Outlander Grand'],
  Dacia: ['Duster Grand', 'Lodgy Grand', 'Jogger Grand'],
  SEAT: ['Alhambra Grand', 'Tarraco Grand'],
  Škoda: ['Superb Grand', 'Octavia Grand', 'Kodiaq Grand'],
  Volvo: ['XC90 Grand', 'XC70 Grand', 'V90 Grand'],
  'Land Rover': ['Range Rover Grand', 'Discovery Grand', 'Defender Grand'],
  Jaguar: ['XF Grand', 'XJ Grand'],
  'Aston Martin': ['Rapide Grand', 'Lagonda Grand'],
  'Rolls-Royce': ['Phantom Grand', 'Ghost Grand'],
  Bentley: ['Continental Grand', 'Flying Spur Grand'],
  Chrysler: ['Voyager Grand', 'Pacifica Grand', 'Town & Country Grand'],
  Dodge: ['Grand Caravan', 'Journey Grand', 'Durango Grand'],
  Jeep: ['Grand Cherokee', 'Grand Wagoneer', 'Commander Grand'],
};

async function addGrandModels() {
  console.log('🚀 Започнување на додавање на Grand модели и проширени верзии...\n');

  await AppDataSource.initialize();
  console.log('✅ Поврзано со базата на податоци\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  let totalAdded = 0;
  let totalUpdated = 0;
  let brandsProcessed = 0;
  let brandsNotFound = 0;

  for (const [brandName, models] of Object.entries(GRAND_AND_EXTENDED_MODELS)) {
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

addGrandModels()
  .then(() => {
    console.log('✅ Скриптот заврши успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error);
    process.exit(1);
  });
