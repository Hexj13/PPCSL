import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEquipmentToListings1774000000000 implements MigrationInterface {
  name = 'AddEquipmentToListings1774000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');
    const equipmentColumn = table?.findColumnByName('equipment');

    if (!equipmentColumn) {
      await queryRunner.query(`
        ALTER TABLE "listings" ADD "equipment" text
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');
    const equipmentColumn = table?.findColumnByName('equipment');

    if (equipmentColumn) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "equipment"`);
    }
  }
}
