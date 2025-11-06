import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsNewToListing1765000000000 implements MigrationInterface {
  name = 'AddIsNewToListing1765000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');
    const isNewColumn = table?.findColumnByName('is_new');
    if (!isNewColumn) {
      await queryRunner.query(`ALTER TABLE "listings" ADD "is_new" boolean NOT NULL DEFAULT false`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');
    const isNewColumn = table?.findColumnByName('is_new');
    if (isNewColumn) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "is_new"`);
    }
  }
}
