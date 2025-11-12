import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDriveTypeToVehicle1767000000000 implements MigrationInterface {
  name = 'AddDriveTypeToVehicle1767000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('vehicles');

    const driveTypeColumn = table?.findColumnByName('drive_type');
    if (!driveTypeColumn) {
      const typeExists = await queryRunner.query(`
        SELECT 1 FROM pg_type WHERE typname = 'drive_type_enum'
      `);
      
      if (typeExists.length === 0) {
        await queryRunner.query(`
          CREATE TYPE "drive_type_enum" AS ENUM('FWD', 'RWD', 'AWD')
        `);
      }
      
      await queryRunner.query(`
        ALTER TABLE "vehicles" ADD "drive_type" "drive_type_enum"
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('vehicles');

    const driveTypeColumn = table?.findColumnByName('drive_type');
    if (driveTypeColumn) {
      await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "drive_type"`);
      await queryRunner.query(`DROP TYPE "drive_type_enum"`);
    }
  }
}
