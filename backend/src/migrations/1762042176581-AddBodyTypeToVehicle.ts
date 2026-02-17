import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBodyTypeToVehicle1762042176581 implements MigrationInterface {
  name = 'AddBodyTypeToVehicle1762042176581';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const typeExists = await queryRunner.query(`
      SELECT 1 FROM pg_type WHERE typname = 'vehicles_body_type_enum'
    `);

    if (typeExists.length === 0) {
      await queryRunner.query(
        `CREATE TYPE "public"."vehicles_body_type_enum" AS ENUM('Sedan', 'Hatchback', 'Wagon', 'SUV', 'Coupe', 'Convertible', 'Van', 'Pickup', 'Minivan')`,
      );
    }

    const columnExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'vehicles' AND column_name = 'body_type'
    `);

    if (columnExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "vehicles" ADD "body_type" "public"."vehicles_body_type_enum"`,
      );
      await queryRunner.query(
        `UPDATE "vehicles" SET "body_type" = 'Sedan' WHERE "body_type" IS NULL`,
      );
      await queryRunner.query(`ALTER TABLE "vehicles" ALTER COLUMN "body_type" SET NOT NULL`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "body_type"`);
    await queryRunner.query(`DROP TYPE "public"."vehicles_body_type_enum"`);
  }
}
