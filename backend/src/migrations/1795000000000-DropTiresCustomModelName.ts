import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DropTiresCustomModelName1795000000000 implements MigrationInterface {
  name = 'DropTiresCustomModelName1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tires" DROP COLUMN IF EXISTS "custom_model_name"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tires" ADD "custom_model_name" character varying(60)`);
  }
}
