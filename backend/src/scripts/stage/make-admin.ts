import 'reflect-metadata';
import * as bcrypt from 'bcrypt';

import { UserType as UserTypeEnum } from '../../common/types';
import { AppDataSource } from '../../data-source';
import { User } from '../../users/entities/user.entity';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);

async function makeAdmin() {
  try {
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Connected to database');

    const userRepo = AppDataSource.getRepository(User);
    const email = 'admin@admin.com';

    let admin = await userRepo.findOne({ where: { email } });

    if (!admin) {
      console.log(`👤 Creating new user ${email}...`);
      const hashedPassword = await bcrypt.hash('GGGgggTEST777', 10);
      admin = userRepo.create({
        email,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        phone: '+38970111111',
        type: UserTypeEnum.Admin,
      });
      admin = await userRepo.save(admin);
      console.log('✅ Created new admin user');
      console.log(`   Email: ${email}`);
      console.log(`   Password: GGGgggTEST777`);
      console.log(`   Type: Admin`);
    } else {
      console.log(`👤 Found user ${email}`);
      const wasAdmin = admin.type === UserTypeEnum.Admin;

      admin.type = UserTypeEnum.Admin;
      admin = await userRepo.save(admin);

      if (wasAdmin) {
        console.log('✅ User is already an admin');
      } else {
        console.log('✅ User successfully promoted to admin');
      }
      console.log(`   Email: ${email}`);
      console.log(`   Type: Admin`);
    }

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

makeAdmin().catch(() => {
  process.exit(1);
});
