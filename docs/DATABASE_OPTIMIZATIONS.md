# Database Optimizations

This document describes the database optimizations applied to improve query performance and maintain data integrity.

## Indexes

### Listings Table
- `status` - For filtering active listings
- `user_id` - For finding user's listings
- `status, user_id` - Composite index for counting active listings per user
- `status, last_updated_at` - For auto-closing old listings
- `price` - For price filtering and sorting
- `created_at` - For date-based sorting
- `views` - For sorting by popularity
- `vin` - For VIN-based searches (partial index, only non-null values)
- `urgent` - For prioritizing urgent listings (partial index, only urgent listings)
- `currency` - For currency filtering
- `city` - For city-based searches (B-tree or GIN if pg_trgm is available)
- `title` - For title searches (B-tree or GIN if pg_trgm is available)

### Vehicles Table
- `brand_id` - For brand filtering
- `model_id` - For model filtering
- `brand_id, model_id` - Composite index for brand+model queries
- `year` - For year filtering and sorting
- `fuel` - For fuel type filtering (partial index, only non-null values)
- `transmission` - For transmission filtering (partial index, only non-null values)
- `body_type` - For body type filtering
- `mileage_km` - For mileage filtering (partial index, only non-null values)
- `engine_displ_l` - For engine displacement filtering (partial index, only non-null values)

### Users Table
- `phone` - For phone-based authentication (partial index, only non-null values)
- `type` - For filtering by user type
- `active` - For filtering active users
- `email` - Already has unique constraint (creates index automatically)

### Favorites Table
- `user_id` - For finding user's favorites
- `listing_id` - For finding who favorited a listing
- `created_at` - For sorting favorites by date
- `user_id, listing_id` - Already has unique constraint (creates index automatically)

### Brands Table
- `order` - For sorting brands by order

### Vehicle Models Table
- `brand_id` - For finding models by brand
- `order` - For sorting models by order

### Listing Views Table
- `listing_id` - For finding views by listing
- `created_at` - For time-based analytics
- `listing_id, user_id` - Unique index for user views (partial, only non-null user_id)
- `listing_id, visitor_id` - Unique index for visitor views (partial, only non-null visitor_id)

## Triggers

### 1. Auto-update `last_updated_at` on Listing Updates
**Function:** `update_listing_last_updated_at()`
**Trigger:** `trigger_update_listing_last_updated_at`
**Purpose:** Automatically updates `last_updated_at` timestamp when a listing is modified, ensuring accurate tracking of listing freshness.

### 2. Auto-increment Views Counter
**Function:** `update_listing_views_count()`
**Trigger:** `trigger_update_listing_views_count`
**Purpose:** Automatically increments the `views` counter in the `listings` table when a new view is recorded, eliminating the need for manual updates in application code.

### 3. Cleanup Listing Views on Listing Delete
**Function:** `cleanup_old_listing_views()`
**Trigger:** `trigger_cleanup_old_listing_views`
**Purpose:** Automatically removes all view records when a listing is deleted, maintaining referential integrity.

### 4. Cleanup Favorites on Listing Delete
**Function:** `cleanup_favorites_on_listing_delete()`
**Trigger:** `trigger_cleanup_favorites_on_listing_delete`
**Purpose:** Automatically removes all favorite records when a listing is deleted, maintaining referential integrity.

## Additional Optimizations

### Partial Indexes
Partial indexes are used for columns that frequently have NULL values. This reduces index size and improves performance:
- `vin` - Only indexes non-null VINs
- `urgent` - Only indexes urgent listings
- `fuel`, `transmission`, `mileage_km`, `engine_displ_l` - Only indexes non-null values
- `phone` - Only indexes non-null phone numbers

### Composite Indexes
Composite indexes are created for common query patterns:
- `status, user_id` - For counting active listings per user
- `status, last_updated_at` - For auto-closing old listings
- `brand_id, model_id` - For brand+model filtering

### Full-Text Search Support
If the `pg_trgm` extension is available, GIN indexes are created for `city` and `title` columns to support efficient ILIKE queries. Otherwise, standard B-tree indexes are used.

## Performance Impact

These optimizations provide:
1. **Faster search queries** - Indexes on frequently filtered columns
2. **Faster sorting** - Indexes on commonly sorted columns
3. **Reduced application code** - Triggers handle automatic updates
4. **Data integrity** - Triggers ensure cleanup of related records
5. **Smaller indexes** - Partial indexes reduce storage and improve performance

## Migration

To apply these optimizations, run:
```bash
npm run migration:run
```

To rollback:
```bash
npm run migration:revert
```

## Connection Pooling

Connection pooling has been configured to optimize database connection management:

- **Max connections:** 20 (configurable via `DB_POOL_MAX` env variable)
- **Min connections:** 5 (configurable via `DB_POOL_MIN` env variable)
- **Idle timeout:** 30 seconds (configurable via `DB_POOL_IDLE_TIMEOUT` env variable)
- **Connection timeout:** 2 seconds (configurable via `DB_POOL_CONNECTION_TIMEOUT` env variable)

These settings help:
- Reduce connection overhead
- Manage connection resources efficiently
- Prevent connection exhaustion
- Improve response times under load

## Code Optimizations

### Removed Manual Views Counter Updates
The `recordView` method in `ListingsService` no longer manually increments the views counter. This is now handled automatically by the database trigger, reducing:
- Database round trips
- Race conditions
- Application code complexity

## Future Optimizations

Consider implementing:
1. **Materialized views** for complex aggregations (e.g., popular listings, brand statistics)
2. **Table partitioning** for `listing_views` table by date if it grows very large
3. **Query result caching** for frequently accessed data (e.g., brands, models, cities)
4. **Read replicas** for read-heavy workloads
5. **Query optimization** - Use `select` to fetch only required fields instead of full entities
6. **Batch operations** - Optimize bulk inserts/updates
7. **Database statistics** - Regularly run `ANALYZE` to keep query planner statistics up to date

