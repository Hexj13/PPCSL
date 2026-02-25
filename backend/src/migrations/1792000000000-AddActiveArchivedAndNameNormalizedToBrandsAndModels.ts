import type { MigrationInterface, QueryRunner } from 'typeorm';

import { normalizeForComparison } from '../common/utils/slug.utils';

export class AddActiveArchivedAndNameNormalizedToBrandsAndModels1792000000000
  implements MigrationInterface
{
  name = 'AddActiveArchivedAndNameNormalizedToBrandsAndModels1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "brands"
      ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "is_archived" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "name_normalized" character varying(160)
    `);

    const nameUniqueConstraint = await queryRunner.query(`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'brands'::regclass AND contype = 'u' AND pg_get_constraintdef(oid) LIKE '%name%'
    `);
    if (nameUniqueConstraint?.length > 0) {
      await queryRunner.query(
        `ALTER TABLE "brands" DROP CONSTRAINT IF EXISTS "${nameUniqueConstraint[0].conname}"`,
      );
    }
    await queryRunner.query(`ALTER TABLE "brands" DROP CONSTRAINT IF EXISTS "brands_name_key"`);

    await queryRunner.query(`
      ALTER TABLE "vehicle_models"
      ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "is_archived" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "name_normalized" character varying(160),
      ADD COLUMN IF NOT EXISTS "vehicle_types" text
    `);

    const hasVehicleType = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'vehicle_models' AND column_name = 'vehicle_type'
    `);
    if (hasVehicleType?.length > 0) {
      await queryRunner.query(`
        UPDATE "vehicle_models" SET "vehicle_types" = "vehicle_type"::text WHERE "vehicle_type" IS NOT NULL
      `);
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_vehicle_models_brand_type"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_vehicle_models_vehicle_type"`);
      await queryRunner.query(`ALTER TABLE "vehicle_models" DROP COLUMN "vehicle_type"`);
    }

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_brands_is_active" ON "brands" ("is_active")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_brands_is_archived" ON "brands" ("is_archived")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_vehicle_models_is_active" ON "vehicle_models" ("is_active")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_vehicle_models_is_archived" ON "vehicle_models" ("is_archived")
    `);

    const brands = (await queryRunner.query('SELECT id, name FROM brands')) as {
      id: string;
      name: string;
    }[];
    for (const row of brands) {
      const norm = normalizeForComparison(row.name);
      await queryRunner.query(`UPDATE "brands" SET "name_normalized" = $1 WHERE "id" = $2`, [
        norm || null,
        row.id,
      ]);
    }

    const models = (await queryRunner.query('SELECT id, name FROM vehicle_models')) as {
      id: string;
      name: string;
    }[];
    for (const row of models) {
      const norm = normalizeForComparison(row.name);
      await queryRunner.query(
        `UPDATE "vehicle_models" SET "name_normalized" = $1 WHERE "id" = $2`,
        [norm || null, row.id],
      );
    }

    await queryRunner.query(`
      UPDATE brands SET is_archived = true
      WHERE name_normalized IN (
        SELECT name_normalized FROM brands
        WHERE is_archived = false AND name_normalized IS NOT NULL
        GROUP BY name_normalized HAVING count(*) > 1
      )
      AND id NOT IN (
        SELECT id FROM (
          SELECT id, row_number() OVER (PARTITION BY name_normalized ORDER BY id) AS rn
          FROM brands
          WHERE is_archived = false AND name_normalized IS NOT NULL
        ) t WHERE t.rn = 1
      )
    `);
    await queryRunner.query(`
      UPDATE vehicle_models SET is_archived = true
      WHERE (brand_id, name_normalized) IN (
        SELECT brand_id, name_normalized FROM vehicle_models
        WHERE is_archived = false AND name_normalized IS NOT NULL
        GROUP BY brand_id, name_normalized HAVING count(*) > 1
      )
      AND id NOT IN (
        SELECT id FROM (
          SELECT id, row_number() OVER (PARTITION BY brand_id, name_normalized ORDER BY id) AS rn
          FROM vehicle_models
          WHERE is_archived = false AND name_normalized IS NOT NULL
        ) t WHERE t.rn = 1
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_brands_name_normalized_not_archived"
      ON "brands" ("name_normalized") WHERE "is_archived" = false
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_vehicle_models_brand_name_normalized_not_archived"
      ON "vehicle_models" ("brand_id", "name_normalized") WHERE "is_archived" = false
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_brands_not_archived_name_normalized"
      ON "brands" ("is_archived", "name_normalized")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_vehicle_models_brand_not_archived"
      ON "vehicle_models" ("brand_id", "is_archived")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_vehicle_models_brand_not_archived"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_brands_not_archived_name_normalized"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_vehicle_models_brand_name_normalized_not_archived"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_brands_name_normalized_not_archived"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_vehicle_models_is_archived"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_vehicle_models_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_brands_is_archived"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_brands_is_active"`);

    const hasVehicleTypes = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'vehicle_models' AND column_name = 'vehicle_types'
    `);
    if (hasVehicleTypes?.length > 0) {
      await queryRunner.query(`
        ALTER TABLE "vehicle_models" ADD COLUMN "vehicle_type" "public"."vehicle_type_enum"
      `);
      await queryRunner.query(`
        UPDATE "vehicle_models" SET "vehicle_type" = (split_part("vehicle_types", ',', 1))::"public"."vehicle_type_enum"
        WHERE "vehicle_types" IS NOT NULL AND trim("vehicle_types") != ''
      `);
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_vehicle_models_vehicle_type" ON "vehicle_models" ("vehicle_type")`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_vehicle_models_brand_type" ON "vehicle_models" ("brand_id", "vehicle_type")`,
      );
      await queryRunner.query(`ALTER TABLE "vehicle_models" DROP COLUMN "vehicle_types"`);
    }

    await queryRunner.query(`ALTER TABLE "vehicle_models" DROP COLUMN IF EXISTS "name_normalized"`);
    await queryRunner.query(`ALTER TABLE "vehicle_models" DROP COLUMN IF EXISTS "is_archived"`);
    await queryRunner.query(`ALTER TABLE "vehicle_models" DROP COLUMN IF EXISTS "is_active"`);
    await queryRunner.query(`ALTER TABLE "brands" DROP COLUMN IF EXISTS "name_normalized"`);
    await queryRunner.query(`ALTER TABLE "brands" DROP COLUMN IF EXISTS "is_archived"`);
    await queryRunner.query(`ALTER TABLE "brands" DROP COLUMN IF EXISTS "is_active"`);
    await queryRunner.query(
      `ALTER TABLE "brands" ADD CONSTRAINT "brands_name_key" UNIQUE ("name")`,
    );
  }
}
