import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLastListingRefreshAtToUser1788000000000 implements MigrationInterface {
  name = 'AddLastListingRefreshAtToUser1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const column = table?.findColumnByName('last_listing_refresh_at');

    if (!column) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "last_listing_refresh_at" TIMESTAMP WITH TIME ZONE`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const column = table?.findColumnByName('last_listing_refresh_at');

    if (column) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_listing_refresh_at"`);
    }
  }
}
