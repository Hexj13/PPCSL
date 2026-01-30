import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { checkEnvironment, checkPlatform } from '../script-guard';

checkEnvironment(['production', 'stage', 'development', 'test']);
checkPlatform(['common']);

const HAVAL_MODELS = new Set([
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'H7',
  'H8',
  'H9',
  'Jolion',
  'F7',
  'F7x',
  'Haval H2',
  'Haval H3',
  'Haval H6',
  'Haval H9',
  'Haval Jolion',
  'Haval F7',
  'Haval F7x',
]);
const TANK_MODELS = new Set([
  '300',
  '400',
  '500',
  '700',
  'Tank 300',
  'Tank 400',
  'Tank 500',
  'Tank 700',
]);
const RANGE_ROVER_MODELS = new Set([
  'Range Rover',
  'Range Rover Sport',
  'Range Rover Velar',
  'Range Rover Evoque',
  'Range Rover Classic',
  'Range Rover P38',
]);

async function applyBrandSplits() {
  console.log('🔄 Applying brand splits (Great Wall → Haval/Tank, Land Rover → Range Rover)...\n');

  if (!process.env.DB_SYNC) {
    process.env.DB_SYNC = 'false';
  }

  await AppDataSource.initialize();

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  let movedGreatWall = 0;
  let movedLandRover = 0;

  const greatWall = await brandRepo.findOne({ where: { name: 'Great Wall' }, select: ['id'] });
  const haval = await brandRepo.findOne({ where: { name: 'Haval' }, select: ['id'] });
  const tank = await brandRepo.findOne({ where: { name: 'Tank' }, select: ['id'] });
  const landRover = await brandRepo.findOne({ where: { name: 'Land Rover' }, select: ['id'] });
  const rangeRover = await brandRepo.findOne({ where: { name: 'Range Rover' }, select: ['id'] });

  if (greatWall && haval) {
    const greatWallModels = await modelRepo.find({
      where: { brand_id: greatWall.id },
      select: ['id', 'name', 'brand_id'],
    });
    for (const model of greatWallModels) {
      const nameNorm = model.name.trim();
      const isHaval =
        HAVAL_MODELS.has(nameNorm) ||
        /^Haval\s+/i.test(model.name) ||
        /^(H[2-9]|Jolion|F7x?)$/i.test(nameNorm);
      const isTank =
        TANK_MODELS.has(nameNorm) ||
        /^Tank\s+/i.test(model.name) ||
        /^(300|400|500|700)$/.test(nameNorm);
      if (isHaval && haval) {
        model.brand_id = haval.id;
        await modelRepo.save(model);
        movedGreatWall++;
      } else if (isTank && tank) {
        model.brand_id = tank.id;
        await modelRepo.save(model);
        movedGreatWall++;
      }
    }
  }

  if (landRover && rangeRover) {
    const landRoverModels = await modelRepo.find({
      where: { brand_id: landRover.id },
      select: ['id', 'name', 'brand_id'],
    });
    for (const model of landRoverModels) {
      const nameNorm = model.name.trim();
      if (RANGE_ROVER_MODELS.has(nameNorm) || /^Range Rover\s/i.test(model.name)) {
        model.brand_id = rangeRover.id;
        await modelRepo.save(model);
        movedLandRover++;
      }
    }
  }

  console.log(
    `\n📊 Moved from Great Wall to Haval/Tank: ${movedGreatWall}; from Land Rover to Range Rover: ${movedLandRover}`,
  );
  await AppDataSource.destroy();
}

if (require.main === module) {
  applyBrandSplits()
    .then(() => {
      console.log('\n✅ Done');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

export { applyBrandSplits };
