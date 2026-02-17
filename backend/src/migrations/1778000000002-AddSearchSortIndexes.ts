import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSearchSortIndexes1778000000002 implements MigrationInterface {
  name = 'AddSearchSortIndexes1778000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listings_search_sort_created" 
      ON "listings" ("is_promoted" DESC, "created_at" DESC) 
      WHERE "status" = 'Active';
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listings_search_sort_price" 
      ON "listings" ("is_promoted" DESC, "price" ASC) 
      WHERE "status" = 'Active';
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listings_search_sort_views" 
      ON "listings" ("is_promoted" DESC, "views" DESC) 
      WHERE "status" = 'Active';
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vehicles_year_desc" 
      ON "vehicles" ("year" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vehicles_year_desc";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_search_sort_views";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_search_sort_price";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_search_sort_created";`);
  }
}
