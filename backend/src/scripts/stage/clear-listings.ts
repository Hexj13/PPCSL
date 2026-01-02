import 'reflect-metadata';
import { AppDataSource } from '../../data-source';
import { Favorite } from '../../favorites/entities/favorite.entity';
import { ListingView } from '../../listings/entities/listing-view.entity';
import { Listing } from '../../listings/entities/listing.entity';
import { PromotionHistory } from '../../listings/entities/promotion-history.entity';
import { Vehicle } from '../../listings/entities/vehicle.entity';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);

async function clearListings() {
  console.log('🚀 Начинаю удаление всех объявлений...\n');

  await AppDataSource.initialize();
  console.log('✅ Подключено к базе данных\n');

  const listingRepo = AppDataSource.getRepository(Listing);
  const listingViewRepo = AppDataSource.getRepository(ListingView);
  const favoriteRepo = AppDataSource.getRepository(Favorite);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);
  const promotionHistoryRepo = AppDataSource.getRepository(PromotionHistory);

  console.log('🗑️  Удаление истории продвижений...');
  const allPromotionHistory = await promotionHistoryRepo.find();
  console.log(`   Найдено ${allPromotionHistory.length} записей истории продвижений`);
  for (const history of allPromotionHistory) {
    await promotionHistoryRepo.remove(history);
  }
  console.log(`   ✅ Удалено ${allPromotionHistory.length} записей истории продвижений\n`);

  console.log('🗑️  Удаление объявлений...');
  const allListings = await listingRepo.find();
  console.log(`   Найдено ${allListings.length} объявлений`);

  let deletedListings = 0;
  for (const listing of allListings) {
    // Удаляем просмотры
    const views = await listingViewRepo.find({ where: { listing_id: listing.id } });
    for (const view of views) {
      await listingViewRepo.remove(view);
    }

    // Удаляем из избранного
    const favorites = await favoriteRepo.find({ where: { listing_id: listing.id } });
    for (const favorite of favorites) {
      await favoriteRepo.remove(favorite);
    }

    // Удаляем объявление
    await listingRepo.remove(listing);
    deletedListings++;
  }
  console.log(`   ✅ Удалено ${deletedListings} объявлений\n`);

  console.log('🗑️  Удаление связанных транспортных средств...');
  const allVehicles = await vehicleRepo.find();
  console.log(`   Найдено ${allVehicles.length} транспортных средств`);

  let deletedVehicles = 0;
  for (const vehicle of allVehicles) {
    await vehicleRepo.remove(vehicle);
    deletedVehicles++;
  }
  console.log(`   ✅ Удалено ${deletedVehicles} транспортных средств\n`);

  const finalListings = await listingRepo.find();
  const finalVehicles = await vehicleRepo.find();

  console.log('✅ Все объявления удалены!');
  console.log(`\n📊 Статистика:`);
  console.log(`   - Удалено объявлений: ${deletedListings}`);
  console.log(`   - Удалено транспортных средств: ${deletedVehicles}`);
  console.log(`\n📊 Финальная проверка:`);
  console.log(`   - Осталось объявлений: ${finalListings.length}`);
  console.log(`   - Осталось транспортных средств: ${finalVehicles.length}`);

  await AppDataSource.destroy();
  console.log('\n✅ Готово!');
}

clearListings()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });
