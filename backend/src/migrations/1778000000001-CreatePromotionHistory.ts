import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreatePromotionHistory1778000000001 implements MigrationInterface {
  name = 'CreatePromotionHistory1778000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('promotion_history');
    if (!table) {
      await queryRunner.createTable(
        new Table({
          name: 'promotion_history',
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
              name: 'user_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'listing_title',
              type: 'varchar',
              isNullable: false,
            },
            {
              name: 'started_at',
              type: 'timestamp',
              isNullable: false,
            },
            {
              name: 'ended_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'days',
              type: 'integer',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
          foreignKeys: [
            {
              columnNames: ['listing_id'],
              referencedTableName: 'listings',
              referencedColumnNames: ['id'],
              onDelete: 'CASCADE',
            },
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
        'promotion_history',
        new TableIndex({
          name: 'idx_promotion_history_listing_id',
          columnNames: ['listing_id'],
        }),
      );

      await queryRunner.createIndex(
        'promotion_history',
        new TableIndex({
          name: 'idx_promotion_history_user_id',
          columnNames: ['user_id'],
        }),
      );

      await queryRunner.createIndex(
        'promotion_history',
        new TableIndex({
          name: 'idx_promotion_history_started_at',
          columnNames: ['started_at'],
        }),
      );

      await queryRunner.createIndex(
        'promotion_history',
        new TableIndex({
          name: 'idx_promotion_history_ended_at',
          columnNames: ['ended_at'],
          where: '"ended_at" IS NOT NULL',
        }),
      );

      await queryRunner.createIndex(
        'promotion_history',
        new TableIndex({
          name: 'idx_promotion_history_created_at',
          columnNames: ['created_at'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('promotion_history');
    if (table) {
      await queryRunner.dropTable('promotion_history');
    }
  }
}
