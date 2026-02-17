import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddListingFields1766000000000 implements MigrationInterface {
  name = 'AddListingFields1766000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');

    const conditionColumn = table?.findColumnByName('condition');
    if (!conditionColumn) {
      const conditionTypeExists = await queryRunner.query(`
        SELECT 1 FROM pg_type WHERE typname = 'condition_type_enum'
      `);

      if (conditionTypeExists.length === 0) {
        await queryRunner.query(`
          CREATE TYPE "condition_type_enum" AS ENUM('Undamaged', 'Damaged', 'ForParts')
        `);
      }

      await queryRunner.query(`
        ALTER TABLE "listings" ADD "condition" "condition_type_enum" NOT NULL DEFAULT 'Undamaged'
      `);
    }

    const registrationTypeColumn = table?.findColumnByName('registration_type');
    if (!registrationTypeColumn) {
      const registrationTypeExists = await queryRunner.query(`
        SELECT 1 FROM pg_type WHERE typname = 'registration_type_enum'
      `);

      if (registrationTypeExists.length === 0) {
        await queryRunner.query(`
          CREATE TYPE "registration_type_enum" AS ENUM('Local', 'Foreign', 'Cleared')
        `);
      }

      await queryRunner.query(`
        ALTER TABLE "listings" ADD "registration_type" "registration_type_enum" NOT NULL DEFAULT 'Local'
      `);
    }

    const horsepowerColumn = table?.findColumnByName('horsepower');
    if (!horsepowerColumn) {
      await queryRunner.query(`
        ALTER TABLE "listings" ADD "horsepower" integer NOT NULL DEFAULT 0
      `);
    }

    const isRegisteredColumn = table?.findColumnByName('is_registered');
    if (!isRegisteredColumn) {
      await queryRunner.query(`
        ALTER TABLE "listings" ADD "is_registered" boolean
      `);
    }

    const registrationExpiresAtColumn = table?.findColumnByName('registration_expires_at');
    if (!registrationExpiresAtColumn) {
      await queryRunner.query(`
        ALTER TABLE "listings" ADD "registration_expires_at" date
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');

    const conditionColumn = table?.findColumnByName('condition');
    if (conditionColumn) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "condition"`);
      await queryRunner.query(`DROP TYPE "condition_type_enum"`);
    }

    const registrationTypeColumn = table?.findColumnByName('registration_type');
    if (registrationTypeColumn) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "registration_type"`);
      await queryRunner.query(`DROP TYPE "registration_type_enum"`);
    }

    const horsepowerColumn = table?.findColumnByName('horsepower');
    if (horsepowerColumn) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "horsepower"`);
    }

    const isRegisteredColumn = table?.findColumnByName('is_registered');
    if (isRegisteredColumn) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "is_registered"`);
    }

    const registrationExpiresAtColumn = table?.findColumnByName('registration_expires_at');
    if (registrationExpiresAtColumn) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "registration_expires_at"`);
    }
  }
}
