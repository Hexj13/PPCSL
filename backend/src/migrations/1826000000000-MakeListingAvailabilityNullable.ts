import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeListingAvailabilityNullable1826000000000 implements MigrationInterface {
  name = 'MakeListingAvailabilityNullable1826000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const listingsTable = await queryRunner.getTable('listings');
    const availabilityColumn = listingsTable?.findColumnByName('availability');
    if (!availabilityColumn) {
      return;
    }

    if (availabilityColumn.default != null) {
      await queryRunner.query(`
        ALTER TABLE "listings" ALTER COLUMN "availability" DROP DEFAULT
      `);
    }

    if (!availabilityColumn.isNullable) {
      await queryRunner.query(`
        ALTER TABLE "listings" ALTER COLUMN "availability" DROP NOT NULL
      `);
      await queryRunner.query(`
        UPDATE "listings" SET "availability" = NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const listingsTable = await queryRunner.getTable('listings');
    const availabilityColumn = listingsTable?.findColumnByName('availability');
    if (!availabilityColumn) {
      return;
    }

    await queryRunner.query(`
      UPDATE "listings" SET "availability" = 'InStock' WHERE "availability" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "listings" ALTER COLUMN "availability" SET DEFAULT 'InStock'
    `);
    await queryRunner.query(`
      ALTER TABLE "listings" ALTER COLUMN "availability" SET NOT NULL
    `);
  }
}
