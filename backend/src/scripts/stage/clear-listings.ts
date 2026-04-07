import 'reflect-metadata';
import { ComparisonItem } from '../../comparison/entities/comparison-item.entity';
import { AppDataSource } from '../../data-source';
import { Favorite } from '../../favorites/entities/favorite.entity';
import { ListingView } from '../../listings/entities/listing-view.entity';
import { Listing } from '../../listings/entities/listing.entity';
import { PromotionHistory } from '../../listings/entities/promotion-history.entity';
import { Vehicle } from '../../listings/entities/vehicle.entity';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);

async function clearListings() {
  console.log('🚀 Starting deletion of all listings...\n');

  await AppDataSource.initialize();
  console.log('✅ Connected to database\n');

  const listingRepo = AppDataSource.getRepository(Listing);
  const listingViewRepo = AppDataSource.getRepository(ListingView);
  const favoriteRepo = AppDataSource.getRepository(Favorite);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);
  const promotionHistoryRepo = AppDataSource.getRepository(PromotionHistory);

  console.log('🗑️  Deleting promotion history...');
  const allPromotionHistory = await promotionHistoryRepo.find();
  console.log(`   Found ${allPromotionHistory.length} promotion history records`);
  for (const history of allPromotionHistory) {
    await promotionHistoryRepo.remove(history);
  }
  console.log(`   ✅ Deleted ${allPromotionHistory.length} promotion history records\n`);

  console.log('🗑️  Deleting comparison items...');
  const comparisonDeleteResult = await AppDataSource.createQueryBuilder()
    .delete()
    .from(ComparisonItem)
    .execute();
  console.log(`   ✅ Deleted ${comparisonDeleteResult.affected ?? 0} comparison items\n`);

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

  console.log('🗑️  Deleting related vehicles...');
  const allVehicles = await vehicleRepo.find();
  console.log(`   Found ${allVehicles.length} vehicles`);

  let deletedVehicles = 0;
  for (const vehicle of allVehicles) {
    await vehicleRepo.remove(vehicle);
    deletedVehicles++;
  }
  console.log(`   ✅ Deleted ${deletedVehicles} vehicles\n`);

  const finalListings = await listingRepo.find();
  const finalVehicles = await vehicleRepo.find();

  console.log('✅ All listings deleted!');
  console.log(`\n📊 Statistics:`);
  console.log(`   - Deleted listings: ${deletedListings}`);
  console.log(`   - Deleted vehicles: ${deletedVehicles}`);
  console.log(`\n📊 Final check:`);
  console.log(`   - Remaining listings: ${finalListings.length}`);
  console.log(`   - Remaining vehicles: ${finalVehicles.length}`);

  await AppDataSource.destroy();
  console.log('\n✅ Done!');
}

clearListings()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
