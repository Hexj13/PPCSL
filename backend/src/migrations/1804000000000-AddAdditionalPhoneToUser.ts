import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdditionalPhoneToUser1804000000000 implements MigrationInterface {
  name = 'AddAdditionalPhoneToUser1804000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    if (!usersTable?.findColumnByName('additional_phone')) {
      await queryRunner.query(`ALTER TABLE "users" ADD "additional_phone" character varying`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    if (usersTable?.findColumnByName('additional_phone')) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "additional_phone"`);
    }
  }
}
