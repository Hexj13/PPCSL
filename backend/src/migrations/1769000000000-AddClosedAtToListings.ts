import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClosedAtToListings1769000000000 implements MigrationInterface {
  name = 'AddClosedAtToListings1769000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');
    const closedAtColumn = table?.findColumnByName('closed_at');
    if (!closedAtColumn) {
      await queryRunner.query(`
        ALTER TABLE "listings" ADD "closed_at" timestamp
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');
    const closedAtColumn = table?.findColumnByName('closed_at');
    if (closedAtColumn) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "closed_at"`);
    }
  }
}
