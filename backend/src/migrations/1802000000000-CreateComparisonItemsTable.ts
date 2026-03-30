import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table, TableForeignKey, TableIndex, TableUnique } from 'typeorm';

export class CreateComparisonItemsTable1802000000000 implements MigrationInterface {
  name = 'CreateComparisonItemsTable1802000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('comparison_items');
    if (table) return;

    await queryRunner.createTable(
      new Table({
        name: 'comparison_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'user_id', type: 'uuid', isNullable: false },
          { name: 'listing_id', type: 'uuid', isNullable: false },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'comparison_items',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'comparison_items',
      new TableForeignKey({
        columnNames: ['listing_id'],
        referencedTableName: 'listings',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
      }),
    );

    await queryRunner.createIndex(
      'comparison_items',
      new TableIndex({
        name: 'IDX_comparison_items_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'comparison_items',
      new TableIndex({
        name: 'IDX_comparison_items_listing_id',
        columnNames: ['listing_id'],
      }),
    );

    await queryRunner.createIndex(
      'comparison_items',
      new TableIndex({
        name: 'IDX_comparison_items_created_at',
        columnNames: ['created_at'],
      }),
    );

    await queryRunner.createUniqueConstraint(
      'comparison_items',
      new TableUnique({
        name: 'UQ_comparison_items_user_listing',
        columnNames: ['user_id', 'listing_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('comparison_items');
  }
}
