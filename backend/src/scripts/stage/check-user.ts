import 'reflect-metadata';

import { AppDataSource } from '../../data-source';
import { User } from '../../users/entities/user.entity';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);

async function checkUser() {
  try {
    console.log('🔌 Поврзување со базата на податоци...');
    await AppDataSource.initialize();
    console.log('✅ Поврзано со базата на податоци');

    const userRepo = AppDataSource.getRepository(User);
    const phone = '+38267419050';

    const user = await userRepo.findOne({ where: { phone } });

    if (!user) {
      console.log(`❌ Корисник со телефон ${phone} не е пронајден`);
    } else {
      console.log(`✅ Пронајден корисник:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   Телефон: ${user.phone}`);
      console.log(`   Име: ${user.firstName || 'N/A'}`);
      console.log(`   Презиме: ${user.lastName || 'N/A'}`);
      console.log(`   Компанија: ${user.companyName || 'N/A'}`);
      console.log(`   Тип: ${user.type}`);
      console.log(`   Активен: ${user.active}`);
      console.log(`\n📱 Достапни месенџери:`);
      console.log(`   Viber: ${user.viber ? '✅ Да' : '❌ Не'}`);
      console.log(`   WhatsApp: ${user.whatsapp ? '✅ Да' : '❌ Не'}`);
      console.log(`   Telegram: ${user.telegram ? '✅ Да' : '❌ Не'}`);
      console.log(`\n🔔 Известувања:`);
      console.log(`   Email известувања: ${user.emailNotifications ? '✅ Да' : '❌ Не'}`);
      console.log(`   Телефон потврден: ${user.phoneVerified ? '✅ Да' : '❌ Не'}`);
      console.log(`   Email потврден: ${user.emailVerified ? '✅ Да' : '❌ Не'}`);
    }

    console.log('\n🎉 Завршено!');
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

checkUser();
