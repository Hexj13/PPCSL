import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveIsActiveFromBrandsAndModels1792000000000 implements MigrationInterface {
  name = 'RemoveIsActiveFromBrandsAndModels1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const brandsHasIsActive = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'brands' AND column_name = 'is_active'
    `);
    if (Array.isArray(brandsHasIsActive) && brandsHasIsActive.length > 0) {
      await queryRunner.query(`ALTER TABLE "brands" DROP COLUMN "is_active"`);
    }

    const modelsHasIsActive = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'vehicle_models' AND column_name = 'is_active'
    `);
    if (Array.isArray(modelsHasIsActive) && modelsHasIsActive.length > 0) {
      await queryRunner.query(`ALTER TABLE "vehicle_models" DROP COLUMN "is_active"`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const brandsHasIsActive = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'brands' AND column_name = 'is_active'
    `);
    if (Array.isArray(brandsHasIsActive) && brandsHasIsActive.length === 0) {
      await queryRunner.query(`ALTER TABLE "brands" ADD "is_active" boolean NOT NULL DEFAULT true`);
    }

    const modelsHasIsActive = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'vehicle_models' AND column_name = 'is_active'
    `);
    if (Array.isArray(modelsHasIsActive) && modelsHasIsActive.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "vehicle_models" ADD "is_active" boolean NOT NULL DEFAULT true`,
      );
    }
  }
}
