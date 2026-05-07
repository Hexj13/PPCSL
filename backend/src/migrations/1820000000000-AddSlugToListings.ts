import type { MigrationInterface, QueryRunner } from 'typeorm';

import { buildListingSlugPart } from '../listings/application/utils/listing-url-slug.utils';

export class AddSlugToListings1820000000000 implements MigrationInterface {
  name = 'AddSlugToListings1820000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');
    const column = table?.findColumnByName('slug');

    if (!column) {
      await queryRunner.query(`ALTER TABLE "listings" ADD "slug" character varying(160)`);
    }

    const rows: { id: string; title: string; city: string }[] = await queryRunner.query(
      `SELECT id, title, city FROM "listings" WHERE "slug" IS NULL`,
    );

    for (const row of rows) {
      const slug = buildListingSlugPart(row.title, row.city);
      await queryRunner.query(`UPDATE "listings" SET "slug" = $1 WHERE "id" = $2`, [slug, row.id]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');
    const column = table?.findColumnByName('slug');

    if (column) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "slug"`);
    }
  }
}
