import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table, TableForeignKey, TableIndex, TableUnique } from 'typeorm';

export class CreateListingAiReportsTable1792000000000 implements MigrationInterface {
  name = 'CreateListingAiReportsTable1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    let table = await queryRunner.getTable('listing_ai_reports');
    if (!table) {
      await queryRunner.createTable(
        new Table({
          name: 'listing_ai_reports',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'uuid_generate_v4()',
            },
            {
              name: 'listing_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'report_language',
              type: 'varchar',
              length: '2',
              isNullable: false,
            },
            {
              name: 'input_hash',
              type: 'varchar',
              length: '64',
              isNullable: false,
            },
            {
              name: 'report',
              type: 'jsonb',
              isNullable: false,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        true,
      );
      table = await queryRunner.getTable('listing_ai_reports');
    }

    if (!table) {
      return;
    }

    const hasCompositeUnique = table.uniques.some(
      (u) =>
        u.columnNames.length === 3 &&
        u.columnNames.includes('listing_id') &&
        u.columnNames.includes('report_language') &&
        u.columnNames.includes('input_hash'),
    );
    if (!hasCompositeUnique) {
      await queryRunner.createUniqueConstraint(
        'listing_ai_reports',
        new TableUnique({
          name: 'UQ_listing_ai_reports_listing_lang_hash',
          columnNames: ['listing_id', 'report_language', 'input_hash'],
        }),
      );
      table = await queryRunner.getTable('listing_ai_reports');
    }

    if (!table) {
      return;
    }

    const hasListingFk = table.foreignKeys.some(
      (fk) =>
        fk.columnNames.length === 1 &&
        fk.columnNames[0] === 'listing_id' &&
        fk.referencedTableName === 'listings',
    );
    if (!hasListingFk) {
      await queryRunner.createForeignKey(
        'listing_ai_reports',
        new TableForeignKey({
          columnNames: ['listing_id'],
          referencedTableName: 'listings',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
    }

    const hasListingIdIndex = table.indices.some(
      (i) => i.name === 'IDX_listing_ai_reports_listing_id',
    );
    if (!hasListingIdIndex) {
      await queryRunner.createIndex(
        'listing_ai_reports',
        new TableIndex({
          name: 'IDX_listing_ai_reports_listing_id',
          columnNames: ['listing_id'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listing_ai_reports');
    if (table) {
      await queryRunner.dropTable('listing_ai_reports');
    }
  }
}
