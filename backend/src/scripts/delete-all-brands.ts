import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { Brand } from '../brands/entities/brand.entity';
import { VehicleModel } from '../brands/entities/vehicle-model.entity';
import { Listing } from '../listings/entities/listing.entity';
import { Vehicle } from '../listings/entities/vehicle.entity';
import { ListingView } from '../listings/entities/listing-view.entity';
import { Favorite } from '../favorites/entities/favorite.entity';

async function deleteAllBrands() {
  console.log('🚀 Започнување на бришење на сите марки...\n');

  await AppDataSource.initialize();
  console.log('✅ Поврзано со базата на податоци\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);
  const listingRepo = AppDataSource.getRepository(Listing);
  const listingViewRepo = AppDataSource.getRepository(ListingView);
  const favoriteRepo = AppDataSource.getRepository(Favorite);

  let deletedListings = 0;
  let deletedVehicles = 0;
  let deletedModels = 0;
  let deletedBrands = 0;

  let hasMore = true;
  let iterations = 0;
  const maxIterations = 10;

  while (hasMore && iterations < maxIterations) {
    iterations++;
    const allBrands = await brandRepo.find();

    if (allBrands.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`📊 Итерација ${iterations}: Најдени ${allBrands.length} марки за бришење\n`);

    for (const brand of allBrands) {
      const vehicles = await vehicleRepo.find({ where: { brand_id: brand.id } });

      for (const vehicle of vehicles) {
        const listings = await listingRepo.find({ where: { vehicle_id: vehicle.id } });

        for (const listing of listings) {
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

        await vehicleRepo.remove(vehicle);
        deletedVehicles++;
      }

      const models = await modelRepo.find({ where: { brand_id: brand.id } });
      for (const model of models) {
        await modelRepo.remove(model);
        deletedModels++;
      }

      await brandRepo.remove(brand);
      deletedBrands++;
      console.log(`  ❌ Избришан: ${brand.name}`);
    }
  }

  const remainingBrands = await brandRepo.find();
  if (remainingBrands.length > 0) {
    console.log(`\n⚠️  Се уште остануваат ${remainingBrands.length} марки. Бришење директно...\n`);
    await brandRepo.delete({});
    await modelRepo.delete({});
    deletedBrands += remainingBrands.length;
  }

  console.log(`\n✅ Бришењето е завршено!`);
  console.log(`\n📊 Статистика:`);
  console.log(`   - Избришани марки: ${deletedBrands}`);
  console.log(`   - Избришани модели: ${deletedModels}`);
  console.log(`   - Избришани возила: ${deletedVehicles}`);
  console.log(`   - Избришани објави: ${deletedListings}\n`);

  const finalBrands = await brandRepo.find();
  console.log(`📊 Финална проверка: Остануваат ${finalBrands.length} марки\n`);

  await AppDataSource.destroy();
  console.log('🔌 Врската со базата на податоци е затворена');
}

deleteAllBrands()
  .then(() => {
    console.log('✅ Скриптот заврши успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error);
    process.exit(1);
  });
