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
    console.log('🔌 Поврзување со базата на податоци...');
    await AppDataSource.initialize();
    console.log('✅ Поврзано со базата на податоци');

    const userRepo = AppDataSource.getRepository(User);
    const listingRepo = AppDataSource.getRepository(Listing);
    const favoriteRepo = AppDataSource.getRepository(Favorite);
    const vehicleRepo = AppDataSource.getRepository(Vehicle);

    console.log('🗑️  Бришење на сите корисници...');

    console.log('   Бришење на сите омилени...');
    const favorites = await favoriteRepo.find();
    if (favorites.length > 0) {
      await favoriteRepo.remove(favorites);
    }

    console.log('   Бришење на сите објави...');
    const listings = await listingRepo.find();
    if (listings.length > 0) {
      await listingRepo.remove(listings);
    }

    console.log('   Бришење на сите возила...');
    const vehicles = await vehicleRepo.find();
    if (vehicles.length > 0) {
      await vehicleRepo.remove(vehicles);
    }

    console.log('   Бришење на сите корисници...');
    const users = await userRepo.find();
    if (users.length > 0) {
      await userRepo.remove(users);
    }

    console.log('✅ Сите корисници се избришани');

    console.log('👑 Креирање нов админ корисник...');
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
    console.log('✅ Креиран нов админ корисник');
    console.log(`   Email: admin@admin.com`);
    console.log(`   Парола: admin123`);
    console.log(`   Тип: Admin`);

    console.log('🎉 Завршено!');
  } catch (error) {
    console.error('❌ Грешка:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Врската со базата на податоци е затворена');
    }
  }
}

resetUsers();
