import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPreferredLocaleToUser1807000000000 implements MigrationInterface {
  name = 'AddPreferredLocaleToUser1807000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    if (!usersTable?.findColumnByName('preferred_locale')) {
      await queryRunner.query(`ALTER TABLE "users" ADD "preferred_locale" character varying`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    if (usersTable?.findColumnByName('preferred_locale')) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "preferred_locale"`);
    }
  }
}
