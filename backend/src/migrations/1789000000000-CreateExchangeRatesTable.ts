import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table, TableIndex, TableUnique } from 'typeorm';

export class CreateExchangeRatesTable1789000000000 implements MigrationInterface {
  name = 'CreateExchangeRatesTable1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('exchange_rates');
    if (!table) {
      await queryRunner.createTable(
        new Table({
          name: 'exchange_rates',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'uuid_generate_v4()',
            },
            {
              name: 'base_currency_code',
              type: 'varchar',
              length: '3',
              isNullable: false,
            },
            {
              name: 'quote_currency_code',
              type: 'varchar',
              length: '3',
              isNullable: false,
            },
            {
              name: 'rate',
              type: 'decimal',
              precision: 18,
              scale: 8,
              isNullable: false,
            },
            {
              name: 'rate_date',
              type: 'date',
              isNullable: false,
            },
            {
              name: 'source',
              type: 'varchar',
              length: '50',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              isNullable: false,
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              isNullable: false,
            },
          ],
        }),
        true,
      );

      await queryRunner.createUniqueConstraint(
        'exchange_rates',
        new TableUnique({
          name: 'UQ_exchange_rates_base_quote_date',
          columnNames: ['base_currency_code', 'quote_currency_code', 'rate_date'],
        }),
      );

      await queryRunner.createIndex(
        'exchange_rates',
        new TableIndex({
          name: 'IDX_exchange_rates_quote_date',
          columnNames: ['quote_currency_code', 'rate_date'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('exchange_rates');
    if (table) {
      await queryRunner.dropTable('exchange_rates');
    }
  }
}
