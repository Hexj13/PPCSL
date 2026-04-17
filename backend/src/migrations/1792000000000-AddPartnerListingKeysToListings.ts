import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartnerListingKeysToListings1792000000000 implements MigrationInterface {
  name = 'AddPartnerListingKeysToListings1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    let table = await queryRunner.getTable('listings');
    if (!table?.findColumnByName('partner_source_code')) {
      await queryRunner.query(`
        ALTER TABLE "listings"
        ADD "partner_source_code" character varying(32)
      `);
    }
    table = await queryRunner.getTable('listings');
    if (!table?.findColumnByName('partner_listing_external_key')) {
      await queryRunner.query(`
        ALTER TABLE "listings"
        ADD "partner_listing_external_key" character varying(64)
      `);
    }
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_listings_partner_source_unique"
      ON "listings" ("partner_source_code", "partner_listing_external_key")
      WHERE "partner_source_code" IS NOT NULL AND "partner_listing_external_key" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_listings_partner_source_unique"`);
    let table = await queryRunner.getTable('listings');
    if (table?.findColumnByName('partner_listing_external_key')) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "partner_listing_external_key"`);
    }
    table = await queryRunner.getTable('listings');
    if (table?.findColumnByName('partner_source_code')) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "partner_source_code"`);
    }
  }
}
