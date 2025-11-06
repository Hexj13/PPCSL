import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTruckBodyType1764000000000 implements MigrationInterface {
  name = 'AddTruckBodyType1764000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const enumExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'Truck' 
        AND enumtypid = (
          SELECT oid FROM pg_type WHERE typname = 'vehicles_body_type_enum'
        )
      )
    `);

    if (!enumExists[0]?.exists) {
      await queryRunner.query(`ALTER TYPE "public"."vehicles_body_type_enum" ADD VALUE 'Truck'`);
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    throw new Error(
      'Cannot remove enum value from PostgreSQL enum type. Manual rollback required.',
    );
  }
}
