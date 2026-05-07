import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSlugAndVideoToListings1820000000000 implements MigrationInterface {
  name = 'AddSlugAndVideoToListings1820000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');

    if (table && !table.findColumnByName('slug')) {
      await queryRunner.query(`ALTER TABLE "listings" ADD "slug" varchar(160)`);
    }

    if (table && !table.findColumnByName('video')) {
      await queryRunner.query(`ALTER TABLE "listings" ADD "video" jsonb`);
    }

    await queryRunner.query(`
      UPDATE "listings"
      SET "slug" = LEFT(
        TRIM(BOTH '-' FROM REGEXP_REPLACE(
          LOWER(COALESCE("title", '') || ' ' || COALESCE("city", '')),
          '[^a-z0-9]+',
          '-',
          'g'
        )),
        120
      )
      WHERE "slug" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "listings"
      SET "slug" = 'listing'
      WHERE "slug" IS NULL OR "slug" = ''
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listings_slug" ON "listings" ("slug") WHERE "slug" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listings_processing_video_jobs"
      ON "listings" ((video->>'jobId'))
      WHERE video->>'status' = 'processing'
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_listings_video_mp4_key"
      ON "listings" ((video->>'mp4Key'))
      WHERE video->>'mp4Key' IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_listings_video_mp4_key"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_processing_video_jobs"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_slug"`);

    const table = await queryRunner.getTable('listings');
    if (table?.findColumnByName('video')) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "video"`);
    }
    if (table?.findColumnByName('slug')) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "slug"`);
    }
  }
}
