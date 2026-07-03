import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRotatedAtToRefreshTokens1792000000000 implements MigrationInterface {
  name = 'AddRotatedAtToRefreshTokens1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('refresh_tokens');
    const column = table?.findColumnByName('rotated_at');
    if (!column) {
      await queryRunner.query(`
        ALTER TABLE "refresh_tokens" ADD "rotated_at" timestamp NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('refresh_tokens');
    const column = table?.findColumnByName('rotated_at');
    if (column) {
      await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP COLUMN "rotated_at"`);
    }
  }
}
