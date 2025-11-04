import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhoneVerifiedToUser1762999999999 implements MigrationInterface {
  name = 'AddPhoneVerifiedToUser1762999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const phoneVerifiedColumn = table?.findColumnByName('phoneVerified');
    if (!phoneVerifiedColumn) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "phoneVerified" boolean NOT NULL DEFAULT false`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const phoneVerifiedColumn = table?.findColumnByName('phoneVerified');
    if (phoneVerifiedColumn) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phoneVerified"`);
    }
  }
}
