import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIpFieldsToUser1770000000000 implements MigrationInterface {
  name = 'AddIpFieldsToUser1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const registrationIpColumn = table?.findColumnByName('registration_ip');
    const lastLoginIpColumn = table?.findColumnByName('last_login_ip');

    if (!registrationIpColumn) {
      await queryRunner.query(`ALTER TABLE "users" ADD "registration_ip" varchar`);
    }

    if (!lastLoginIpColumn) {
      await queryRunner.query(`ALTER TABLE "users" ADD "last_login_ip" varchar`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const registrationIpColumn = table?.findColumnByName('registration_ip');
    const lastLoginIpColumn = table?.findColumnByName('last_login_ip');

    if (registrationIpColumn) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "registration_ip"`);
    }

    if (lastLoginIpColumn) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_login_ip"`);
    }
  }
}
