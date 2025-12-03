import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveAutoUpdateLastUpdatedAtTrigger1772000000000 implements MigrationInterface {
  name = 'RemoveAutoUpdateLastUpdatedAtTrigger1772000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_update_listing_last_updated_at ON listings;`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_listing_last_updated_at();`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_listing_last_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'UPDATE' THEN
          NEW.last_updated_at = CURRENT_TIMESTAMP;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_update_listing_last_updated_at
      BEFORE UPDATE ON listings
      FOR EACH ROW
      WHEN (OLD.* IS DISTINCT FROM NEW.*)
      EXECUTE FUNCTION update_listing_last_updated_at();
    `);
  }
}
