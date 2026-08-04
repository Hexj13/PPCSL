import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddALLToCurrencyEnum1827000000000 implements MigrationInterface {
  name = 'AddALLToCurrencyEnum1827000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "listings_currency_enum" ADD VALUE IF NOT EXISTS 'ALL'`);
  }

  public async down(): Promise<void> {}
}
