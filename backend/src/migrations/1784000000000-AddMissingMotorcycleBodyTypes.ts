import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingMotorcycleBodyTypes1784000000000 implements MigrationInterface {
  name = 'AddMissingMotorcycleBodyTypes1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const newBodyTypes = [
      'Dragster',
      'Kart',
      'Custom',
      'ATV',
      'Classic',
      'MaxiScooter',
      'Minibike',
      'Moped',
      'Motard',
      'AllTerrainVehicle',
      'Snowmobile',
      'SportTouring',
      'Street',
      'Trial',
      'TourEnduro',
      'Chopper',
      'ElectricScooter',
    ];

    for (const bodyType of newBodyTypes) {
      const enumExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = '${bodyType}'
          AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'vehicles_body_type_enum'
          )
        )
      `);

      if (!enumExists[0]?.exists) {
        await queryRunner.query(
          `ALTER TYPE "public"."vehicles_body_type_enum" ADD VALUE '${bodyType}'`,
        );
      }
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    throw new Error(
      'Cannot remove enum values from PostgreSQL enum type. Manual rollback required.',
    );
  }
}
