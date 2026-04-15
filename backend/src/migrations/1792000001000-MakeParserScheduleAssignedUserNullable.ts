import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TableColumn } from 'typeorm';

export class MakeParserScheduleAssignedUserNullable1792000001000 implements MigrationInterface {
  name = 'MakeParserScheduleAssignedUserNullable1792000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schedules = await queryRunner.getTable('parser_schedules');
    if (!schedules?.findColumnByName('assigned_user_id')) {
      return;
    }

    await queryRunner.changeColumn(
      'parser_schedules',
      'assigned_user_id',
      new TableColumn({
        name: 'assigned_user_id',
        type: 'uuid',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schedules = await queryRunner.getTable('parser_schedules');
    if (!schedules?.findColumnByName('assigned_user_id')) {
      return;
    }

    await queryRunner.changeColumn(
      'parser_schedules',
      'assigned_user_id',
      new TableColumn({
        name: 'assigned_user_id',
        type: 'uuid',
        isNullable: false,
      }),
    );
  }
}
