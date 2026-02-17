import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLastEditedAndLastPublishedAt1773000000000 implements MigrationInterface {
  name = 'AddLastEditedAndLastPublishedAt1773000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');

    const lastEditedAtColumn = table?.findColumnByName('last_edited_at');
    if (!lastEditedAtColumn) {
      await queryRunner.query(`
        ALTER TABLE "listings" ADD "last_edited_at" timestamp
      `);
    }

    const lastPublishedAtColumn = table?.findColumnByName('last_published_at');
    if (!lastPublishedAtColumn) {
      await queryRunner.query(`
        ALTER TABLE "listings" ADD "last_published_at" timestamp
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');

    const lastEditedAtColumn = table?.findColumnByName('last_edited_at');
    if (lastEditedAtColumn) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "last_edited_at"`);
    }

    const lastPublishedAtColumn = table?.findColumnByName('last_published_at');
    if (lastPublishedAtColumn) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "last_published_at"`);
    }
  }
}
