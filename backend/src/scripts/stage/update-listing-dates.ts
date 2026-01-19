import 'reflect-metadata';

import { ListingStatus as ListingStatusEnum } from '../../common/types';
import { AppDataSource } from '../../data-source';
import { Listing } from '../../listings/entities/listing.entity';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);

async function updateListingDates() {
  try {
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Connected to database');

    const listingRepo = AppDataSource.getRepository(Listing);

    // Получаем все активные объявления
    const activeListings = await listingRepo.find({
      where: { status: ListingStatusEnum.Active },
      order: { created_at: 'DESC' },
    });

    console.log(`📝 Found ${activeListings.length} active listings`);

    if (activeListings.length === 0) {
      console.log('⚠️  No active listings found. Nothing to update.');
      return;
    }

    const now = new Date();
    let updatedToday = 0;
    let updatedDaysAgo = 0;
    let updatedOlder = 0;

    // Распределяем объявления по группам
    for (let i = 0; i < activeListings.length; i++) {
      const listing = activeListings[i];
      const position = i % 20; // Цикл каждые 20 объявлений

      let newDate: Date;

      if (position < 5) {
        // Первые 5 - сегодня (0 дней назад)
        newDate = new Date(now);
        newDate.setHours(now.getHours() - position * 2); // Разные часы в течение дня
        updatedToday++;
      } else if (position < 12) {
        // Следующие 7 - от 1 до 7 дней назад
        const daysAgo = position - 4; // 1, 2, 3, 4, 5, 6, 7
        newDate = new Date(now);
        newDate.setDate(newDate.getDate() - daysAgo);
        newDate.setHours(Math.floor(Math.random() * 24));
        updatedDaysAgo++;
      } else {
        // Остальные - старше 7 дней (8-30 дней назад)
        const daysAgo = 8 + Math.floor((position - 12) * 2.75); // 8-30 дней
        newDate = new Date(now);
        newDate.setDate(newDate.getDate() - daysAgo);
        newDate.setHours(Math.floor(Math.random() * 24));
        updatedOlder++;
      }

      listing.last_updated_at = newDate;
      await listingRepo.save(listing);

      if ((i + 1) % 10 === 0) {
        console.log(`   Updated ${i + 1}/${activeListings.length} listings...`);
      }
    }

    console.log('\n✅ All listings updated successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   Today (0 days ago): ${updatedToday} listings`);
    console.log(`   1-7 days ago: ${updatedDaysAgo} listings`);
    console.log(`   Older than 7 days: ${updatedOlder} listings`);
    console.log(`   Total: ${activeListings.length} listings`);
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

updateListingDates()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
