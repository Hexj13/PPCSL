import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TableUnique } from 'typeorm';

export class AddBoardSlugToUser1786000000000 implements MigrationInterface {
  name = 'AddBoardSlugToUser1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const column = table?.findColumnByName('board_slug');
    if (!column) {
      await queryRunner.query(`
        ALTER TABLE "users" ADD "board_slug" varchar NULL
      `);
    }
    const hasConstraint = await queryRunner.query(
      `SELECT 1 FROM pg_constraint WHERE conname = 'UQ_users_board_slug'`,
    );
    const constraintExists = Array.isArray(hasConstraint) && hasConstraint.length > 0;
    if (!constraintExists) {
      await queryRunner.createUniqueConstraint(
        'users',
        new TableUnique({
          name: 'UQ_users_board_slug',
          columnNames: ['board_slug'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const unique = table?.uniques.find((u) => u.name === 'UQ_users_board_slug');
    if (unique) {
      await queryRunner.dropUniqueConstraint('users', 'UQ_users_board_slug');
    }
    const column = table?.findColumnByName('board_slug');
    if (column) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "board_slug"`);
    }
  }
}
