---
title: Backend scripts
owner: platform
tags:
  - type/reference
  - domain/scripts
  - scope/core
  - status/active
---

# Script organization and usage

Scripts are organized into two directories based on their intended environment:

## Directory Structure

- **`src/scripts/stage/`** - Scripts for staging, development, and testing environments
- **`src/scripts/production/`** - Scripts safe to run in production environment

## Stage Scripts

These scripts are **blocked from running in production** and can only be executed in:
- `stage`
- `development`
- `test`

### Available Stage Scripts

#### Seeding Scripts
- `seed.ts` - Seed test data (users and listings). **Note:** Requires brands and models to exist in database (use `add-brands.ts` or `seed:all-brands` first)
- `seed-vin-test.ts` - Seed test data with VIN codes
- `seed-vehicles-full.ts` - Full vehicle seeding
- `reset-and-seed.ts` - Reset database, add brands/models, and seed test data (automatically calls `add-brands.ts` before seeding)
- `copy-images-to-seed.ts` - Copy images for seeding
- `create-test-listing.ts` - Create a test listing

#### Brand and Model Scripts
- `add-brands.ts` - Add basic brands and models
- `seed-all-brands.ts` - Run all brand and model seeding scripts sequentially (optimized for low memory usage)
- `add-grand-models.ts` - Add Grand versions and extended models
- `add-historical-models.ts` - Add historical models
- `add-models-to-brand.ts` - Add models to existing brand
- `add-french-brands-models.ts` - Add French brands and models
- `add-german-brands-models.ts` - Add German brands and models
- `add-italian-brands-models.ts` - Add Italian brands and models
- `add-japanese-brands-models.ts` - Add Japanese brands and models
- `add-american-brands-models.ts` - Add American brands and models
- `add-commercial-models.ts` - Add commercial vehicle models
- `add-other-model.ts` - Add other model to existing brand
- `sync-popular-brands-from-config.ts` - Sync brands and top models from platform config JSON (popular-brands.json, popular-brands-truck.json, popular-brands-moto.json) into DB; creates missing brands/models and clears brands Redis cache if needed. Run: `COUNTRY=md npm run sync-popular-brands`
- `add-tire-brands-models.ts` - Seed tire brands and models from platform config (`COUNTRY=md npm run add-tire-brands`; production: `add-tire-brands:prod`); clears tire and listing-search Redis cache as needed
- `delete-all-brands.ts` - Delete all brands
- `check-brands-count.ts` - Check brand count
- `check-brands-dates.ts` - Check brand creation dates (not available via npm script, internal utility)
- `check-models-stats.ts` - Models statistics
- `check-citroen-models.ts` - Check Citroen models
- `check-duplicates.ts` - Check for duplicate brands/models
- `remove-duplicates.ts` - Remove duplicate brands and models (handles both brand duplicates and model duplicates within the same brand)
- `remove-body-code-models.ts` - Remove body/chassis code models (E30, W124, etc.) from BMW and Mercedes-Benz; skips models that are used in listings (stage and production)
- `cleanup-brands.ts` - Cleanup and synchronize brands
- `sync-carquery.ts` - Synchronize from CarQuery API
- `update-engine-volumes.ts` - Update engine volumes
- `generate-listings-for-all-models.ts` - Generate listings for all models

#### Database Management Scripts
- `clear-database.ts` - Clear all database data
- `reset-users.ts` - Reset user data
- `check-user.ts` - Check user data

#### User Management Scripts
- `make-admin.ts` - Create admin user

#### Email and Notification Scripts
- `send-test-emails.ts` - Send seven sample transactional emails to `SEND_TEST_EMAIL_TO` using the configured SMTP provider. Stage/dev/test only. Supports `SEND_TEST_EMAIL_LOCALE=en|ro|ru` and retries transient SMTP failures with backoff. Run: `npm run send-test-emails`

#### Cache Management Scripts
- `clear-cache.ts` - Clear all Redis cache
- `clear-listing-cache.ts` - Clear listings cache (with optional listing ID)
- `clear-brands-cache.ts` - Clear brands and models cache

## Production Scripts

These scripts can be run in production, but should still be used with caution:

- `make-admin.ts` - Create or promote user to admin (production-safe)
- `remove-admin.ts` - Remove admin role from user (production-safe)
- `update-listing-titles.ts` - Update listing titles based on vehicle data
- `fix-price-nulls.ts` - Fix NULL values in price column and convert to integer
- `seed-all-brands.ts` - Run all brand and model seeding scripts (production-safe)
- `add-truck-brands-models.ts` - Add truck brands and models (production-safe)
- `add-motorcycle-brands-models.ts` - Add motorcycle brands and models (production-safe)
- `check-brands-count.ts` - Check total brands count (production-safe)
- `check-models-stats.ts` - Check models statistics (production-safe)
- `remove-body-code-models.ts` - Remove BMW/Mercedes body code models (E30, W124, etc.); skips models in use (production-safe)
- `backup-database.ts` - Create database backup (uses pg_dump)
- `backfill-email-verification.ts` - Scan active non-admin users with an unverified email and send verification emails in batches. Defaults to `DRY_RUN=true`; requires full SMTP config for real sends. Run: `npm run backfill:email-verification:prod`

## Security

All stage scripts include environment checks via `script-guard.ts`:

```typescript
import { checkEnvironment } from '../script-guard';
checkEnvironment(['stage', 'development', 'test']);
```

If a stage script is attempted to run in production, it will:
1. Display an error message
2. Exit with code 1
3. Prevent any database operations

## Usage

### Running Stage Scripts

```bash
# On stage/development/test environments
npm run seed
npm run make-admin
npm run clear-database
# etc.
```

#### Seeding All Brands and Models

The `seed:all-brands` script runs all brand and model seeding scripts sequentially with memory optimizations:

```bash
# Basic usage (runs all scripts with 8 second delays between them)
npm run seed:all-brands

# Skip duplicate check to save memory
npm run seed:all-brands -- --skip-duplicates

# Skip heavy scripts (American, Japanese, Commercial, Historical models)
npm run seed:all-brands -- --skip-heavy

# Custom delay between scripts (in milliseconds, default: 8000)
SCRIPT_DELAY_MS=10000 npm run seed:all-brands

# Combine options
SCRIPT_DELAY_MS=10000 npm run seed:all-brands -- --skip-duplicates --skip-heavy
```

**Options:**
- `--skip-duplicates` - Skip duplicate checking (saves memory)
- `--skip-heavy` - Skip heavy scripts (American, Japanese, Commercial, Historical models)
- `SCRIPT_DELAY_MS` - Delay between scripts in milliseconds (default: 8000ms)

**Note:** The script is optimized for low memory usage with:
- Automatic garbage collection between operations
- Increased delays between scripts (8 seconds by default)
- Smaller batch sizes for duplicate checking
- Memory-efficient database queries

### Running Production Scripts

```bash
# On any environment (including production)
npm run make-admin:prod
npm run remove-admin:prod
npm run update-titles
npm run backup

# Database maintenance
npm run fix-price-nulls:prod

# Brand and model management
npm run seed:all-brands:prod
npm run add-truck-brands:prod
npm run add-moto-brands:prod
npm run remove-body-code-models:prod
npm run check-brands:prod
npm run check-models:prod
```

#### Creating Admin User in Production

To create an admin user in production:

```bash
# Basic usage (creates admin@admin.com with password GGGgggTEST777)
npm run make-admin:prod

# With custom email and password
npm run make-admin:prod -- --email your-email@example.com --password your-secure-password

# With all options
npm run make-admin:prod -- --email your-email@example.com --password your-secure-password --first-name Admin --last-name User --phone +38970111111

# Update existing user's password
npm run make-admin:prod -- --email existing@example.com --password new-password --update-password
```

**Options:**
- `--email` - Email address (default: admin@admin.com)
- `--password` - Password (default: GGGgggTEST777)
- `--first-name` - First name (default: Admin)
- `--last-name` - Last name (default: User)
- `--phone` - Phone number (default: +38970111111)
- `--update-password` - Update password for existing user

#### Removing Admin Role in Production

To remove admin role from a user in production:

```bash
# Remove admin role (user becomes Individual by default)
npm run remove-admin:prod -- --email user@example.com

# Remove admin role and set user type to Business
npm run remove-admin:prod -- --email user@example.com --type Business

# Remove admin role and set user type to Individual (explicit)
npm run remove-admin:prod -- --email user@example.com --type Individual
```

**Options:**
- `--email` - Email address (required)
- `--type` - New user type: `Individual` or `Business` (default: `Individual`)

#### Database Maintenance in Production

##### Fixing NULL Values in Price Column

Before running brand/model scripts on production, fix NULL values in the price column:

```bash
npm run fix-price-nulls:prod
```

This script:
- Replaces all NULL values in the `price` column with 0
- Converts the `price` column from decimal to integer type
- Sets NOT NULL constraint

**⚠️ Important:** Run this script BEFORE adding brands and models to prevent database schema conflicts.

#### Brand and Model Management in Production

##### Seeding All Brands and Models

Run all brand and model seeding scripts sequentially (production-safe version):

```bash
# Basic usage (runs all scripts with 8 second delays)
npm run seed:all-brands:prod

# Skip duplicate check to save memory
npm run seed:all-brands:prod -- --skip-duplicates

# Skip heavy scripts (American, Japanese, Commercial, Historical models)
npm run seed:all-brands:prod -- --skip-heavy

# Custom delay between scripts (in milliseconds)
SCRIPT_DELAY_MS=10000 npm run seed:all-brands:prod
```

##### Adding Truck Brands and Models

Add truck brands and models to the database:

```bash
npm run add-truck-brands:prod
```

Includes brands like: Renault Trucks, MAN, Scania, DAF, Volvo Trucks, Mercedes-Benz Trucks, Iveco, etc.

##### Adding Motorcycle Brands and Models

Add motorcycle brands and models to the database:

```bash
npm run add-moto-brands:prod
```

Includes brands like: Yamaha, Honda, BMW, Kawasaki, Ducati, Harley-Davidson, etc.

##### Checking Database Status

Verify that brands and models were added successfully:

```bash
# Check total brands count
npm run check-brands:prod

# Check models statistics
npm run check-models:prod
```

#### Complete Production Setup Sequence

For a fresh production database:

```bash
# 1. Apply migrations
npm run migration:run

# 2. Fix price column issues
npm run fix-price-nulls:prod

# 3. Add all brands and models
npm run seed:all-brands:prod

# 4. Add trucks
npm run add-truck-brands:prod

# 5. Add motorcycles
npm run add-moto-brands:prod

# 6. Clear cache
npm run clear-cache:brands

# 7. Verify
npm run check-brands:prod
npm run check-models:prod
```

## Tool scripts (`src/scripts/tools/`)

Maintenance utilities (not under `stage/` / `production/` guards in the same way; each script calls `checkEnvironment` as needed).

### Blurhash backfill (`backfill-blurhash.ts`)

Requires **PostgreSQL**, **S3 credentials** (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET_NAME`), and image URLs that resolve to keys in that bucket.

| npm script | Effect |
|------------|--------|
| `npm run backfill:blurhash:cover` | Active listings with `cover_blur_hash IS NULL`: fetch first image from S3, set `cover_blur_hash`. |
| `npm run backfill:blurhash:all` | Active listings with `image_blur_hashes IS NULL`: fetch each image, set `image_blur_hashes` (nullable slots on failure) and sync `cover_blur_hash` from the first successful hash / first slot. |

Batches of 50, 1s pause between batches. Idempotent for the chosen criterion (`NULL` column). Operational notes: `core/docs/guides/image-optimization-setup-ru.md` (Step 3).

**Local vs production UI:** Missing blur placeholders in the Next.js app on localhost usually means listing rows have null blurhash columns in the DB you hit locally—not a dev-build switch. Align data (create via the app, or backfill) or see `core/docs/features/image-preview.md` (Local development vs production).

### Partner listing imports (`cipauto-import`, `999md-import`)

Shared code lives in `src/scripts/tools/partner-import-shared/` (Kupito API client, upload, mappers, registry/report helpers). Each importer has its own CLI and parsers under `cipauto-import/` and `999md-import/`.

| npm script | Effect |
|------------|--------|
| `npm run cipauto:scan` / `cipauto:import` / `cipauto:report` | CipAuto HTML catalog → Kupito API |
| `npm run 999md:scan` / `999md:import` / `999md:report` | 999.md GraphQL → same downstream pipeline |
| `npm run 999md:dealer-audit` | Brand/model audit report vs live Kupito API |

From the **platform repo root**, the same flows are exposed as `npm run 999md:*` (see root `package.json`). Full env flags and checklists: `core/docs/features/cipauto-import.md`, `core/docs/features/999md-import.md`.

## Migration Scripts

Database migrations are handled separately and are located in:
- `src/migrations/` - Migration files
- Run with: `npm run migration:run`
- Revert with: `npm run migration:revert`

## Notes

- All scripts use relative imports from their directory level
- Stage scripts automatically check environment before execution
- Production scripts should be reviewed before running on production
- Always backup database before running any script on production

## Database Backups

For automated database backups, see:
- **Documentation**: `../../docs/guides/deployment.md` (Database Backups section)
- **TypeScript script**: `src/scripts/production/backup-database.ts`
- **Bash script**: `config/scripts/backup-database.sh` (for cron)

Quick usage:
```bash
# Manual backup
npm run backup

# With custom options
npm run backup -- --output-dir /path/to/backups --keep-days 60
```

