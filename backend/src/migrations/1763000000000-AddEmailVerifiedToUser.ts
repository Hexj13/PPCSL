import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerifiedToUser1763000000000 implements MigrationInterface {
  name = 'AddEmailVerifiedToUser1763000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const emailVerifiedColumn = table?.findColumnByName('emailVerified');
    if (!emailVerifiedColumn) {
      await queryRunner.query(`ALTER TABLE "users" ADD "emailVerified" boolean`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const emailVerifiedColumn = table?.findColumnByName('emailVerified');
    if (emailVerifiedColumn) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "emailVerified"`);
    }
  }
}
