import 'reflect-metadata';

import { AppDataSource } from '../../data-source';
import { Favorite } from '../../favorites/entities/favorite.entity';
import { ListingView } from '../../listings/entities/listing-view.entity';
import { Listing } from '../../listings/entities/listing.entity';
import { PromotionHistory } from '../../listings/entities/promotion-history.entity';
import { Vehicle } from '../../listings/entities/vehicle.entity';
import { SavedFilter } from '../../saved-filters/entities/saved-filter.entity';
import { User } from '../../users/entities/user.entity';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);

async function clearListingsAndUsers() {
  console.log('🚀 Starting cleanup of listings and users...\n');

  await AppDataSource.initialize();
  console.log('✅ Connected to database via TypeORM\n');

  const listingRepo = AppDataSource.getRepository(Listing);
  const listingViewRepo = AppDataSource.getRepository(ListingView);
  const favoriteRepo = AppDataSource.getRepository(Favorite);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);
  const promotionHistoryRepo = AppDataSource.getRepository(PromotionHistory);
  const userRepo = AppDataSource.getRepository(User);

  console.log('🗑️  Deleting promotion history...');
  const allPromotionHistory = await promotionHistoryRepo.find();
  console.log(`   Found ${allPromotionHistory.length} promotion history records`);
  for (const history of allPromotionHistory) {
    await promotionHistoryRepo.remove(history);
  }
  console.log(`   ✅ Deleted ${allPromotionHistory.length} promotion history records\n`);

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

  console.log('🗑️  Deleting saved filters...');
  const savedFilterRepo = AppDataSource.getRepository(SavedFilter);
  const allSavedFilters = await savedFilterRepo.find();
  console.log(`   Found ${allSavedFilters.length} saved filters`);
  for (const filter of allSavedFilters) {
    await savedFilterRepo.remove(filter);
  }
  console.log(`   ✅ Deleted ${allSavedFilters.length} saved filters\n`);

  console.log('🗑️  Deleting users...');
  const allUsers = await userRepo.find();
  console.log(`   Found ${allUsers.length} users`);

  try {
    await AppDataSource.query('DELETE FROM phone_verification_codes');
    console.log('   ✅ Deleted phone verification codes\n');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('does not exist')) {
      console.log('   ⚠️  Table phone_verification_codes does not exist, skipping\n');
    } else {
      console.log(`   ⚠️  Could not delete phone verification codes: ${errorMessage}\n`);
    }
  }

  for (const user of allUsers) {
    const favorites = await favoriteRepo.find({ where: { user_id: user.id } });
    for (const favorite of favorites) {
      await favoriteRepo.remove(favorite);
    }

    await userRepo.remove(user);
  }
  console.log(`   ✅ Deleted ${allUsers.length} users\n`);

  const finalListings = await listingRepo.find();
  const finalVehicles = await vehicleRepo.find();
  const finalUsers = await userRepo.find();

  console.log('✅ Cleanup complete!');
  console.log(`\n📊 Statistics:`);
  console.log(`   - Deleted listings: ${deletedListings}`);
  console.log(`   - Deleted vehicles: ${allVehicles.length}`);
  console.log(`   - Deleted users: ${allUsers.length}`);
  console.log(`\n📊 Final check:`);
  console.log(`   - Remaining listings: ${finalListings.length}`);
  console.log(`   - Remaining vehicles: ${finalVehicles.length}`);
  console.log(`   - Remaining users: ${finalUsers.length}\n`);

  await AppDataSource.destroy();
  console.log('🔌 Database connection closed');
}

clearListingsAndUsers()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
