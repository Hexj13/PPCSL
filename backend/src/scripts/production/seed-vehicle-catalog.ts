import 'reflect-metadata';

import { seedVehicleCatalog } from '../stage/seed-vehicle-catalog';

seedVehicleCatalog()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Error: ${message}`);
    process.exit(1);
  });
