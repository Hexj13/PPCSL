import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVehicleModelsVehicleTypesGinIndex1792000000000 implements MigrationInterface {
  name = 'AddVehicleModelsVehicleTypesGinIndex1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const columnExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'vehicle_models'
        AND column_name = 'vehicle_types'
    `);
    if (columnExists.length === 0) {
      return;
    }

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vehicle_models_vehicle_types_gin"
      ON "vehicle_models"
      USING gin (
        string_to_array(COALESCE(NULLIF(trim(both from "vehicle_types"), ''), ''), ',')
      )
      WHERE "is_archived" = false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vehicle_models_vehicle_types_gin"`);
  }
}
