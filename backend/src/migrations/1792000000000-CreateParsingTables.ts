import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateParsingTables1792000000000 implements MigrationInterface {
  name = 'CreateParsingTables1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schedules = await queryRunner.getTable('parser_schedules');
    if (!schedules) {
      await queryRunner.createTable(
        new Table({
          name: 'parser_schedules',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'uuid_generate_v4()',
            },
            { name: 'parser_code', type: 'varchar', length: '64', isNullable: false },
            { name: 'run_type', type: 'varchar', length: '8', isNullable: false },
            { name: 'domain', type: 'varchar', length: '255', isNullable: false },
            { name: 'assigned_user_id', type: 'uuid', isNullable: false },
            { name: 'target_env', type: 'varchar', length: '16', isNullable: false },
            { name: 'cron_expression', type: 'varchar', length: '128', isNullable: false },
            { name: 'frequency_preset', type: 'varchar', length: '64', isNullable: true },
            {
              name: 'timezone',
              type: 'varchar',
              length: '64',
              isNullable: false,
              default: `'Europe/Chisinau'`,
            },
            { name: 'status', type: 'varchar', length: '16', isNullable: false },
            { name: 'config_snapshot', type: 'jsonb', isNullable: false, default: `'{}'::jsonb` },
            { name: 'next_run_at', type: 'timestamptz', isNullable: true },
            { name: 'last_run_at', type: 'timestamptz', isNullable: true },
            {
              name: 'resource_availability_status',
              type: 'varchar',
              length: '32',
              isNullable: true,
            },
            { name: 'resource_availability_checked_at', type: 'timestamptz', isNullable: true },
            { name: 'resource_availability_summary', type: 'text', isNullable: true },
            { name: 'resource_availability_scope', type: 'jsonb', isNullable: true },
            { name: 'created_by_admin_user_id', type: 'uuid', isNullable: false },
            { name: 'updated_by_admin_user_id', type: 'uuid', isNullable: true },
            { name: 'deleted_at', type: 'timestamptz', isNullable: true },
            {
              name: 'created_at',
              type: 'timestamptz',
              default: 'CURRENT_TIMESTAMP',
              isNullable: false,
            },
            {
              name: 'updated_at',
              type: 'timestamptz',
              default: 'CURRENT_TIMESTAMP',
              isNullable: false,
            },
          ],
        }),
        true,
      );

      await queryRunner.createForeignKey(
        'parser_schedules',
        new TableForeignKey({
          columnNames: ['assigned_user_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'RESTRICT',
        }),
      );
      await queryRunner.createForeignKey(
        'parser_schedules',
        new TableForeignKey({
          columnNames: ['created_by_admin_user_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'RESTRICT',
        }),
      );
      await queryRunner.createForeignKey(
        'parser_schedules',
        new TableForeignKey({
          columnNames: ['updated_by_admin_user_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );

      await queryRunner.createIndex(
        'parser_schedules',
        new TableIndex({
          name: 'IDX_parser_schedules_next_run',
          columnNames: ['next_run_at'],
        }),
      );
    }

    const runs = await queryRunner.getTable('parser_runs');
    if (!runs) {
      await queryRunner.createTable(
        new Table({
          name: 'parser_runs',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'uuid_generate_v4()',
            },
            { name: 'parser_code', type: 'varchar', length: '64', isNullable: false },
            { name: 'run_type', type: 'varchar', length: '8', isNullable: false },
            { name: 'domain', type: 'varchar', length: '255', isNullable: false },
            { name: 'assigned_user_id', type: 'uuid', isNullable: true },
            { name: 'target_env', type: 'varchar', length: '16', isNullable: false },
            { name: 'trigger_mode', type: 'varchar', length: '16', isNullable: false },
            { name: 'schedule_id', type: 'uuid', isNullable: true },
            { name: 'status', type: 'varchar', length: '32', isNullable: false },
            { name: 'config_snapshot', type: 'jsonb', isNullable: false, default: `'{}'::jsonb` },
            { name: 'started_at', type: 'timestamptz', isNullable: true },
            { name: 'finished_at', type: 'timestamptz', isNullable: true },
            { name: 'cancel_requested_at', type: 'timestamptz', isNullable: true },
            { name: 'created_by_admin_user_id', type: 'uuid', isNullable: false },
            { name: 'log_storage_key', type: 'varchar', length: '512', isNullable: true },
            { name: 'report_storage_key', type: 'varchar', length: '512', isNullable: true },
            { name: 'counters', type: 'jsonb', isNullable: true },
            { name: 'source_status_summary', type: 'jsonb', isNullable: true },
            { name: 'error_summary', type: 'text', isNullable: true },
            { name: 'process_pid', type: 'int', isNullable: true },
            {
              name: 'created_at',
              type: 'timestamptz',
              default: 'CURRENT_TIMESTAMP',
              isNullable: false,
            },
            {
              name: 'updated_at',
              type: 'timestamptz',
              default: 'CURRENT_TIMESTAMP',
              isNullable: false,
            },
          ],
        }),
        true,
      );

      await queryRunner.createForeignKey(
        'parser_runs',
        new TableForeignKey({
          columnNames: ['assigned_user_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
      await queryRunner.createForeignKey(
        'parser_runs',
        new TableForeignKey({
          columnNames: ['schedule_id'],
          referencedTableName: 'parser_schedules',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
      await queryRunner.createForeignKey(
        'parser_runs',
        new TableForeignKey({
          columnNames: ['created_by_admin_user_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'RESTRICT',
        }),
      );

      await queryRunner.query(`
        CREATE UNIQUE INDEX "UQ_parser_runs_active_parser_run_type_env"
        ON "parser_runs" ("parser_code", "run_type", "target_env")
        WHERE status IN ('queued', 'in_progress', 'cancel_requested')
      `);

      await queryRunner.createIndex(
        'parser_runs',
        new TableIndex({
          name: 'IDX_parser_runs_started_at',
          columnNames: ['started_at'],
        }),
      );
    }

    const chunks = await queryRunner.getTable('parser_log_chunks');
    if (!chunks) {
      await queryRunner.createTable(
        new Table({
          name: 'parser_log_chunks',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'uuid_generate_v4()',
            },
            { name: 'run_id', type: 'uuid', isNullable: false },
            { name: 'seq', type: 'int', isNullable: false },
            { name: 'level', type: 'varchar', length: '16', isNullable: false },
            { name: 'message', type: 'text', isNullable: false },
            { name: 'raw_line', type: 'text', isNullable: true },
            {
              name: 'created_at',
              type: 'timestamptz',
              default: 'CURRENT_TIMESTAMP',
              isNullable: false,
            },
          ],
        }),
        true,
      );

      await queryRunner.createForeignKey(
        'parser_log_chunks',
        new TableForeignKey({
          columnNames: ['run_id'],
          referencedTableName: 'parser_runs',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );

      await queryRunner.createIndex(
        'parser_log_chunks',
        new TableIndex({
          name: 'IDX_parser_log_chunks_run_seq',
          columnNames: ['run_id', 'seq'],
          isUnique: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const chunks = await queryRunner.getTable('parser_log_chunks');
    if (chunks) {
      await queryRunner.dropTable('parser_log_chunks');
    }
    const runs = await queryRunner.getTable('parser_runs');
    if (runs) {
      await queryRunner.query(`DROP INDEX IF EXISTS "UQ_parser_runs_active_parser_run_type_env"`);
      await queryRunner.dropTable('parser_runs');
    }
    const schedules = await queryRunner.getTable('parser_schedules');
    if (schedules) {
      await queryRunner.dropTable('parser_schedules');
    }
  }
}
