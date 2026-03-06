import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateAdminAuditLog1792000000001 implements MigrationInterface {
  name = 'CreateAdminAuditLog1792000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('admin_audit_log');
    if (!table) {
      await queryRunner.createTable(
        new Table({
          name: 'admin_audit_log',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'gen_random_uuid()',
            },
            {
              name: 'actor_user_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'action',
              type: 'varchar',
              isNullable: false,
            },
            {
              name: 'entity_type',
              type: 'varchar',
              isNullable: false,
            },
            {
              name: 'entity_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'before',
              type: 'jsonb',
              isNullable: true,
            },
            {
              name: 'after',
              type: 'jsonb',
              isNullable: true,
            },
            {
              name: 'ip',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'user_agent',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'now()',
            },
          ],
        }),
        true,
      );

      await queryRunner.createForeignKey(
        'admin_audit_log',
        new TableForeignKey({
          columnNames: ['actor_user_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'NO ACTION',
        }),
      );

      await queryRunner.createIndex(
        'admin_audit_log',
        new TableIndex({
          name: 'idx_admin_audit_log_actor_user_id',
          columnNames: ['actor_user_id'],
        }),
      );
      await queryRunner.createIndex(
        'admin_audit_log',
        new TableIndex({ name: 'idx_admin_audit_log_entity_type', columnNames: ['entity_type'] }),
      );
      await queryRunner.createIndex(
        'admin_audit_log',
        new TableIndex({ name: 'idx_admin_audit_log_entity_id', columnNames: ['entity_id'] }),
      );
      await queryRunner.createIndex(
        'admin_audit_log',
        new TableIndex({ name: 'idx_admin_audit_log_action', columnNames: ['action'] }),
      );
      await queryRunner.createIndex(
        'admin_audit_log',
        new TableIndex({ name: 'idx_admin_audit_log_created_at', columnNames: ['created_at'] }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('admin_audit_log');
    if (table) {
      const fk = table.foreignKeys.find((fk) => fk.columnNames.indexOf('actor_user_id') !== -1);
      if (fk) {
        await queryRunner.dropForeignKey('admin_audit_log', fk);
      }
      await queryRunner.dropTable('admin_audit_log');
    }
  }
}
