import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpecialEquipmentBodyType1783000000000 implements MigrationInterface {
  name = 'AddSpecialEquipmentBodyType1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const newBodyType = 'SpecialEquipment';

    const enumExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = '${newBodyType}'
        AND enumtypid = (
          SELECT oid FROM pg_type WHERE typname = 'vehicles_body_type_enum'
        )
      )
    `);

    if (!enumExists[0]?.exists) {
      await queryRunner.query(
        `ALTER TYPE "public"."vehicles_body_type_enum" ADD VALUE '${newBodyType}'`,
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    throw new Error(
      'Cannot remove enum values from PostgreSQL enum type. Manual rollback required.',
    );
  }
}
