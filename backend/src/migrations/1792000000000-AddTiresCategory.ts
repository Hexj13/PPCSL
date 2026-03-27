import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTiresCategory1792000000000 implements MigrationInterface {
  name = 'AddTiresCategory1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "listing_category_enum" AS ENUM ('vehicle', 'tire');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "tire_vehicle_type_enum" AS ENUM ('car', 'truck', 'moto');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "tire_season_enum" AS ENUM ('summer', 'winter', 'all_season');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "tire_condition_enum" AS ENUM ('new', 'used', 'retreaded');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tire_brands" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "name_normalized" character varying(160),
        "logoUrl" character varying,
        "order" integer NOT NULL DEFAULT 0,
        "is_archived" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tire_brands" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tire_brands_order" ON "tire_brands" ("order")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tire_brands_is_archived" ON "tire_brands" ("is_archived")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tire_brands_archived_norm" ON "tire_brands" ("is_archived", "name_normalized")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tire_models" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "brand_id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "name_normalized" character varying(160),
        "order" integer NOT NULL DEFAULT 0,
        "is_archived" boolean NOT NULL DEFAULT false,
        "is_other" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tire_models" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tire_models_brand" FOREIGN KEY ("brand_id") REFERENCES "tire_brands"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tire_models_brand_id" ON "tire_models" ("brand_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tire_models_brand_archived" ON "tire_models" ("brand_id", "is_archived")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tire_models_is_other" ON "tire_models" ("is_other")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tires" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "brand_id" uuid NOT NULL,
        "model_id" uuid NOT NULL,
        "custom_model_name" character varying(60),
        "tire_vehicle_type" "tire_vehicle_type_enum" NOT NULL,
        "season" "tire_season_enum" NOT NULL,
        "condition" "tire_condition_enum" NOT NULL,
        "width_mm" integer NOT NULL,
        "aspect_ratio" integer NOT NULL,
        "diameter_inch" numeric(4,1) NOT NULL,
        "quantity" smallint NOT NULL,
        "load_index" character varying(10),
        "speed_index" character varying(5),
        "dot_year" integer,
        "tread_depth_mm" numeric(3,1),
        "studded" boolean,
        "run_flat" boolean,
        "reinforced_xl" boolean,
        CONSTRAINT "PK_tires" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tires_brand" FOREIGN KEY ("brand_id") REFERENCES "tire_brands"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_tires_model" FOREIGN KEY ("model_id") REFERENCES "tire_models"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tires_brand_id" ON "tires" ("brand_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tires_model_id" ON "tires" ("model_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tires_tire_vehicle_type" ON "tires" ("tire_vehicle_type")`,
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tires_season" ON "tires" ("season")`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tires_condition" ON "tires" ("condition")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tires_quantity" ON "tires" ("quantity")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tires_search_dims" ON "tires" ("tire_vehicle_type", "width_mm", "aspect_ratio", "diameter_inch", "season")`,
    );

    await queryRunner.query(`
      ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "category" "listing_category_enum" NOT NULL DEFAULT 'vehicle'
    `);
    await queryRunner.query(`ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "tire_id" uuid`);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "listings" ADD CONSTRAINT "FK_listings_tire" FOREIGN KEY ("tire_id") REFERENCES "tires"("id") ON DELETE RESTRICT;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_listings_tire_id" ON "listings" ("tire_id") WHERE "tire_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_listings_category" ON "listings" ("category")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_listings_category_status" ON "listings" ("category", "status")`,
    );

    await queryRunner.query(`ALTER TABLE "listings" ALTER COLUMN "condition" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "listings" ALTER COLUMN "registration_type" DROP NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "listings" ALTER COLUMN "horsepower" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "listings" SET "condition" = 'Undamaged' WHERE "condition" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "listings" SET "registration_type" = 'Local' WHERE "registration_type" IS NULL`,
    );
    await queryRunner.query(`UPDATE "listings" SET "horsepower" = 0 WHERE "horsepower" IS NULL`);
    await queryRunner.query(`ALTER TABLE "listings" ALTER COLUMN "horsepower" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "listings" ALTER COLUMN "registration_type" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "listings" ALTER COLUMN "condition" SET NOT NULL`);

    await queryRunner.query(`DROP INDEX "public"."IDX_listings_category_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_listings_category"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_listings_tire_id"`);
    await queryRunner.query(`ALTER TABLE "listings" DROP CONSTRAINT "FK_listings_tire"`);
    await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "tire_id"`);
    await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "category"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_tires_search_dims"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tires_quantity"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tires_condition"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tires_season"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tires_tire_vehicle_type"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tires_model_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tires_brand_id"`);
    await queryRunner.query(`DROP TABLE "tires"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_tire_models_is_other"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tire_models_brand_archived"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tire_models_brand_id"`);
    await queryRunner.query(`DROP TABLE "tire_models"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_tire_brands_archived_norm"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tire_brands_is_archived"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tire_brands_order"`);
    await queryRunner.query(`DROP TABLE "tire_brands"`);

    await queryRunner.query(`DROP TYPE "tire_condition_enum"`);
    await queryRunner.query(`DROP TYPE "tire_season_enum"`);
    await queryRunner.query(`DROP TYPE "tire_vehicle_type_enum"`);
    await queryRunner.query(`DROP TYPE "listing_category_enum"`);
  }
}
