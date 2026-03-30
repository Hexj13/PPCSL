import 'reflect-metadata';

import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { determineVehicleType } from '../data/vehicle-classification';
import { checkEnvironment, checkPlatform } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);
checkPlatform(['md']);

interface AuditResult {
  brand: string;
  model: string;
  currentType: string | null;
  expectedType: string;
  mismatch: boolean;
}

async function auditVehicleTypes(fix: boolean = false) {
  console.log('🔍 Auditing vehicle types classification...\n');

  if (fix) {
    console.log('⚠️  FIX mode enabled: will correct mismatches\n');
  }

  await AppDataSource.initialize();
  console.log('✅ Connected to database\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);

  const allBrands = await brandRepo.find({
    relations: ['models'],
  });

  console.log(`📦 Found ${allBrands.length} brands to audit\n`);

  const mismatches: AuditResult[] = [];
  const stats = {
    totalModels: 0,
    correctModels: 0,
    mismatchedModels: 0,
    fixedModels: 0,
    byType: {
      car: { total: 0, correct: 0, mismatched: 0 },
      truck: { total: 0, correct: 0, mismatched: 0 },
      moto: { total: 0, correct: 0, mismatched: 0 },
    },
  };

  for (const brand of allBrands) {
    const models = brand.models || [];
    const modelsToFix: VehicleModel[] = [];

    for (const model of models) {
      stats.totalModels++;
      const expectedType = determineVehicleType(model.name, brand.name);
      const currentType = model.vehicle_types?.[0];

      stats.byType[expectedType].total++;

      if (currentType !== expectedType) {
        stats.mismatchedModels++;
        stats.byType[expectedType].mismatched++;

        mismatches.push({
          brand: brand.name,
          model: model.name,
          currentType,
          expectedType,
          mismatch: true,
        });

        if (fix) {
          model.vehicle_types = [expectedType];
          modelsToFix.push(model);
        }
      } else {
        stats.correctModels++;
        stats.byType[expectedType].correct++;
      }
    }

    if (fix && modelsToFix.length > 0) {
      await modelRepo.save(modelsToFix);
      stats.fixedModels += modelsToFix.length;
      console.log(`✅ Fixed ${modelsToFix.length} models for ${brand.name}`);
    }
  }

  console.log('\n📊 Audit Summary:');
  console.log(`   Total models: ${stats.totalModels}`);
  console.log(
    `   Correct: ${stats.correctModels} (${((stats.correctModels / stats.totalModels) * 100).toFixed(1)}%)`,
  );
  console.log(
    `   Mismatched: ${stats.mismatchedModels} (${((stats.mismatchedModels / stats.totalModels) * 100).toFixed(1)}%)`,
  );

  if (fix) {
    console.log(`   Fixed: ${stats.fixedModels}`);
  }

  console.log('\n📈 By Type:');
  console.log(
    `   CAR:   ${stats.byType.car.total} total, ${stats.byType.car.correct} correct, ${stats.byType.car.mismatched} mismatched`,
  );
  console.log(
    `   TRUCK: ${stats.byType.truck.total} total, ${stats.byType.truck.correct} correct, ${stats.byType.truck.mismatched} mismatched`,
  );
  console.log(
    `   MOTO:  ${stats.byType.moto.total} total, ${stats.byType.moto.correct} correct, ${stats.byType.moto.mismatched} mismatched`,
  );

  if (mismatches.length > 0 && !fix) {
    console.log('\n⚠️  Mismatched models (first 50):');
    mismatches.slice(0, 50).forEach((m) => {
      console.log(`   ${m.brand} ${m.model}: ${m.currentType || 'NULL'} → ${m.expectedType}`);
    });

    if (mismatches.length > 50) {
      console.log(`   ... and ${mismatches.length - 50} more`);
    }

    console.log('\n💡 Run with --fix to correct these mismatches');
  }

  if (fix && stats.fixedModels > 0) {
    console.log('\n🔄 Updating brand vehicle_types...');

    for (const brand of allBrands) {
      const updatedModels = await modelRepo.find({ where: { brand_id: brand.id } });
      const types = new Set<'car' | 'truck' | 'moto' | 'tire'>();

      for (const model of updatedModels) {
        const t = model.vehicle_types?.[0];
        if (t) types.add(t);
      }

      const brandTypes = Array.from(types).sort();
      const currentTypes = (brand.vehicle_types || []).sort();

      if (brandTypes.join(',') !== currentTypes.join(',')) {
        brand.vehicle_types = brandTypes;
        await brandRepo.save(brand);
      }
    }

    console.log('✅ Brand vehicle_types updated');
  }

  await AppDataSource.destroy();
  console.log('\n✅ Audit completed!');

  return {
    stats,
    mismatches,
  };
}

if (require.main === module) {
  const fix = process.argv.includes('--fix') || process.argv.includes('-f');

  auditVehicleTypes(fix)
    .then(() => {
      console.log('\n🎉 Vehicle types audit completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error during audit:', error);
      process.exit(1);
    });
}

export { auditVehicleTypes };
