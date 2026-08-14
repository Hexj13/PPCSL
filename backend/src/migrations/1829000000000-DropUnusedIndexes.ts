import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DropUnusedIndexes1829000000000 implements MigrationInterface {
  name = 'DropUnusedIndexes1829000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_equipment_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_search_sort_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_31df06306aa06196879dbea6ef"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_a6271c3c3e5bbb220ef3d8caf7"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_currency"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_brands_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_vehicle_models_is_active"`);
    await queryRunner.query(`ALTER TABLE "brands" DROP COLUMN IF EXISTS "is_active"`);
    await queryRunner.query(`ALTER TABLE "vehicle_models" DROP COLUMN IF EXISTS "is_active"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_5e9a35fd903105181255996c63"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ecb8016660e7abfa75d1816278"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_3e5bdc561b9b7df0045b611885"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_brands_vehicle_types"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_brands_popular_country"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_vehicle_models_is_archived"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_70d2602182702a23eac9050722"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_admin_audit_log_actor_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_admin_audit_log_entity_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_admin_audit_log_entity_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_admin_audit_log_action"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_5dcb6ee3d3ffcd52c72323f21d"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_15fe09fda0acf677b576c06632"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_1b1e9eead259b6f2a0251571b9"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_660bcad1f33a1fc991c21404f0"`);

    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "UQ_4542dd2f38a61354a040ba9fd57"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_4542dd2f38a61354a040ba9fd57"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_4542dd2f38a61354a040ba9fd57" ON "refresh_tokens" ("token")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_5dcb6ee3d3ffcd52c72323f21d" ON "admin_audit_log" ("actor_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_15fe09fda0acf677b576c06632" ON "admin_audit_log" ("entity_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_1b1e9eead259b6f2a0251571b9" ON "admin_audit_log" ("entity_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_660bcad1f33a1fc991c21404f0" ON "admin_audit_log" ("action")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_70d2602182702a23eac9050722" ON "vehicle_models" ("is_archived")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_brands_popular_country" ON "brands" ("popular_country")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_3e5bdc561b9b7df0045b611885" ON "brands" ("vehicle_types")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ecb8016660e7abfa75d1816278" ON "brands" ("order")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_5e9a35fd903105181255996c63" ON "vehicle_models" ("order")`,
    );

    await queryRunner.query(
      `ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_models" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_brands_is_active" ON "brands" ("is_active")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_vehicle_models_is_active" ON "vehicle_models" ("is_active")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_a6271c3c3e5bbb220ef3d8caf7" ON "listings" ("currency")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_31df06306aa06196879dbea6ef" ON "listings" ("views")`,
    );
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listings_search_sort_created"
      ON "listings" ("is_promoted" DESC, "created_at" DESC)
      WHERE "status" = 'Active'
    `);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listings_equipment_trgm"
      ON "listings"
      USING gin ("equipment" gin_trgm_ops)
      WHERE "equipment" IS NOT NULL AND "equipment" <> ''
    `);
  }
}
