import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLastListingRefreshReminderSentAtToUser1805000000000 implements MigrationInterface {
  name = 'AddLastListingRefreshReminderSentAtToUser1805000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const column = table?.findColumnByName('last_listing_refresh_reminder_sent_at');

    if (!column) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "last_listing_refresh_reminder_sent_at" TIMESTAMP WITH TIME ZONE`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const column = table?.findColumnByName('last_listing_refresh_reminder_sent_at');

    if (column) {
      await queryRunner.query(
        `ALTER TABLE "users" DROP COLUMN "last_listing_refresh_reminder_sent_at"`,
      );
    }
  }
}
