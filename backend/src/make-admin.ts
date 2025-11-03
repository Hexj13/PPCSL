import 'reflect-metadata';
import { AppDataSource } from './data-source';
import { User, UserType } from './users/entities/user.entity';
import * as bcrypt from 'bcrypt';

async function makeAdmin() {
  try {
    console.log('🔌 Поврзување со базата на податоци...');
    await AppDataSource.initialize();
    console.log('✅ Поврзано со базата на податоци');

    const userRepo = AppDataSource.getRepository(User);
    const email = 'admin@admin.com';

    let admin = await userRepo.findOne({ where: { email } });

    if (!admin) {
      console.log(`👤 Креирање нов корисник ${email}...`);
      const hashedPassword = await bcrypt.hash('admin123', 10);
      admin = userRepo.create({
        email,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        phone: '+38970111111',
        type: UserType.Admin,
      });
      admin = await userRepo.save(admin);
      console.log('✅ Креиран нов админ корисник');
      console.log(`   Email: ${email}`);
      console.log(`   Парола: admin123`);
      console.log(`   Тип: Admin`);
    } else {
      console.log(`👤 Пронајден корисник ${email}`);
      const wasAdmin = admin.type === UserType.Admin;

      admin.type = UserType.Admin;
      admin = await userRepo.save(admin);

      if (wasAdmin) {
        console.log('✅ Корисникот веќе е админ');
      } else {
        console.log('✅ Корисникот е успешно направен админ');
      }
      console.log(`   Email: ${email}`);
      console.log(`   Тип: Admin`);
    }

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

makeAdmin();
