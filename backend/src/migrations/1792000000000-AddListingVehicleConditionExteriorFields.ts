import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddListingVehicleConditionExteriorFields1792000000000 implements MigrationInterface {
  name = 'AddListingVehicleConditionExteriorFields1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const listingsTable = await queryRunner.getTable('listings');

    const availabilityColumn = listingsTable?.findColumnByName('availability');
    if (!availabilityColumn) {
      const availabilityTypeExists = await queryRunner.query(`
        SELECT 1 FROM pg_type WHERE typname = 'availability_type_enum'
      `);

      if (availabilityTypeExists.length === 0) {
        await queryRunner.query(`
          CREATE TYPE "availability_type_enum" AS ENUM('InStock', 'OnOrder')
        `);
      }

      await queryRunner.query(`
        ALTER TABLE "listings" ADD "availability" "availability_type_enum"
      `);
    }

    const vehiclesTable = await queryRunner.getTable('vehicles');

    const countryOfOriginColumn = vehiclesTable?.findColumnByName('country_of_origin');
    if (!countryOfOriginColumn) {
      await queryRunner.query(`
        ALTER TABLE "vehicles" ADD "country_of_origin" character varying(2)
      `);
    }

    const ownersCountColumn = vehiclesTable?.findColumnByName('owners_count');
    if (!ownersCountColumn) {
      await queryRunner.query(`
        ALTER TABLE "vehicles" ADD "owners_count" integer
      `);
    }

    const interiorColorColumn = vehiclesTable?.findColumnByName('interior_color');
    if (!interiorColorColumn) {
      await queryRunner.query(`
        ALTER TABLE "vehicles" ADD "interior_color" character varying
      `);
    }

    const seatsColumn = vehiclesTable?.findColumnByName('seats');
    if (!seatsColumn) {
      await queryRunner.query(`
        ALTER TABLE "vehicles" ADD "seats" integer
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const listingsTable = await queryRunner.getTable('listings');

    const availabilityColumn = listingsTable?.findColumnByName('availability');
    if (availabilityColumn) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "availability"`);
      await queryRunner.query(`DROP TYPE "availability_type_enum"`);
    }

    const vehiclesTable = await queryRunner.getTable('vehicles');

    const countryOfOriginColumn = vehiclesTable?.findColumnByName('country_of_origin');
    if (countryOfOriginColumn) {
      await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "country_of_origin"`);
    }

    const ownersCountColumn = vehiclesTable?.findColumnByName('owners_count');
    if (ownersCountColumn) {
      await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "owners_count"`);
    }

    const interiorColorColumn = vehiclesTable?.findColumnByName('interior_color');
    if (interiorColorColumn) {
      await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "interior_color"`);
    }

    const seatsColumn = vehiclesTable?.findColumnByName('seats');
    if (seatsColumn) {
      await queryRunner.query(`ALTER TABLE "vehicles" DROP COLUMN "seats"`);
    }
  }
}
