import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPowerKwToListings1776000000000 implements MigrationInterface {
  name = 'AddPowerKwToListings1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');
    const powerKwColumn = table?.findColumnByName('power_kw');

    if (!powerKwColumn) {
      await queryRunner.query(`
        ALTER TABLE "listings" ADD "power_kw" integer
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');
    const powerKwColumn = table?.findColumnByName('power_kw');

    if (powerKwColumn) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "power_kw"`);
    }
  }
}
