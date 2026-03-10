import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvailableInCreditAndDownPaymentToListings1793000000000 implements MigrationInterface {
  name = 'AddAvailableInCreditAndDownPaymentToListings1793000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');
    if (!table?.findColumnByName('available_in_credit')) {
      await queryRunner.query(`
        ALTER TABLE "listings" ADD "available_in_credit" boolean NOT NULL DEFAULT false
      `);
    }
    if (!table?.findColumnByName('down_payment_amount')) {
      await queryRunner.query(`
        ALTER TABLE "listings" ADD "down_payment_amount" integer
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');
    if (table?.findColumnByName('available_in_credit')) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "available_in_credit"`);
    }
    if (table?.findColumnByName('down_payment_amount')) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "down_payment_amount"`);
    }
  }
}
