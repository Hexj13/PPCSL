import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailNotificationSecurityAlertsToUsers1809000000000 implements MigrationInterface {
  name = 'AddEmailNotificationSecurityAlertsToUsers1809000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const column = table?.findColumnByName('emailNotificationSecurityAlerts');

    if (!column) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "emailNotificationSecurityAlerts" boolean NOT NULL DEFAULT false`,
      );
    }

    await queryRunner.query(
      `UPDATE "users"
       SET "emailNotificationSecurityAlerts" = true
       WHERE "emailNotifications" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const column = table?.findColumnByName('emailNotificationSecurityAlerts');

    if (column) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "emailNotificationSecurityAlerts"`);
    }
  }
}
