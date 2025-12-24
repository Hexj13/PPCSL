import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangePriceToInteger1775000000000 implements MigrationInterface {
  name = 'ChangePriceToInteger1775000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');
    const priceColumn = table?.findColumnByName('price');

    if (priceColumn && priceColumn.type === 'decimal') {
      await queryRunner.query(`
        UPDATE "listings" 
        SET "price" = 0 
        WHERE "price" IS NULL
      `);

      await queryRunner.query(`
        ALTER TABLE "listings" 
        ALTER COLUMN "price" TYPE integer 
        USING ROUND("price")::integer,
        ALTER COLUMN "price" SET NOT NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('listings');
    const priceColumn = table?.findColumnByName('price');

    if (priceColumn && priceColumn.type === 'integer') {
      await queryRunner.query(`
        ALTER TABLE "listings" 
        ALTER COLUMN "price" TYPE decimal(12,2),
        ALTER COLUMN "price" DROP NOT NULL
      `);
    }
  }
}
