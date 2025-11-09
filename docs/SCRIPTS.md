# Utility Scripts

All utility scripts are located in `backend/src/scripts/` and can be executed via npm commands.

## 📦 Brand and Model Scripts

### Adding Brands and Models

```bash
# Add basic brands and models
npm run add-brands

# Add historical and rare models
npm run add-historical

# Add Grand versions and extended models
npm run add-grand

# Add specific models to existing brand
npm run add-models
```

**Files:**
- `add-brands.ts` - Add basic brands and models
- `add-historical-models.ts` - Historical models from 80s, 90s, and 2000s
- `add-grand-models.ts` - Grand versions and extended models
- `add-models-to-brand.ts` - Add models to existing brand

### Checking and Management

```bash
# Check brand count
npm run check-brands

# Check models statistics
npm run check-models

# Delete all brands
npm run delete-all-brands

# Cleanup and synchronize brands
npm run cleanup-brands

# Synchronize from CarQuery API
npm run sync-carquery
```

**Files:**
- `check-brands-count.ts` - Check brand count
- `check-models-stats.ts` - Models statistics by brand
- `delete-all-brands.ts` - Delete all brands and related data
- `cleanup-brands.ts` - Cleanup and synchronize brands
- `sync-carquery.ts` - Synchronize from CarQuery API

**Note:** `check-brands-dates.ts` exists but is not available via npm script (internal utility).

## 🗄️ Database Scripts

### Seeding

```bash
# Basic seeding
npm run seed

# Clear database and seed fresh data (with VIN, active users/listings, seed images)
npm run reset-and-seed

# Seeding with VIN tests
npm run seed:vin

# Full vehicle seeding
npm run seed:vehicles
```

**Files:**
- `seed.ts` - Basic seeding of brands, models, and cities (all listings have VIN, all users/listings are active)
- `reset-and-seed.ts` - Clear database and generate fresh data with VIN history
- `seed-vin-test.ts` - Seeding with VIN data for testing
- `seed-vehicles-full.ts` - Full vehicle seeding with brands and models

**Seed Images:**
- Place images in `backend/uploads/seed-images/` directory
- Supported formats: `.jpg`, `.jpeg`, `.png`, `.webp`
- Images will be automatically used for listings generation
- See `backend/uploads/seed-images/README.md` for details

### Database Management

```bash
# Clear entire database
npm run clear-database

# Update listing titles
npm run update-titles
```

**Files:**
- `clear-database.ts` - Clear all data from database
- `update-listing-titles.ts` - Update listing titles

### Cache Management

```bash
# Clear all Redis cache
npm run clear-cache

# Clear listings cache (search, single, user listings)
npm run clear-cache:listings

# Clear cache for specific listing
npm run clear-cache:listing <listing-id>

# Clear brands and models cache
npm run clear-cache:brands
```

**Files:**
- `clear-cache.ts` - Clear all Redis cache
- `clear-listing-cache.ts` - Clear listings cache (with optional listing ID)
- `clear-brands-cache.ts` - Clear brands and models cache

## 👥 User Scripts

```bash
# Create admin user
npm run make-admin

# Reset users
npm run reset-users
```

**Files:**
- `make-admin.ts` - Create admin user
- `reset-users.ts` - Reset users

## 📝 Usage

### Example: Adding New Models

1. Open the file `backend/src/scripts/add-models-to-brand.ts`
2. Add models to the `ADDITIONAL_MODELS` object:
   ```typescript
   const ADDITIONAL_MODELS: Record<string, string[]> = {
     "BMW": ["X7", "X6", "4 Series"],
     "Mercedes-Benz": ["AMG GT", "EQS"],
   };
   ```
3. Run the script:
   ```bash
   npm run add-models
   ```

### Example: Adding Historical Models

1. Open the file `backend/src/scripts/add-historical-models.ts`
2. Modify the `HISTORICAL_AND_RARE_MODELS` object
3. Run the script:
   ```bash
   npm run add-historical
   ```

## 🔧 API for Adding Models

You can also add models via API:

```bash
curl -X POST http://localhost:4000/api/brands/name/BMW/models \
  -H "Content-Type: application/json" \
  -d '{"models": ["X7", "X6", "4 Series"]}'
```

## 📊 Statistics

Current statistics (as of last update):
- **79 brands** in database
- **774+ models** in database
- Support for historical models from 80s, 90s, and 2000s
- Grand versions of various models
- Rare and special models

## ⚠️ Warnings

- Scripts `delete-all-brands` and `clear-database` delete all data - use with caution
- Scripts automatically add only new models (do not create duplicates)
- All scripts require an active database connection
