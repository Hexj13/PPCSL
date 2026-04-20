import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImageBlurHashesToListings1801000000000 implements MigrationInterface {
  name = 'AddImageBlurHashesToListings1801000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');
    if (!table?.findColumnByName('image_blur_hashes')) {
      await queryRunner.query(`ALTER TABLE "listings" ADD "image_blur_hashes" jsonb`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');
    if (table?.findColumnByName('image_blur_hashes')) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "image_blur_hashes"`);
    }
  }
}
