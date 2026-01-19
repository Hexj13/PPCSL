import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVehicleTypesToBrandsAndModels1779000000000 implements MigrationInterface {
  name = 'AddVehicleTypesToBrandsAndModels1779000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const enumTypeExists = await queryRunner.query(`
      SELECT 1 FROM pg_type WHERE typname = 'vehicle_type_enum'
    `);

    if (enumTypeExists.length === 0) {
      await queryRunner.query(
        `CREATE TYPE "public"."vehicle_type_enum" AS ENUM('car', 'truck', 'moto')`,
      );
    }

    const brandsColumnExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'brands' AND column_name = 'vehicle_types'
    `);

    if (brandsColumnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "brands" ADD "vehicle_types" text[]
      `);
    }

    const modelsColumnExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'vehicle_models' AND column_name = 'vehicle_type'
    `);

    if (modelsColumnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "vehicle_models" ADD "vehicle_type" "public"."vehicle_type_enum"
      `);
    }

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_brands_vehicle_types" 
      ON "brands"("vehicle_types")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_vehicle_models_vehicle_type" 
      ON "vehicle_models"("vehicle_type")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_vehicle_models_brand_type" 
      ON "vehicle_models"("brand_id", "vehicle_type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_vehicle_models_brand_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_vehicle_models_vehicle_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_brands_vehicle_types"`);

    const modelsColumnExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'vehicle_models' AND column_name = 'vehicle_type'
    `);

    if (modelsColumnExists.length > 0) {
      await queryRunner.query(`ALTER TABLE "vehicle_models" DROP COLUMN "vehicle_type"`);
    }

    const brandsColumnExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'brands' AND column_name = 'vehicle_types'
    `);

    if (brandsColumnExists.length > 0) {
      await queryRunner.query(`ALTER TABLE "brands" DROP COLUMN "vehicle_types"`);
    }

    await queryRunner.query(`DROP TYPE IF EXISTS "public"."vehicle_type_enum"`);
  }
}
