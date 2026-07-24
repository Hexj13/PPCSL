import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPopularCountryToBrands1825000000000 implements MigrationInterface {
  name = 'AddPopularCountryToBrands1825000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const columnExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'brands' AND column_name = 'popular_country'
    `);

    if (columnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "brands" ADD "popular_country" character varying(32)
      `);
    }

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_brands_popular_country"
      ON "brands"("popular_country")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_brands_popular_country"`);

    const columnExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'brands' AND column_name = 'popular_country'
    `);

    if (columnExists.length > 0) {
      await queryRunner.query(`ALTER TABLE "brands" DROP COLUMN "popular_country"`);
    }
  }
}
