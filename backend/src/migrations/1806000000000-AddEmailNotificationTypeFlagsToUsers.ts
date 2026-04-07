import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailNotificationTypeFlagsToUsers1806000000000 implements MigrationInterface {
  name = 'AddEmailNotificationTypeFlagsToUsers1806000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const listingRefreshColumn = table?.findColumnByName(
      'emailNotificationListingRefreshReminders',
    );
    const weeklyDigestColumn = table?.findColumnByName('emailNotificationWeeklyViewsDigest');

    if (!listingRefreshColumn) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "emailNotificationListingRefreshReminders" boolean NOT NULL DEFAULT false`,
      );
    }

    if (!weeklyDigestColumn) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "emailNotificationWeeklyViewsDigest" boolean NOT NULL DEFAULT false`,
      );
    }

    await queryRunner.query(
      `UPDATE "users"
       SET "emailNotificationListingRefreshReminders" = "emailNotifications",
           "emailNotificationWeeklyViewsDigest" = "emailNotifications"
       WHERE "emailNotifications" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const listingRefreshColumn = table?.findColumnByName(
      'emailNotificationListingRefreshReminders',
    );
    const weeklyDigestColumn = table?.findColumnByName('emailNotificationWeeklyViewsDigest');

    if (listingRefreshColumn) {
      await queryRunner.query(
        `ALTER TABLE "users" DROP COLUMN "emailNotificationListingRefreshReminders"`,
      );
    }

    if (weeklyDigestColumn) {
      await queryRunner.query(
        `ALTER TABLE "users" DROP COLUMN "emailNotificationWeeklyViewsDigest"`,
      );
    }
  }
}
