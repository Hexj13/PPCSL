import 'reflect-metadata';
import { AppDataSource } from '../../data-source';
import { Vehicle } from '../../listings/entities/vehicle.entity';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);

async function updateEngineVolumes() {
  try {
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Connected to database');

    const vehicleRepo = AppDataSource.getRepository(Vehicle);

    console.log('🔍 Searching for all vehicles with engine...');
    const vehicles = await vehicleRepo
      .createQueryBuilder('vehicle')
      .where('vehicle.engine_displ_l IS NOT NULL')
      .getMany();

    console.log(`📊 Found ${vehicles.length} vehicles with engine`);

    let updatedCount = 0;

    for (const vehicle of vehicles) {
      if (vehicle.engine_displ_l !== null && vehicle.engine_displ_l !== undefined) {
        const oldValue =
          typeof vehicle.engine_displ_l === 'string'
            ? parseFloat(vehicle.engine_displ_l)
            : vehicle.engine_displ_l;
        const newValue = parseFloat(oldValue.toFixed(1));

        if (Math.abs(oldValue - newValue) > 0.001) {
          vehicle.engine_displ_l = newValue;
          await vehicleRepo.save(vehicle);
          updatedCount++;

          if (updatedCount % 10 === 0) {
            console.log(`   Updated ${updatedCount}/${vehicles.length} vehicles...`);
          }
        }
      }
    }

    console.log(`✅ Updated ${updatedCount} vehicles!`);
    console.log(`   ${vehicles.length - updatedCount} vehicles already had correct format.`);
  } catch (error) {
    console.error('❌ Error during update:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

updateEngineVolumes()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
