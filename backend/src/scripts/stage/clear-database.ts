import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { Favorite } from '../../favorites/entities/favorite.entity';
import { ListingView } from '../../listings/entities/listing-view.entity';
import { Listing } from '../../listings/entities/listing.entity';
import { Vehicle } from '../../listings/entities/vehicle.entity';
import { User } from '../../users/entities/user.entity';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);

async function clearDatabase() {
  console.log('🚀 Започнување на чистење на базата на податоци...\n');

  await AppDataSource.initialize();
  console.log('✅ Поврзано со базата на податоци\n');

  const listingRepo = AppDataSource.getRepository(Listing);
  const listingViewRepo = AppDataSource.getRepository(ListingView);
  const favoriteRepo = AppDataSource.getRepository(Favorite);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);
  const modelRepo = AppDataSource.getRepository(VehicleModel);
  const brandRepo = AppDataSource.getRepository(Brand);
  const userRepo = AppDataSource.getRepository(User);

  console.log('🗑️  Бришење на објави...');
  const allListings = await listingRepo.find();
  console.log(`   Најдени ${allListings.length} објави`);

  let deletedListings = 0;
  for (const listing of allListings) {
    const views = await listingViewRepo.find({ where: { listing_id: listing.id } });
    for (const view of views) {
      await listingViewRepo.remove(view);
    }

    const favorites = await favoriteRepo.find({ where: { listing_id: listing.id } });
    for (const favorite of favorites) {
      await favoriteRepo.remove(favorite);
    }

    await listingRepo.remove(listing);
    deletedListings++;
  }
  console.log(`   ✅ Избришани ${deletedListings} објави\n`);

  console.log('🗑️  Бришење на возила...');
  const allVehicles = await vehicleRepo.find();
  console.log(`   Најдени ${allVehicles.length} возила`);
  for (const vehicle of allVehicles) {
    await vehicleRepo.remove(vehicle);
  }
  console.log(`   ✅ Избришани ${allVehicles.length} возила\n`);

  console.log('🗑️  Бришење на модели...');
  let allModels = await modelRepo.find();
  console.log(`   Најдени ${allModels.length} модели`);
  let deletedModels = 0;
  for (const model of allModels) {
    await modelRepo.remove(model);
    deletedModels++;
  }

  allModels = await modelRepo.find();
  if (allModels.length > 0) {
    console.log(`   ⚠️  Остануваат ${allModels.length} модели, бришење...`);
    for (const model of allModels) {
      await modelRepo.remove(model);
      deletedModels++;
    }
  }
  console.log(`   ✅ Избришани ${deletedModels} модели\n`);

  console.log('🗑️  Бришење на марки...');
  let allBrands = await brandRepo.find();
  console.log(`   Најдени ${allBrands.length} марки`);
  let deletedBrands = 0;
  for (const brand of allBrands) {
    const remainingModels = await modelRepo.find({ where: { brand_id: brand.id } });
    if (remainingModels.length > 0) {
      for (const model of remainingModels) {
        await modelRepo.remove(model);
      }
    }
    await brandRepo.remove(brand);
    deletedBrands++;
  }

  allBrands = await brandRepo.find();
  if (allBrands.length > 0) {
    console.log(`   ⚠️  Остануваат ${allBrands.length} марки, бришење...`);
    for (const brand of allBrands) {
      const remainingModels = await modelRepo.find({ where: { brand_id: brand.id } });
      if (remainingModels.length > 0) {
        for (const model of remainingModels) {
          await modelRepo.remove(model);
        }
      }
      await brandRepo.remove(brand);
      deletedBrands++;
    }
  }
  console.log(`   ✅ Избришани ${deletedBrands} марки\n`);

  console.log('🗑️  Бришење на корисници...');
  const allUsers = await userRepo.find();
  console.log(`   Најдени ${allUsers.length} корисници`);

  await AppDataSource.query('DELETE FROM phone_verification_codes');
  console.log('   ✅ Избришани кодове за верификација на телефон\n');

  for (const user of allUsers) {
    const favorites = await favoriteRepo.find({ where: { user_id: user.id } });
    for (const favorite of favorites) {
      await favoriteRepo.remove(favorite);
    }

    await userRepo.remove(user);
  }
  console.log(`   ✅ Избришани ${allUsers.length} корисници\n`);

  const finalBrands = await brandRepo.find();
  const finalModels = await modelRepo.find();
  const finalVehicles = await vehicleRepo.find();
  const finalListings = await listingRepo.find();
  const finalUsers = await userRepo.find();

  console.log('✅ Базата на податоци е целосно исчистена!');
  console.log(`\n📊 Статистика:`);
  console.log(`   - Избришани објави: ${deletedListings}`);
  console.log(`   - Избришани возила: ${allVehicles.length}`);
  console.log(`   - Избришани модели: ${deletedModels}`);
  console.log(`   - Избришани марки: ${deletedBrands}`);
  console.log(`   - Избришани корисници: ${allUsers.length}`);
  console.log(`\n📊 Финална проверка:`);
  console.log(`   - Остануваат објави: ${finalListings.length}`);
  console.log(`   - Остануваат возила: ${finalVehicles.length}`);
  console.log(`   - Остануваат модели: ${finalModels.length}`);
  console.log(`   - Остануваат марки: ${finalBrands.length}`);
  console.log(`   - Остануваат корисници: ${finalUsers.length}\n`);

  await AppDataSource.destroy();
  console.log('🔌 Врската со базата на податоци е затворена');
}

clearDatabase()
  .then(() => {
    console.log('✅ Скриптот заврши успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error);
    process.exit(1);
  });
