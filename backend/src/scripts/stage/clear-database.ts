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
  console.log('🚀 Starting database cleanup...\n');

  await AppDataSource.initialize();
  console.log('✅ Connected to database\n');

  const listingRepo = AppDataSource.getRepository(Listing);
  const listingViewRepo = AppDataSource.getRepository(ListingView);
  const favoriteRepo = AppDataSource.getRepository(Favorite);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);
  const modelRepo = AppDataSource.getRepository(VehicleModel);
  const brandRepo = AppDataSource.getRepository(Brand);
  const userRepo = AppDataSource.getRepository(User);

  console.log('🗑️  Deleting listings...');
  const allListings = await listingRepo.find();
  console.log(`   Found ${allListings.length} listings`);

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
  console.log(`   ✅ Deleted ${deletedListings} listings\n`);

  console.log('🗑️  Deleting vehicles...');
  const allVehicles = await vehicleRepo.find();
  console.log(`   Found ${allVehicles.length} vehicles`);
  for (const vehicle of allVehicles) {
    await vehicleRepo.remove(vehicle);
  }
  console.log(`   ✅ Deleted ${allVehicles.length} vehicles\n`);

  console.log('🗑️  Deleting models...');
  let allModels = await modelRepo.find();
  console.log(`   Found ${allModels.length} models`);
  let deletedModels = 0;
  for (const model of allModels) {
    await modelRepo.remove(model);
    deletedModels++;
  }

  allModels = await modelRepo.find();
  if (allModels.length > 0) {
    console.log(`   ⚠️  ${allModels.length} models remaining, deleting...`);
    for (const model of allModels) {
      await modelRepo.remove(model);
      deletedModels++;
    }
  }
  console.log(`   ✅ Deleted ${deletedModels} models\n`);

  console.log('🗑️  Deleting brands...');
  let allBrands = await brandRepo.find();
  console.log(`   Found ${allBrands.length} brands`);
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
    console.log(`   ⚠️  ${allBrands.length} brands remaining, deleting...`);
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
  console.log(`   ✅ Deleted ${deletedBrands} brands\n`);

  console.log('🗑️  Deleting users...');
  const allUsers = await userRepo.find();
  console.log(`   Found ${allUsers.length} users`);

  await AppDataSource.query('DELETE FROM phone_verification_codes');
  console.log('   ✅ Deleted phone verification codes\n');

  for (const user of allUsers) {
    const favorites = await favoriteRepo.find({ where: { user_id: user.id } });
    for (const favorite of favorites) {
      await favoriteRepo.remove(favorite);
    }

    await userRepo.remove(user);
  }
  console.log(`   ✅ Deleted ${allUsers.length} users\n`);

  const finalBrands = await brandRepo.find();
  const finalModels = await modelRepo.find();
  const finalVehicles = await vehicleRepo.find();
  const finalListings = await listingRepo.find();
  const finalUsers = await userRepo.find();

  console.log('✅ Database cleanup complete!');
  console.log(`\n📊 Statistics:`);
  console.log(`   - Deleted listings: ${deletedListings}`);
  console.log(`   - Deleted vehicles: ${allVehicles.length}`);
  console.log(`   - Deleted models: ${deletedModels}`);
  console.log(`   - Deleted brands: ${deletedBrands}`);
  console.log(`   - Deleted users: ${allUsers.length}`);
  console.log(`\n📊 Final check:`);
  console.log(`   - Remaining listings: ${finalListings.length}`);
  console.log(`   - Remaining vehicles: ${finalVehicles.length}`);
  console.log(`   - Remaining models: ${finalModels.length}`);
  console.log(`   - Remaining brands: ${finalBrands.length}`);
  console.log(`   - Remaining users: ${finalUsers.length}\n`);

  await AppDataSource.destroy();
  console.log('🔌 Database connection closed');
}

clearDatabase()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
