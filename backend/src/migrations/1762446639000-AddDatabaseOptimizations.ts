import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDatabaseOptimizations1762446639000 implements MigrationInterface {
  name = 'AddDatabaseOptimizations1762446639000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listings_status" ON "listings" ("status");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listings_user_id" ON "listings" ("user_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listings_status_user_id" ON "listings" ("status", "user_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listings_status_last_updated_at" ON "listings" ("status", "last_updated_at");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listings_price" ON "listings" ("price");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listings_created_at" ON "listings" ("created_at");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listings_views" ON "listings" ("views");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listings_vin" ON "listings" ("vin") WHERE "vin" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listings_urgent" ON "listings" ("urgent") WHERE "urgent" = true;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listings_currency" ON "listings" ("currency");
    `);

    const pgTrgmExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'
      )
    `);

    if (pgTrgmExists[0]?.exists) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_listings_city_gin" ON "listings" USING gin("city" gin_trgm_ops);
      `);

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_listings_title_gin" ON "listings" USING gin("title" gin_trgm_ops);
      `);
    } else {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_listings_city" ON "listings" ("city");
      `);

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_listings_title" ON "listings" ("title");
      `);
    }

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vehicles_brand_id" ON "vehicles" ("brand_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vehicles_model_id" ON "vehicles" ("model_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vehicles_brand_model" ON "vehicles" ("brand_id", "model_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vehicles_year" ON "vehicles" ("year");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vehicles_fuel" ON "vehicles" ("fuel") WHERE "fuel" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vehicles_transmission" ON "vehicles" ("transmission") WHERE "transmission" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vehicles_body_type" ON "vehicles" ("body_type");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vehicles_mileage_km" ON "vehicles" ("mileage_km") WHERE "mileage_km" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vehicles_engine_displ_l" ON "vehicles" ("engine_displ_l") WHERE "engine_displ_l" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_phone" ON "users" ("phone") WHERE "phone" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_type" ON "users" ("type");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_active" ON "users" ("active");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_favorites_user_id" ON "favorites" ("user_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_favorites_listing_id" ON "favorites" ("listing_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_favorites_created_at" ON "favorites" ("created_at");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vehicle_models_brand_id" ON "vehicle_models" ("brand_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vehicle_models_order" ON "vehicle_models" ("order");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_brands_order" ON "brands" ("order");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listing_views_listing_id" ON "listing_views" ("listing_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_listing_views_created_at" ON "listing_views" ("created_at");
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_listing_last_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'UPDATE' THEN
          NEW.last_updated_at = CURRENT_TIMESTAMP;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_update_listing_last_updated_at ON listings;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_update_listing_last_updated_at
      BEFORE UPDATE ON listings
      FOR EACH ROW
      WHEN (OLD.* IS DISTINCT FROM NEW.*)
      EXECUTE FUNCTION update_listing_last_updated_at();
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_listing_views_count()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE listings SET views = views + 1 WHERE id = NEW.listing_id;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_update_listing_views_count ON listing_views;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_update_listing_views_count
      AFTER INSERT ON listing_views
      FOR EACH ROW
      EXECUTE FUNCTION update_listing_views_count();
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION cleanup_old_listing_views()
      RETURNS TRIGGER AS $$
      BEGIN
        DELETE FROM listing_views 
        WHERE listing_id = OLD.id;
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_cleanup_old_listing_views ON listings;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_cleanup_old_listing_views
      AFTER DELETE ON listings
      FOR EACH ROW
      EXECUTE FUNCTION cleanup_old_listing_views();
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION cleanup_favorites_on_listing_delete()
      RETURNS TRIGGER AS $$
      BEGIN
        DELETE FROM favorites 
        WHERE listing_id = OLD.id;
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_cleanup_favorites_on_listing_delete ON listings;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_cleanup_favorites_on_listing_delete
      AFTER DELETE ON listings
      FOR EACH ROW
      EXECUTE FUNCTION cleanup_favorites_on_listing_delete();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_cleanup_favorites_on_listing_delete ON listings;`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS cleanup_favorites_on_listing_delete();`);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_cleanup_old_listing_views ON listings;`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS cleanup_old_listing_views();`);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_update_listing_views_count ON listing_views;`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_listing_views_count();`);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_update_listing_last_updated_at ON listings;`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_listing_last_updated_at();`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listing_views_created_at";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listing_views_listing_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_brands_order";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vehicle_models_order";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vehicle_models_brand_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_favorites_created_at";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_favorites_listing_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_favorites_user_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_active";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_type";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_phone";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vehicles_engine_displ_l";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vehicles_mileage_km";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vehicles_body_type";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vehicles_transmission";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vehicles_fuel";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vehicles_year";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vehicles_brand_model";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vehicles_model_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vehicles_brand_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_title_gin";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_city_gin";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_title";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_city";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_currency";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_urgent";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_vin";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_views";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_created_at";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_price";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_status_last_updated_at";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_status_user_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_user_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_listings_status";`);
  }
}
