import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeTireModelIdNullable1794000000000 implements MigrationInterface {
  name = 'MakeTireModelIdNullable1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tires" ALTER COLUMN "model_id" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "tire_models" (
        "id",
        "brand_id",
        "name",
        "name_normalized",
        "order",
        "is_archived",
        "is_other",
        "created_at"
      )
      SELECT
        uuid_generate_v4(),
        missing."brand_id",
        'Other',
        'other',
        0,
        false,
        true,
        NOW()
      FROM (
        SELECT DISTINCT "brand_id"
        FROM "tires"
        WHERE "model_id" IS NULL
      ) AS missing
      WHERE NOT EXISTS (
        SELECT 1
        FROM "tire_models" tm
        WHERE tm."brand_id" = missing."brand_id"
          AND tm."is_other" = true
          AND tm."is_archived" = false
      )
    `);
    await queryRunner.query(
      `UPDATE "tires" SET "model_id" = (
        SELECT tm.id FROM "tire_models" tm
        WHERE tm."brand_id" = "tires"."brand_id" AND tm."is_other" = true
        ORDER BY tm."is_archived" ASC, tm."created_at" ASC, tm."id" ASC
        LIMIT 1
      ) WHERE "model_id" IS NULL`,
    );
    await queryRunner.query(`ALTER TABLE "tires" ALTER COLUMN "model_id" SET NOT NULL`);
  }
}
