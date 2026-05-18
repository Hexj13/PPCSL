import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVideoToListings1821000000000 implements MigrationInterface {
  name = 'AddVideoToListings1821000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');
    const column = table?.findColumnByName('video');

    if (!column) {
      await queryRunner.query(`ALTER TABLE "listings" ADD "video" jsonb`);
    }

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "listings_video_status_idx" ON "listings" ((("video"->>'status'))) WHERE "video" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "listings_video_status_idx"`);
    const table = await queryRunner.getTable('listings');
    const column = table?.findColumnByName('video');
    if (column) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "video"`);
    }
  }
}
