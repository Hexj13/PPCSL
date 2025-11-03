import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVinToListing1762095885546 implements MigrationInterface {
  name = 'AddVinToListing1762095885546';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "listings" ADD "vin" character varying(17)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "vin"`);
  }
}
