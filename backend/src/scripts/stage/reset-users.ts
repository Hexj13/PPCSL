import 'reflect-metadata';
import * as bcrypt from 'bcrypt';

import { UserType as UserTypeEnum } from '../../common/types';
import { AppDataSource } from '../../data-source';
import { Favorite } from '../../favorites/entities/favorite.entity';
import { Listing } from '../../listings/entities/listing.entity';
import { Vehicle } from '../../listings/entities/vehicle.entity';
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
    const vehicleRepo = AppDataSource.getRepository(Vehicle);

    console.log('🗑️  Deleting all users...');

    console.log('   Deleting all favorites...');
    const favorites = await favoriteRepo.find();
    if (favorites.length > 0) {
      await favoriteRepo.remove(favorites);
    }

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
    const hashedPassword = await bcrypt.hash('admin123', 10);
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
    console.log(`   Password: admin123`);
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

resetUsers();
