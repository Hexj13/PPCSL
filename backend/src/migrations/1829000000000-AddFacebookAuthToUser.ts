import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFacebookAuthToUser1829000000000 implements MigrationInterface {
  name = 'AddFacebookAuthToUser1829000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    if (!usersTable?.findColumnByName('facebook_id')) {
      await queryRunner.query(`ALTER TABLE "users" ADD "facebook_id" character varying`);
    }
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_facebook_id" ON "users" ("facebook_id") WHERE "facebook_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_users_facebook_id"`);
    const usersTable = await queryRunner.getTable('users');
    if (usersTable?.findColumnByName('facebook_id')) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "facebook_id"`);
    }
  }
}
