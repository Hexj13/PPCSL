import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddListingLastUpdatedSortIndex1822000000000 implements MigrationInterface {
  name = 'AddListingLastUpdatedSortIndex1822000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listings_search_sort_last_updated"
      ON "listings" ("is_promoted" DESC, "last_updated_at" DESC, "id" ASC)
      WHERE "status" = 'Active';
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_update_listing_views_count ON listing_views;
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS update_listing_views_count();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_listing_views_count()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE listings SET views = views + 1 WHERE id = NEW.listing_id;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_update_listing_views_count
      AFTER INSERT ON listing_views
      FOR EACH ROW
      EXECUTE FUNCTION update_listing_views_count();
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_search_sort_last_updated";`);
  }
}
