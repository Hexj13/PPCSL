import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { checkEnvironment, checkPlatform } from '../script-guard';

checkEnvironment(['production', 'stage', 'development', 'test']);
checkPlatform(['common']);

async function checkEmptyBrands() {
  console.log('🔍 Checking for brands with zero models...\n');

  await AppDataSource.initialize();

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  const brands = await brandRepo.find({
    order: { name: 'ASC' },
    select: ['id', 'name'],
  });

  const empty: string[] = [];
  for (const brand of brands) {
    const count = await modelRepo.count({ where: { brand_id: brand.id } });
    if (count === 0) empty.push(brand.name);
  }

  if (empty.length === 0) {
    console.log('✅ No empty brands found');
  } else {
    console.log(`⚠️  Found ${empty.length} brand(s) with zero models:`);
    empty.forEach((name) => console.log(`   - ${name}`));
  }

  await AppDataSource.destroy();
  return empty;
}

if (require.main === module) {
  checkEmptyBrands()
    .then((list) => {
      process.exit(list.length > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

export { checkEmptyBrands };
