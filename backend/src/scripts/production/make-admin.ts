import { randomBytes } from 'node:crypto';

import 'reflect-metadata';
import * as bcrypt from 'bcrypt';

import { UserType as UserTypeEnum } from '../../common/types';
import { AppDataSource } from '../../data-source';
import { User } from '../../users/entities/user.entity';

function generateSecurePassword(): string {
  return randomBytes(16).toString('base64url');
}

async function makeAdmin() {
  try {
    const args = process.argv.slice(2);
    let email: string | null = null;
    let password: string | null = null;
    let firstName = 'Admin';
    let lastName = 'User';
    let phone: string | null = null;

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

    if (!email && !phone) {
      console.error('❌ Error: Either --email or --phone parameter is required');
      console.log('Usage: npm run make-admin:prod -- --email user@example.com');
      console.log('   or: npm run make-admin:prod -- --phone +373XXXXXXXXX');
      process.exit(1);
    }

    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Connected to database');

    const userRepo = AppDataSource.getRepository(User);

    let admin: User | null = null;

    if (email) {
      admin = await userRepo.findOne({ where: { email } });
      if (admin) {
        console.log(`👤 Found existing user by email: ${email}`);
      }
    }

    if (!admin && phone) {
      admin = await userRepo.findOne({ where: { phone } });
      if (admin) {
        console.log(`👤 Found existing user by phone: ${phone}`);
      }
    }

    if (!admin) {
      if (!email) {
        console.error('❌ Error: Cannot create new user without email');
        console.log('Please provide --email parameter to create a new admin user');
        process.exit(1);
      }
      if (!password) {
        password = generateSecurePassword();
        console.log('⚠️  No --password provided, generated a random one');
      }
      console.log(`👤 Creating new user ${email}...`);
      const hashedPassword = await bcrypt.hash(password, 10);
      admin = userRepo.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone || null,
        type: UserTypeEnum.Admin,
        active: true,
      });
      admin = await userRepo.save(admin);
      console.log('✅ Created new admin user');
      console.log(`   Email: ${email}`);
      if (phone) {
        console.log(`   Phone: ${phone}`);
      }
      console.log(`   Password: ${password}`);
      console.log(`   Type: Admin`);
    } else {
      const wasAdmin = admin.type === UserTypeEnum.Admin;
      const identifier = email ? `email: ${email}` : `phone: ${phone}`;
      console.log(`👤 Found existing user by ${identifier}`);

      admin.type = UserTypeEnum.Admin;
      admin.active = true;

      if (args.includes('--update-password')) {
        if (!email) {
          console.error('❌ Error: Cannot update password without email');
          console.log('Please provide --email parameter to update password');
          process.exit(1);
        }
        if (!password) {
          password = generateSecurePassword();
          console.log('⚠️  No --password provided, generated a random one');
        }
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
      if (admin.email) {
        console.log(`   Email: ${admin.email}`);
      }
      if (admin.phone) {
        console.log(`   Phone: ${admin.phone}`);
      }
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
