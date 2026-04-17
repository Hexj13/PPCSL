import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartnerListingCanonicalUrlToListings1792000000000 implements MigrationInterface {
  name = 'AddPartnerListingCanonicalUrlToListings1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');
    const col = table?.findColumnByName('partner_listing_canonical_url');
    if (!col) {
      await queryRunner.query(`
        ALTER TABLE "listings" ADD "partner_listing_canonical_url" text NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');
    const col = table?.findColumnByName('partner_listing_canonical_url');
    if (col) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "partner_listing_canonical_url"`);
    }
  }
}
