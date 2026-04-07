import 'reflect-metadata';
import * as bcrypt from 'bcrypt';

import { AdminAuditLog } from '../../admin/entities/admin-audit-log.entity';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { UserType as UserTypeEnum } from '../../common/types';
import { ComparisonItem } from '../../comparison/entities/comparison-item.entity';
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

async function resetUsers() {
  try {
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Connected to database');

    const userRepo = AppDataSource.getRepository(User);
    const listingRepo = AppDataSource.getRepository(Listing);
    const favoriteRepo = AppDataSource.getRepository(Favorite);
    const listingViewRepo = AppDataSource.getRepository(ListingView);
    const promotionHistoryRepo = AppDataSource.getRepository(PromotionHistory);
    const vehicleRepo = AppDataSource.getRepository(Vehicle);
    const savedFilterRepo = AppDataSource.getRepository(SavedFilter);
    const refreshTokenRepo = AppDataSource.getRepository(RefreshToken);
    const adminAuditLogRepo = AppDataSource.getRepository(AdminAuditLog);

    console.log('🗑️  Deleting all users...');

    console.log('   Deleting all admin audit logs...');
    await adminAuditLogRepo.createQueryBuilder().delete().from(AdminAuditLog).execute();

    console.log('   Deleting all refresh tokens...');
    await refreshTokenRepo.createQueryBuilder().delete().from(RefreshToken).execute();

    console.log('   Deleting all saved filters...');
    await savedFilterRepo.createQueryBuilder().delete().from(SavedFilter).execute();

    console.log('   Deleting all phone verification codes...');
    try {
      await AppDataSource.query('DELETE FROM phone_verification_codes');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('does not exist')) {
        throw error;
      }
    }

    console.log('   Deleting all promotion history...');
    await promotionHistoryRepo.createQueryBuilder().delete().from(PromotionHistory).execute();

    console.log('   Deleting all comparison items...');
    await AppDataSource.createQueryBuilder().delete().from(ComparisonItem).execute();

    console.log('   Deleting all listing views...');
    await listingViewRepo.createQueryBuilder().delete().from(ListingView).execute();

    console.log('   Deleting all favorites...');
    await favoriteRepo.createQueryBuilder().delete().from(Favorite).execute();

    console.log('   Deleting all listings...');
    const listings = await listingRepo.find();
    if (listings.length > 0) {
      await listingRepo.remove(listings);
    }

    console.log('   Deleting all vehicles...');
    const vehicles = await vehicleRepo.find();
    if (vehicles.length > 0) {
      await vehicleRepo.remove(vehicles);
    }

    console.log('   Deleting all users...');
    const users = await userRepo.find();
    if (users.length > 0) {
      await userRepo.remove(users);
    }

    console.log('✅ All users deleted');

    console.log('👑 Creating new admin user...');
    const hashedPassword = await bcrypt.hash('GGGgggTEST777', 10);
    const admin = userRepo.create({
      email: 'admin@admin.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      phone: '+38970111111',
      type: UserTypeEnum.Admin,
    });
    await userRepo.save(admin);
    console.log('✅ Created new admin user');
    console.log(`   Email: admin@admin.com`);
    console.log(`   Password: GGGgggTEST777`);
    console.log(`   Type: Admin`);

    console.log('🎉 Done!');
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

resetUsers().catch(() => {
  process.exit(1);
});
