import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleAuthFields1792000000000 implements MigrationInterface {
  name = 'AddGoogleAuthFields1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    if (!table?.findColumnByName('google_id')) {
      await queryRunner.query(`ALTER TABLE "users" ADD "google_id" character varying`);
    }
    if (!table?.findColumnByName('auth_provider')) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "auth_provider" character varying(16) NOT NULL DEFAULT 'local'`,
      );
    }
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_google_id" ON "users" ("google_id") WHERE "google_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_users_google_id"`);
    const table = await queryRunner.getTable('users');
    if (table?.findColumnByName('auth_provider')) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "auth_provider"`);
    }
    if (table?.findColumnByName('google_id')) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "google_id"`);
    }
    await queryRunner.query(`UPDATE "users" SET "password" = '' WHERE "password" IS NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL`);
  }
}
