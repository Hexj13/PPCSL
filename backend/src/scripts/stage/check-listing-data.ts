import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { Listing } from '../../listings/entities/listing.entity';

async function checkListingData() {
  try {
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Connected to database');

    const listingId = '1ae3914a-473d-455e-ae0a-343404448328';

    const listingRepo = AppDataSource.getRepository(Listing);
    const brandRepo = AppDataSource.getRepository(Brand);
    const modelRepo = AppDataSource.getRepository(VehicleModel);

    const listing = await listingRepo.findOne({
      where: { id: listingId },
      relations: ['vehicle'],
    });

    if (!listing) {
      console.log('❌ Listing not found');
      return;
    }

    console.log('\n📋 Listing Info:');
    console.log(`  ID: ${listing.id}`);
    console.log(`  Title: ${listing.title}`);
    console.log(`  Vehicle ID: ${listing.vehicle_id}`);

    if (listing.vehicle) {
      const vehicle = listing.vehicle;
      console.log('\n🚗 Vehicle Info:');
      console.log(`  ID: ${vehicle.id}`);
      console.log(`  Brand ID: ${vehicle.brand_id}`);
      console.log(`  Model ID: ${vehicle.model_id}`);
      console.log(`  Year: ${vehicle.year}`);

      const brand = await brandRepo.findOne({ where: { id: vehicle.brand_id } });
      const model = await modelRepo.findOne({ where: { id: vehicle.model_id } });

      console.log('\n🏷️  Brand & Model:');
      console.log(`  Brand: ${brand?.name || 'NOT FOUND'} (ID: ${vehicle.brand_id})`);
      console.log(`  Model: ${model?.name || 'NOT FOUND'} (ID: ${vehicle.model_id})`);

      console.log('\n🔍 Checking for Aiways brand...');
      const aiwaysBrand = await brandRepo.findOne({ where: { name: 'Aiways' } });
      if (aiwaysBrand) {
        console.log(`  ✅ Aiways brand found: ${aiwaysBrand.id}`);
        const aiwaysModels = await modelRepo.find({ where: { brand_id: aiwaysBrand.id } });
        console.log(`  Models for Aiways: ${aiwaysModels.map((m) => m.name).join(', ')}`);

        const u5Model = aiwaysModels.find((m) => m.name.includes('U5'));
        if (u5Model) {
          console.log(`  ✅ U5 model found: ${u5Model.id}`);
        }
      } else {
        console.log('  ❌ Aiways brand not found');
      }
    }

    console.log('\n✅ Check completed');
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

checkListingData()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
