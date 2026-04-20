import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCoverBlurHash1792000000000 implements MigrationInterface {
  name = 'AddCoverBlurHash1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');
    if (!table?.findColumnByName('cover_blur_hash')) {
      await queryRunner.query(`ALTER TABLE "listings" ADD "cover_blur_hash" varchar(50)`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');
    if (table?.findColumnByName('cover_blur_hash')) {
      await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "cover_blur_hash"`);
    }
  }
}
