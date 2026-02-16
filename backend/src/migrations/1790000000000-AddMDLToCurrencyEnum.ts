import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMDLToCurrencyEnum1790000000000 implements MigrationInterface {
  name = 'AddMDLToCurrencyEnum1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "listings_currency_enum" ADD VALUE IF NOT EXISTS 'MDL'`);
  }

  public async down(): Promise<void> {}
}
