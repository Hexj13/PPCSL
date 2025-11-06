import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeDriveTypeRequired1768000000000 implements MigrationInterface {
  name = 'MakeDriveTypeRequired1768000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('vehicles');
    const driveTypeColumn = table?.findColumnByName('drive_type');

    if (driveTypeColumn && driveTypeColumn.isNullable) {
      await queryRunner.query(`
        UPDATE vehicles SET drive_type = 'FWD' WHERE drive_type IS NULL
      `);

      await queryRunner.query(`
        ALTER TABLE "vehicles" ALTER COLUMN "drive_type" SET NOT NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('vehicles');
    const driveTypeColumn = table?.findColumnByName('drive_type');

    if (driveTypeColumn && !driveTypeColumn.isNullable) {
      await queryRunner.query(`
        ALTER TABLE "vehicles" ALTER COLUMN "drive_type" DROP NOT NULL
      `);
    }
  }
}
