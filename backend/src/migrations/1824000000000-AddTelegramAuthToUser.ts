import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTelegramAuthToUser1824000000000 implements MigrationInterface {
  name = 'AddTelegramAuthToUser1824000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    if (!usersTable?.findColumnByName('telegram_id')) {
      await queryRunner.query(`ALTER TABLE "users" ADD "telegram_id" character varying`);
    }
    if (!usersTable?.findColumnByName('telegram_username')) {
      await queryRunner.query(`ALTER TABLE "users" ADD "telegram_username" character varying`);
    }
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_telegram_id" ON "users" ("telegram_id") WHERE "telegram_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_telegram_id"`);
    const usersTable = await queryRunner.getTable('users');
    if (usersTable?.findColumnByName('telegram_username')) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "telegram_username"`);
    }
    if (usersTable?.findColumnByName('telegram_id')) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "telegram_id"`);
    }
  }
}
