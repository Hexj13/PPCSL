import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsParsedToListings1828000000000 implements MigrationInterface {
  name = 'AddIsParsedToListings1828000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');
    if (!table?.findColumnByName('is_parsed')) {
      await queryRunner.query(`
        ALTER TABLE "listings"
        ADD "is_parsed" boolean NOT NULL DEFAULT false
      `);
    }
    await queryRunner.query(`
      UPDATE "listings"
      SET "is_parsed" = true
      WHERE "partner_source_code" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');
    if (table?.findColumnByName('is_parsed')) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "is_parsed"`);
    }
  }
}
