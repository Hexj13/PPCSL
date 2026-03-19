import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertVanBodyTypeToMinivan1800000000000 implements MigrationInterface {
  name = 'ConvertVanBodyTypeToMinivan1800000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "vehicles"
      SET "body_type" = 'Minivan'
      WHERE "body_type" = 'Van'
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
