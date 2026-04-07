import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLocalizedListingDescriptions1808000000000 implements MigrationInterface {
  name = 'AddLocalizedListingDescriptions1808000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('listings', 'description_ro'))) {
      await queryRunner.query(`ALTER TABLE "listings" ADD "description_ro" text`);
    }
    if (!(await queryRunner.hasColumn('listings', 'description_ru'))) {
      await queryRunner.query(`ALTER TABLE "listings" ADD "description_ru" text`);
    }
    await queryRunner.query(
      `UPDATE "listings" SET "description_ro" = "description" WHERE ("description_ro" IS NULL OR "description_ro" = '') AND "description" IS NOT NULL AND "description" <> ''`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN IF EXISTS "description_ru"`);
    await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN IF EXISTS "description_ro"`);
  }
}
