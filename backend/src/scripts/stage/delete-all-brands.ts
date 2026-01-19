import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { Favorite } from '../../favorites/entities/favorite.entity';
import { ListingView } from '../../listings/entities/listing-view.entity';
import { Listing } from '../../listings/entities/listing.entity';
import { Vehicle } from '../../listings/entities/vehicle.entity';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);

async function deleteAllBrands() {
  console.log('🚀 Starting deletion of all brands...\n');

  await AppDataSource.initialize();
  console.log('✅ Connected to database\n');

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

    console.log(`📊 Iteration ${iterations}: Found ${allBrands.length} brands to delete\n`);

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
      console.log(`  ❌ Deleted: ${brand.name}`);
    }
  }

  const remainingBrands = await brandRepo.find();
  if (remainingBrands.length > 0) {
    console.log(`\n⚠️  Still ${remainingBrands.length} brands remaining. Deleting directly...\n`);
    await brandRepo.delete({});
    await modelRepo.delete({});
    deletedBrands += remainingBrands.length;
  }

  console.log(`\n✅ Deletion completed!`);
  console.log(`\n📊 Statistics:`);
  console.log(`   - Deleted brands: ${deletedBrands}`);
  console.log(`   - Deleted models: ${deletedModels}`);
  console.log(`   - Deleted vehicles: ${deletedVehicles}`);
  console.log(`   - Deleted listings: ${deletedListings}\n`);

  const finalBrands = await brandRepo.find();
  console.log(`📊 Final check: ${finalBrands.length} brands remaining\n`);

  await AppDataSource.destroy();
  console.log('🔌 Database connection closed');
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
