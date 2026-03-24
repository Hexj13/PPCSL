import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMhevPhevFuelTypes1792000000000 implements MigrationInterface {
  name = 'AddMhevPhevFuelTypes1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const newFuels = ['MHEV', 'PHEV'];

    for (const fuel of newFuels) {
      const enumExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = '${fuel}'
          AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'vehicles_fuel_enum'
          )
        )
      `);

      if (!enumExists[0]?.exists) {
        await queryRunner.query(`ALTER TYPE "public"."vehicles_fuel_enum" ADD VALUE '${fuel}'`);
      }
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    throw new Error(
      'Cannot remove enum values from PostgreSQL enum type. Manual rollback required.',
    );
  }
}
