import 'reflect-metadata';

import { checkEnvironment, checkPlatform } from '../script-guard';
import { seedVehicleCatalog } from '../stage/seed-vehicle-catalog';

checkEnvironment(['production', 'stage', 'development', 'test']);
checkPlatform(['common']);

/**
 * Historical “complete” orchestrator (regional + truck/moto scripts).
 * Source of truth is now vehicle-catalog.json — same as seed:all-brands:prod.
 */
async function seedAllBrandsComplete() {
  console.log('🌱 Full brand/model seed from vehicle-catalog.json...\n');
  if (process.argv.includes('--skip-heavy')) {
    console.log('ℹ️  --skip-heavy is ignored (catalog seed has no heavy regional scripts)\n');
  }
  await seedVehicleCatalog();
}

seedAllBrandsComplete()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Error: ${message}`);
    process.exit(1);
  });
