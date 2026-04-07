import 'reflect-metadata';

import { AppDataSource } from '../../data-source';
import { User } from '../../users/entities/user.entity';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);

async function checkUser() {
  try {
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Connected to database');

    const userRepo = AppDataSource.getRepository(User);
    const phone = '+38267419050';

    const user = await userRepo.findOne({ where: { phone } });

    if (!user) {
      console.log(`❌ User with phone ${phone} not found`);
    } else {
      console.log(`✅ User found:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   Phone: ${user.phone}`);
      console.log(`   First name: ${user.firstName || 'N/A'}`);
      console.log(`   Last name: ${user.lastName || 'N/A'}`);
      console.log(`   Company: ${user.companyName || 'N/A'}`);
      console.log(`   Type: ${user.type}`);
      console.log(`   Active: ${user.active}`);
      console.log(`\n📱 Available messengers:`);
      console.log(`   Viber: ${user.viber ? '✅ Yes' : '❌ No'}`);
      console.log(`   WhatsApp: ${user.whatsapp ? '✅ Yes' : '❌ No'}`);
      console.log(`   Telegram: ${user.telegram ? '✅ Yes' : '❌ No'}`);
      console.log(`\n🔔 Notifications:`);
      console.log(`   Email notifications: ${user.emailNotifications ? '✅ Yes' : '❌ No'}`);
      console.log(`   Phone verified: ${user.phoneVerified ? '✅ Yes' : '❌ No'}`);
      console.log(`   Email verified: ${user.emailVerified ? '✅ Yes' : '❌ No'}`);
    }

    console.log('\n🎉 Done!');
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

checkUser().catch(() => {
  process.exit(1);
});
