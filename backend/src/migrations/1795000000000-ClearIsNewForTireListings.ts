import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ClearIsNewForTireListings1795000000000 implements MigrationInterface {
  name = 'ClearIsNewForTireListings1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "listings" SET "is_new" = false WHERE "category" = 'tire' AND "is_new" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "listings" l
       SET "is_new" = true
       FROM "tires" t
       WHERE l."tire_id" = t.id
         AND l."category" = 'tire'
         AND t."condition" = 'new'`,
    );
  }
}
