import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveIsRegisteredAddNotCleared1791000000000 implements MigrationInterface {
  name = 'RemoveIsRegisteredAddNotCleared1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const typeResult = await queryRunner.query(
      `SELECT t.typname
       FROM pg_attribute a
       JOIN pg_type t ON a.atttypid = t.oid
       JOIN pg_class c ON a.attrelid = c.oid
       WHERE c.relname = 'listings' AND a.attname = 'registration_type' AND NOT a.attisdropped`,
    );
    let typeName = (typeResult as { typname: string }[])[0]?.typname;
    if (!typeName) {
      const enumWithLocal = await queryRunner.query(
        `SELECT t.typname FROM pg_enum e
         JOIN pg_type t ON e.enumtypid = t.oid
         WHERE e.enumlabel = 'Local'
         AND EXISTS (SELECT 1 FROM pg_enum e2 WHERE e2.enumtypid = t.oid AND e2.enumlabel = 'Cleared')`,
      );
      typeName = (enumWithLocal as { typname: string }[])[0]?.typname;
    }
    if (typeName) {
      const hasNotCleared = await queryRunner.query(
        `SELECT 1 FROM pg_enum e
         JOIN pg_type t ON e.enumtypid = t.oid
         WHERE t.typname = $1 AND e.enumlabel = 'NotCleared'`,
        [typeName],
      );
      if (hasNotCleared.length === 0) {
        await queryRunner.query(`ALTER TYPE "${typeName}" ADD VALUE IF NOT EXISTS 'NotCleared'`);
      }
    }

    const table = await queryRunner.getTable('listings');
    const isRegisteredColumn = table?.findColumnByName('is_registered');
    if (isRegisteredColumn) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "is_registered"`);
    }

    const registrationExpiresAtColumn = table?.findColumnByName('registration_expires_at');
    if (registrationExpiresAtColumn) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "registration_expires_at"`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');

    const registrationExpiresAtColumn = table?.findColumnByName('registration_expires_at');
    if (!registrationExpiresAtColumn) {
      await queryRunner.query(`
        ALTER TABLE "listings" ADD "registration_expires_at" date
      `);
    }

    const isRegisteredColumn = table?.findColumnByName('is_registered');
    if (!isRegisteredColumn) {
      await queryRunner.query(`
        ALTER TABLE "listings" ADD "is_registered" boolean
      `);
    }
  }
}
