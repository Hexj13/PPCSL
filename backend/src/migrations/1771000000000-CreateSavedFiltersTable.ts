import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateSavedFiltersTable1771000000000 implements MigrationInterface {
  name = 'CreateSavedFiltersTable1771000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('saved_filters');
    if (!table) {
      await queryRunner.createTable(
        new Table({
          name: 'saved_filters',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'uuid_generate_v4()',
            },
            {
              name: 'user_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'name',
              type: 'varchar',
              length: '100',
              isNullable: false,
            },
            {
              name: 'filters',
              type: 'jsonb',
              isNullable: false,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
          foreignKeys: [
            {
              columnNames: ['user_id'],
              referencedTableName: 'users',
              referencedColumnNames: ['id'],
              onDelete: 'CASCADE',
            },
          ],
        }),
        true,
      );

      await queryRunner.createIndex(
        'saved_filters',
        new TableIndex({
          name: 'IDX_saved_filters_user_id',
          columnNames: ['user_id'],
        }),
      );

      await queryRunner.createIndex(
        'saved_filters',
        new TableIndex({
          name: 'IDX_saved_filters_created_at',
          columnNames: ['created_at'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('saved_filters');
    if (table) {
      await queryRunner.dropTable('saved_filters');
    }
  }
}
