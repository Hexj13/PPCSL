import type { MigrationInterface, QueryRunner, Table } from 'typeorm';
import { TableColumn } from 'typeorm';

export class AddLastLoginAtToUsers1793000000000 implements MigrationInterface {
  name = 'AddLastLoginAtToUsers1793000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table: Table | undefined = await queryRunner.getTable('users');
    const columnExists = table?.findColumnByName('last_login_at');

    if (!columnExists) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'last_login_at',
          type: 'timestamptz',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table: Table | undefined = await queryRunner.getTable('users');
    const columnExists = table?.findColumnByName('last_login_at');

    if (columnExists) {
      await queryRunner.dropColumn('users', 'last_login_at');
    }
  }
}
