import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { Listing } from '../listings/entities/listing.entity';
import { Brand } from '../brands/entities/brand.entity';
import { VehicleModel } from '../brands/entities/vehicle-model.entity';

async function updateListingTitles() {
  try {
    console.log('🔌 Поврзување со базата на податоци...');
    await AppDataSource.initialize();
    console.log('✅ Поврзано со базата на податоци');

    const listingRepo = AppDataSource.getRepository(Listing);
    const brandRepo = AppDataSource.getRepository(Brand);
    const modelRepo = AppDataSource.getRepository(VehicleModel);

    const listings = await listingRepo.find({
      relations: ['vehicle'],
    });

    console.log(`📝 Пронајдени ${listings.length} објави за ажурирање...`);

    let updated = 0;
    let skipped = 0;

    for (const listing of listings) {
      if (!listing.vehicle) {
        console.log(`⚠️  Објава ${listing.id} нема vehicle, прескокнување...`);
        skipped++;
        continue;
      }

      const vehicle = listing.vehicle;

      const brand = await brandRepo.findOne({ where: { id: vehicle.brand_id } });
      const model = await modelRepo.findOne({ where: { id: vehicle.model_id } });

      const titleParts = [];
      if (brand) titleParts.push(brand.name);
      if (model) titleParts.push(model.name);
      if (vehicle.year) titleParts.push(vehicle.year.toString());

      const transmissionStr =
        vehicle.transmission === 'Automatic'
          ? 'Автоматска'
          : vehicle.transmission === 'Manual'
            ? 'Мануелна'
            : vehicle.transmission === 'CVT'
              ? 'Варијатор'
              : '';

      const baseTitle = titleParts.join(' ');
      const newTitle = transmissionStr ? `${baseTitle} (${transmissionStr})` : baseTitle;

      if (listing.title !== newTitle) {
        listing.title = newTitle;
        await listingRepo.save(listing);
        updated++;
        if (updated % 10 === 0) {
          console.log(`✅ Ажурирани ${updated} објави...`);
        }
      } else {
        skipped++;
      }
    }

    console.log(`\n🎉 Завршено!`);
    console.log(`   Ажурирани: ${updated} објави`);
    console.log(`   Прескокнати: ${skipped} објави`);
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

updateListingTitles();
