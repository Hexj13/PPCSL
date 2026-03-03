import type { MigrationInterface, QueryRunner } from 'typeorm';

export class FixSearchSortCreatedIndex1792000000000 implements MigrationInterface {
  name = 'FixSearchSortCreatedIndex1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_search_sort_created";`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listings_search_sort_created"
      ON "listings" ("is_promoted" DESC, "last_updated_at" DESC, "id" ASC)
      WHERE "status" = 'Active';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_search_sort_created";`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listings_search_sort_created"
      ON "listings" ("is_promoted" DESC, "created_at" DESC)
      WHERE "status" = 'Active';
    `);
  }
}
