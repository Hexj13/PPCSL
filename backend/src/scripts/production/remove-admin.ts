import 'reflect-metadata';

import { UserType as UserTypeEnum } from '../../common/types';
import { AppDataSource } from '../../data-source';
import { User } from '../../users/entities/user.entity';

async function removeAdmin() {
  try {
    const args = process.argv.slice(2);
    let email = '';
    let newType: 'Individual' | 'Business' = 'Individual';

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--email' && args[i + 1]) {
        email = args[i + 1];
        i++;
      } else if (args[i] === '--type' && args[i + 1]) {
        const type = args[i + 1];
        if (type === 'Individual' || type === 'Business') {
          newType = type;
        } else {
          console.error(`❌ Invalid type: ${type}. Must be 'Individual' or 'Business'`);
          process.exit(1);
        }
        i++;
      }
    }

    if (!email) {
      console.error('❌ Error: --email parameter is required');
      console.log(
        'Usage: npm run remove-admin:prod -- --email user@example.com [--type Individual|Business]',
      );
      process.exit(1);
    }

    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Connected to database');

    const userRepo = AppDataSource.getRepository(User);

    const user = await userRepo.findOne({ where: { email } });

    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    if (user.type !== UserTypeEnum.Admin) {
      console.log(`ℹ️  User ${email} is not an admin (current type: ${user.type})`);
      console.log('🎉 Done!');
      process.exit(0);
    }

    console.log(`👤 Found admin user ${email}`);
    console.log(`   Current type: ${user.type}`);
    console.log(`   New type: ${newType}`);

    user.type = newType === 'Individual' ? UserTypeEnum.Individual : UserTypeEnum.Business;
    await userRepo.save(user);

    console.log(`✅ User successfully demoted from admin to ${newType}`);
    console.log(`   Email: ${email}`);
    console.log(`   Type: ${newType}`);

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
  removeAdmin()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { removeAdmin };
