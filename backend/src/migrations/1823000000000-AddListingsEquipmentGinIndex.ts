import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddListingsEquipmentGinIndex1823000000000 implements MigrationInterface {
  name = 'AddListingsEquipmentGinIndex1823000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listings_equipment_trgm"
      ON "listings"
      USING gin ("equipment" gin_trgm_ops)
      WHERE "equipment" IS NOT NULL AND "equipment" <> ''
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_equipment_trgm"`);
  }
}
