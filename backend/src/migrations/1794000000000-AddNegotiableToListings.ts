import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNegotiableToListings1794000000000 implements MigrationInterface {
  name = 'AddNegotiableToListings1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');
    if (!table?.findColumnByName('negotiable')) {
      await queryRunner.query(`
        ALTER TABLE "listings" ADD "negotiable" boolean NOT NULL DEFAULT false
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');
    if (table?.findColumnByName('negotiable')) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "negotiable"`);
    }
  }
}
