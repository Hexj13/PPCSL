import 'reflect-metadata';
import * as bcrypt from 'bcrypt';

import { UserType as UserTypeEnum } from '../../common/types';
import { AppDataSource } from '../../data-source';
import { User } from '../../users/entities/user.entity';

async function makeAdmin() {
  try {
    const args = process.argv.slice(2);
    let email = 'admin@admin.com';
    let password = 'admin123';
    let firstName = 'Admin';
    let lastName = 'User';
    let phone = '+38970111111';

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--email' && args[i + 1]) {
        email = args[i + 1];
        i++;
      } else if (args[i] === '--password' && args[i + 1]) {
        password = args[i + 1];
        i++;
      } else if (args[i] === '--first-name' && args[i + 1]) {
        firstName = args[i + 1];
        i++;
      } else if (args[i] === '--last-name' && args[i + 1]) {
        lastName = args[i + 1];
        i++;
      } else if (args[i] === '--phone' && args[i + 1]) {
        phone = args[i + 1];
        i++;
      }
    }

    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Connected to database');

    const userRepo = AppDataSource.getRepository(User);

    let admin = await userRepo.findOne({ where: { email } });

    if (!admin) {
      console.log(`👤 Creating new user ${email}...`);
      const hashedPassword = await bcrypt.hash(password, 10);
      admin = userRepo.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        type: UserTypeEnum.Admin,
        active: true,
      });
      admin = await userRepo.save(admin);
      console.log('✅ Created new admin user');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log(`   Type: Admin`);
    } else {
      console.log(`👤 Found existing user ${email}`);
      const wasAdmin = admin.type === UserTypeEnum.Admin;

      admin.type = UserTypeEnum.Admin;
      admin.active = true;

      if (args.includes('--update-password')) {
        const hashedPassword = await bcrypt.hash(password, 10);
        admin.password = hashedPassword;
        console.log('   Password will be updated');
      }

      admin = await userRepo.save(admin);

      if (wasAdmin) {
        console.log('✅ User is already an admin');
      } else {
        console.log('✅ User successfully promoted to admin');
      }
      console.log(`   Email: ${email}`);
      console.log(`   Type: Admin`);
      if (args.includes('--update-password')) {
        console.log(`   New Password: ${password}`);
      }
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

if (require.main === module) {
  makeAdmin()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { makeAdmin };
