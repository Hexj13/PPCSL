import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { Listing } from '../../listings/entities/listing.entity';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['production', 'stage', 'development']);

async function updateListingTitles() {
  try {
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Connected to database');

    const listingRepo = AppDataSource.getRepository(Listing);
    const brandRepo = AppDataSource.getRepository(Brand);
    const modelRepo = AppDataSource.getRepository(VehicleModel);

    const listings = await listingRepo.find({
      relations: ['vehicle'],
    });

    console.log(`📝 Found ${listings.length} listings to update...`);

    let updated = 0;
    let skipped = 0;

    for (const listing of listings) {
      if (!listing.vehicle) {
        console.log(`⚠️  Listing ${listing.id} has no vehicle, skipping...`);
        skipped++;
        continue;
      }

      const vehicle = listing.vehicle;

      const brand = await brandRepo.findOne({ where: { id: vehicle.brand_id } });
      const model = await modelRepo.findOne({ where: { id: vehicle.model_id } });

      const titleParts: string[] = [];
      if (brand) titleParts.push(brand.name);
      if (model) titleParts.push(model.name);
      if (vehicle.year) titleParts.push(vehicle.year.toString());

      const baseTitle = titleParts.join(' ');

      let newTitle = baseTitle;
      if (!model?.vehicle_types?.includes('moto')) {
        const transmissionStr =
          vehicle.transmission === 'Automatic'
            ? 'Automatic'
            : vehicle.transmission === 'Manual'
              ? 'Manual'
              : vehicle.transmission === 'CVT'
                ? 'CVT'
                : '';
        newTitle = transmissionStr ? `${baseTitle} (${transmissionStr})` : baseTitle;
      }

      if (listing.title !== newTitle) {
        listing.title = newTitle;
        await listingRepo.save(listing);
        updated++;
        if (updated % 10 === 0) {
          console.log(`✅ Updated ${updated} listings...`);
        }
      } else {
        skipped++;
      }
    }

    console.log(`\n🎉 Done!`);
    console.log(`   Updated: ${updated} listings`);
    console.log(`   Skipped: ${skipped} listings`);
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

updateListingTitles().catch(() => {
  process.exit(1);
});
