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

- `add-brands.ts` - Add basic brands and models (legacy; prefer catalog seed)
- `seed-vehicle-catalog.ts` - Upsert brands/models from `src/scripts/data/vehicle-catalog.json` (source of truth). Run: `npm run seed:vehicle-catalog` / `seed:vehicle-catalog:prod`
- `export-vehicle-catalog-from-api.ts` (tools) - Refresh `vehicle-catalog.json` from a live API (default `https://api.kupito.club`). Run: `npm run export:vehicle-catalog`
- `seed-all-brands.ts` - Seeds from `vehicle-catalog.json` (same as `seed:vehicle-catalog`); regional `add-*-models` scripts remain for manual use only
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
- `clear-listing-ai-reports.ts` - Delete all rows in `listing_ai_reports` and clear listing AI analysis Redis locks/quotas (stage/dev/test only; run `npm run clear-listing-ai-reports`)

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
- `clear-listing-ai-reports.ts` - Delete all cached listing AI analyses and related Redis keys (`npm run clear-listing-ai-reports:prod` on prod)
- `backup-database.ts` - Create database backup (uses pg_dump)

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

`seed:all-brands` / `seed:all-brands:prod` upsert from the committed snapshot
[`src/scripts/data/vehicle-catalog.json`](../src/scripts/data/vehicle-catalog.json)
(exported from a live platform API, typically Kupito production).

```bash
# Basic usage
npm run seed:all-brands

# Same upsert without the post-pass duplicate scan
npm run seed:all-brands -- --skip-duplicates

# Refresh the snapshot from Kupito (or another API), then commit the JSON
npm run export:vehicle-catalog
npm run export:vehicle-catalog -- --api-url https://api.kupito.club

# Seed only the catalog (same data path as seed:all-brands)
npm run seed:vehicle-catalog
```

**Options:**

- `--skip-duplicates` - Skip the post-seed duplicate name scan
- `--skip-heavy` - Ignored (kept for CLI compatibility; regional heavy scripts are no longer chained)

**Note:** Legacy regional scripts (`add-brands`, `add-german-models`, …) remain available for one-off manual runs but are **not** invoked by `seed:all-brands`. To capture manual admin additions from production, re-run `export:vehicle-catalog` and commit the updated JSON.

### Running Production Scripts

```bash
# On any environment (including production)
npm run make-admin:prod
npm run remove-admin:prod
npm run update-titles
npm run backup

# Database maintenance
npm run fix-price-nulls:prod
npm run clear-listing-ai-reports:prod

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

Upserts from `src/scripts/data/vehicle-catalog.json` (production-safe):

```bash
npm run seed:all-brands:prod

# Skip post-seed duplicate name scan
npm run seed:all-brands:prod -- --skip-duplicates

# Refresh snapshot from Kupito before committing / deploying
npm run export:vehicle-catalog
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
# 1. Apply migrations (requires prior `npm run build`)
npm run migration:run:prod

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

| npm script                        | Effect                                                                                                                                                                                          |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run backfill:blurhash:cover` | Active listings with `cover_blur_hash IS NULL`: fetch first image from S3, set `cover_blur_hash`.                                                                                               |
| `npm run backfill:blurhash:all`   | Active listings with `image_blur_hashes IS NULL`: fetch each image, set `image_blur_hashes` (nullable slots on failure) and sync `cover_blur_hash` from the first successful hash / first slot. |
| `npm run backfill:blurhash:cover:prod` | Same as `cover`, but runs **compiled** `dist/scripts/tools/backfill-blurhash.js` (no `ts-node` / `tsconfig-paths`). Use on hosts where devDependencies are omitted (e.g. Render shell after deploy). |
| `npm run backfill:blurhash:all:prod`   | Same as `all`, compiled entrypoint.                                                                                                                                                             |

Batches of 50, 1s pause between batches. Idempotent for the chosen criterion (`NULL` column).

**Render / production shell:** After a successful `nest build` deploy, run `backfill:blurhash:cover:prod` (or `all:prod`) from `core/backend`. The plain `backfill:blurhash:*` scripts need devDependencies (`ts-node`, `tsconfig-paths`) and fail with `Cannot find module 'tsconfig-paths/register'` if those were not installed.

**Note:** Partner import scripts (CipAuto, 999.md) now include `image_blur_hashes` in the create-listing payload automatically by collecting `blurhash` from each upload response. Backfill is only needed for listings created before this integration.

**Local vs production UI:** Missing blur placeholders in the Next.js app on localhost usually means listing rows have null blurhash columns in the DB you hit locally—not a dev-build switch. Align data (create via the app, or backfill) or see `core/docs/features/image-preview.md` (Local development vs production).

### Card delivery variant warm-up (`warm-card-variants.ts`)

Requires **PostgreSQL**, **S3 credentials** (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET_NAME`), and image URLs that resolve to keys in that bucket.

| npm script | Effect |
| ---------- | ------ |
| `npm run warm:card-variants:cover` | Active listings: for each cover (`images[0]`), ensure persistent `/uploads/optimized/{uuid}_{640\|750\|828\|1080\|1200}_75.webp` exists (skip if already present). |
| `npm run warm:card-variants:all` | Same widths for **every** photo in each active listing (carousel + listing page). |
| `npm run warm:card-variants:cover:prod` | Same as `cover`, compiled `dist/scripts/tools/warm-card-variants.js`. |
| `npm run warm:card-variants:all:prod` | Same as `all`, compiled entrypoint. |

Keyset pagination (newest listings first), batches of 50, 1s pause between batches. Idempotent: uses S3 `HeadObject` on each target variant before encoding. Safe to interrupt and rerun.

**Render / production shell:** After deploy with `nest build`, run `warm:card-variants:cover:prod` from `core/backend` once to warm existing inventory. New uploads are warmed automatically in `UploadService.saveFile`. Plain `warm:card-variants:*` scripts need devDependencies (`ts-node`, `tsconfig-paths`).

### Admin parsing (Nest runtime)

The admin **Parsing** UI triggers parser CLI pipelines via a managed child process and parser catalog entries. Configure these **backend** variables (see also `core/docs/features/admin-parsing-ru.md` and `core/docs/features/parsing-framework.md`):

**Registry sync (UI):** For parsers whose catalog entry sets `registrySyncEnabled`, the **PLP files** table includes **Sync registry**. It creates a `parser_runs` row with `run_type: sync`, calls the same `seed-registry` TypeScript entrypoint as `npm run cipauto:seed-registry` / `npm run 999md:seed-registry` / `npm run autooutlet:seed-registry` (stdout/stderr → `parser_log_chunks`, optional cancel, `reportJson=` path captured like PDP reports). Endpoints: `GET /api/admin/parsing/parsers/:parserCode/plp-files/:fileKey/sync-hint`, `POST .../sync-runs` (body optional `assignedUserId`). The same **GET sync-hint** is also used when choosing a PLP file in **Admin → Parsing → manual PDP** and in the **scheduler** form for **PDP** runs (to prefill the partner UUID); only **POST sync-runs** is restricted to `registrySyncEnabled` parsers.

| Variable                                                                   | Purpose                                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ADMIN_PARSING_TARGET_ENV`                                                 | `local` (default) or `prod` / `production` — parsed server-side; clients cannot override.                                                                                                                                                                                                 |
| `ADMIN_PARSING_KUPITO_API_URL`                                             | Kupito API base URL for the import client (falls back to legacy `KUPITO_IMPORT_API_URL` / `CIPAUTO_API_URL` if unset).                                                                                                                                                                    |
| `ADMIN_PARSING_ADMIN_EMAIL`                                                | Service admin email for CLI auth (falls back to `KUPITO_IMPORT_ADMIN_EMAIL` / `CIPAUTO_ADMIN_EMAIL`).                                                                                                                                                                                     |
| `ADMIN_PARSING_ADMIN_PASSWORD`                                             | Service admin password (falls back to legacy import env vars).                                                                                                                                                                                                                            |
| `ADMIN_PARSING_IMPORT_SECRET`                                              | Import secret for the Kupito API client (falls back to `KUPITO_IMPORT_SECRET` / `CIPAUTO_IMPORT_SECRET`).                                                                                                                                                                                 |
| `ADMIN_PARSING_SCHEDULER_ENABLED`                                          | `true` by default; set `false` / `0` / `no` to disable cron-triggered schedules.                                                                                                                                                                                                          |
| `ADMIN_PARSING_CANCEL_GRACE_MS`                                            | Grace period before SIGKILL on cancel (default 60000, max 600000).                                                                                                                                                                                                                        |
| `ADMIN_PARSING_MAX_CONCURRENT_RUNS`                                        | Reserved for future use (the orchestrator runs at most one child process per parser + run type + target env; extra runs stay `queued` in FIFO order).                                                                                                                                      |
| `ADMIN_PARSING_CLI_OVERRIDE_<PARSER_CODE>`                                 | Optional custom command prefix for a parser CLI process (for example `ADMIN_PARSING_CLI_OVERRIDE_CIPAUTO`). Use only trusted values from deployment config or secrets management.                                                                                                         |
| `PARSING_RUNTIME_DIR`                                                      | Root directory for parser registry, PLP JSON, and `reports/` on the backend host. Default when unset: `runtime/parsing` under the backend process `cwd` (typically `core/backend`). On persistent-disk deployments, set to the mount path so admin runs, scheduler, and manual CLI agree. |
| `CIPAUTO_REGISTRY_PATH`, `CIPAUTO_CURRENT_PLP_PATH`, `CIPAUTO_REPORTS_DIR` | Optional absolute or `cwd`-relative overrides for CipAuto file paths.                                                                                                                                                                                                                     |
| `AUTOOUTLET_REGISTRY_PATH`, `AUTOOUTLET_CURRENT_PLP_PATH`, `AUTOOUTLET_REPORTS_DIR` | Optional overrides for AutoOutlet paths (defaults under `<runtime>/autooutlet/`).                                                                                                                                                                                        |
| `SITE999MD_REGISTRY_PATH`, `SITE999MD_REPORTS_DIR`                         | Optional overrides for 999.md registry and reports (PLP dir stays `<runtime>/999md/current-plp/`).                                                                                                                                                                                        |

When any of the path variables above are set to a non-empty value, the admin parser runner forwards them into the parser CLI child environment together with `PARSING_RUNTIME_DIR`, so scheduled and manual admin runs use the same layout as shell commands.

Legacy compatibility:

- `ADMIN_PARSING_CIPAUTO_CLI` is still supported as a fallback for `cipauto`.

Schedules and run history are stored in PostgreSQL (`parser_runs`, `parser_schedules`, `parser_log_chunks`). Parser raw artifacts remain file-based in parser-owned folders:

- PLP snapshot file (`plpDataPath` in parser catalog, if configured)
- parser registry and reports under `PARSING_RUNTIME_DIR` (default `runtime/parsing/<parser>/`: `cipauto-registry.json`, `999md-registry.json`, `autooutlet-registry.json`, `reports/`)

The API exposes normalized summaries on runs while the CLI files remain the raw source of truth.

### Partner listing imports (`cipauto-import`, `999md-import`, `autooutlet-import`)

Shared code lives in `src/scripts/tools/partner-import-shared/` (Kupito API client, upload, mappers, registry/report helpers).

Parser implementation lives in the core submodule (`src/scripts/tools/cipauto-import/`, `src/scripts/tools/999md-import/`, `src/scripts/tools/autooutlet-import/`). Admin visibility and defaults come from the platform root `config/parsers.ts` (copied into core by `npm run prepare:build`).

| npm script                                                   | Effect                                                      |
| ------------------------------------------------------------ | ----------------------------------------------------------- |
| `npm run cipauto:scan` / `cipauto:import` / `cipauto:report` | CipAuto HTML catalog → Kupito API                           |
| `npm run autooutlet:scan` / `autooutlet:import` / `autooutlet:report` | AutoOutlet.md catalog + PDP → same pipeline |
| `npm run 999md:scan` / `999md:import` / `999md:report`       | 999.md GraphQL → same downstream pipeline                   |
| `npm run cipauto:seed-registry`                              | Seed registry from existing Kupito listings (deduplication) |
| `npm run autooutlet:seed-registry`                           | Seed AutoOutlet registry + partner keys from DB (Cod Produs / URL / partner key) |
| `npm run 999md:seed-registry`                                | Seed 999.md registry + partner keys from Kupito DB + 999 PLP/PDP (dedup after lost registry) |
| `npm run partner:check-urls`                                 | PDP check for listings with saved `partner_listing_canonical_url` (JSON+CSV report)          |
| `npm run partner:mark-parsed`                                | Set `listings.is_parsed=true` from registry/PLP for a partner user (any status)              |
| `npm run partner:reopen-parsed`                              | Reopen Closed `is_parsed` listings still active on source; optional `--plp-only` (does not touch `last_updated_at`) |
| `npm run cipauto:audit-stale`                                | Find and close listings removed from CipAuto                |
| `npm run autooutlet:audit-stale`                             | Find and close listings not in AutoOutlet PLP snapshot / verify PDP |
| `npm run 999md:dealer-audit`                                 | Brand/model audit report vs live Kupito API                 |

**PDP import — optional listing video:** when PDP yields a `videoUrl`, imports call `POST /api/upload/video/from-url` after the listing exists; failures are non-fatal (see `core/docs/features/listings.md`).

**PDP import — optional DB dedup:** `cipauto:import`, `999md:import`, and `autooutlet:import` accept `--check-user-duplicates-before-create` (opens the same Postgres connection pattern as `seed-registry`, skips `createListing` when a same-user duplicate is detected). `999md:import` also accepts `--dedupe-999-price-tolerance-pct` and `--dedupe-999-photo-count-tolerance` for fingerprint tolerances (defaults `0` and `1`). The admin **Parsing → PDP** modal and PDP schedules persist the same flag in run/schedule `config_snapshot`. See `docs/parsing/cipauto-import.md`, `docs/parsing/999md-import.md`, `docs/parsing/autooutlet-import.md`, and `core/docs/features/parsing-framework.md`.

**PDP import — optional brand/model auto-create:** the same three import CLIs accept `--auto-create-brands` and `--auto-create-models`. When enabled, `BrandModelResolver` calls `POST /api/admin/brands` or `POST /api/admin/vehicle-models` to create the missing entry and continues importing in the same run; HTTP 409 is treated as a race and resolved by re-fetching once. The import account must be **Admin**. The admin **Parsing → PDP** modal and PDP schedules persist these as `config_snapshot.autoCreateBrands` / `autoCreateModels` (legacy combined `autoCreateBrandsModels` is still accepted for older snapshots).

#### CipAuto registry seeding (`seed-registry`)

When a partner already has listings in the Kupito database **before** the first PLP/PDP run, the parser registry is empty and all listings would be imported as duplicates. `seed-registry` prevents this by pre-populating the registry.

The script reads all listings for a given user, extracts the CipAuto product code (`Cod Produs: XXXXX`) from descriptions, and writes `sourceListingId → kupitoListingId` mappings into the parser registry JSON. It also updates each matched Kupito row with `partner_source_code`, `partner_listing_external_key`, and `partner_listing_canonical_url` (derived listing URL). Subsequent PLP scans preserve these mappings, and PDP imports skip (or update) matched listings instead of creating duplicates.

```bash
npm run cipauto:seed-registry -- [--env prod] <userId>
```

The script handles:

- HTML entities in descriptions (`&nbsp;`)
- Case normalization (uppercase `D08422` in description matches lowercase `d08422` in URL)
- Idempotent runs (skips entries already in the registry)

**When to run:** Once, before the first PLP scan for a partner that already has listings imported through other means — or after a fresh PLP scan if you need to re-link registry rows (the script does not depend on the PLP JSON body; see `docs/parsing/cipauto-import.md`).

The same logic is available from the admin **Parsing → PLP files → Sync registry** action when `registrySyncEnabled` is set for CipAuto.

#### 999.md registry seeding (`999md-import/commands/seed-registry.ts`)

When a partner already has vehicle listings in Kupito but the **999.md JSON registry** (`999md-registry.json`) is missing or out of sync, `999md:seed-registry` rebuilds `sourceListingId → kupitoListingId` by matching live 999 profile ads (PLP + PDP) against DB rows: **VIN** first, then a strict **fingerprint** (brand/model via resolver, mapped fuel/color, year, mileage, engine volume, price+currency, image count). Only unambiguous single matches are written; outcomes are logged to `reports/999md-seed-*.{json,csv}`. By default it also sets `listings.partner_source_code` / `partner_listing_external_key` / `partner_listing_canonical_url` for matched listings (skipped with `--dry-run`). Requires PostgreSQL, the same Kupito import env as `999md:import`, and a backend migration that adds the partner columns to `listings`.

```bash
npm run 999md:seed-registry -- --login=AGMOTORS --userId=<UUID> [--env local|prod] [--dry-run] [--delay ms] [--price-tolerance-pct n] [--photo-count-tolerance n]
```

See `docs/parsing/999md-import.md` for full flag list and operational notes.

The same logic is available from the admin **Parsing → PLP files → Sync registry** action on a profile’s PLP file when `registrySyncEnabled` is set for 999.md.

#### Partner listing URL check (`partner:check-urls`)

Reads vehicle listings for a user that already have `partner_source_code` and a non-null `partner_listing_canonical_url`, runs the same PDP parser as imports (`cipauto`, `999md`, or `autooutlet`), and writes `reports/partner-url-check-*.{json,csv}` with `outcome` (`active` / `closed` / `error`) plus `sourceStatus` / `sourceStatusReason` when available.

```bash
npm run partner:check-urls -- --partner cipauto|999md|autooutlet --userId=<UUID> [--env local|prod] [--dry-run] [--limit N] [--delay ms]
```

#### Mark parsed listings (`partner:mark-parsed`)

Sets `listings.is_parsed = true` for a partner user from the parser registry and the current PLP snapshots. Matches by `kupitoListingId` from the registry and/or `partner_source_code` + `partner_listing_external_key`. Status is not filtered (`Active` / `Paused` / `Closed`). Does not change `last_updated_at` or any other field. Use after a fresh PLP scan when backfill by `partner_source_code` is not enough (legacy rows).

Snapshot defaults per partner: `cipauto` and `autooutlet` read the single `currentPlpPath` file, `999md` reads every `*.json` in `currentPlpDir` (one file per scanned login). A missing default snapshot is skipped (registry-only run); an explicit `--plp-file` that does not exist is an error.

```bash
npm run partner:mark-parsed -- --partner cipauto|999md|autooutlet --userId=<UUID> [--env local|prod] [--plp-file <path>] [--dry-run]
```

#### Reopen parsed listings (`partner:reopen-parsed`)

Finds `Closed` listings with `is_parsed = true` and a saved `partner_listing_canonical_url`, verifies each PDP is still active on the source, and reopens matches as `Active` (`closed_at = null` only). **Does not change** `last_updated_at` / `last_published_at` / `created_at`, so restored ads keep their previous sort position. Stops when the user’s Active limit would be exceeded (Business 1000 / Individual 100). URLs whose host does not match the partner host are reported as `skip_error` without a network request. After real reopens the `cache:listings*` Redis namespace is invalidated. Always run `--dry-run` first.

Use `--plp-only` to reopen only listings that match the current PLP snapshot (default partner `currentPlpPath` / `currentPlpDir`, or explicit `--plp-file`). For `cipauto`, matching uses the same rules as `cipauto:audit-stale` (external key, canonical `/vehicul/...` slug, Cod Produs / unique slug prefix). For `autooutlet` and `999md`, matching is exact `partner_listing_external_key` against PLP keys. Without `--plp-only`, live PDPs outside the current catalog can be reopened.

```bash
npm run partner:reopen-parsed -- --partner cipauto|999md|autooutlet --userId=<UUID> [--env local|prod] [--plp-only] [--plp-file <path>] [--dry-run] [--limit N] [--delay ms]
```

#### CipAuto stale listings audit (`audit-stale-listings`)

Identifies Kupito listings that no longer exist on CipAuto. Works in two phases:

1. **Registry cross-reference** — compares Kupito listings against the active PLP registry (fast, no network).
2. **Website verification** — for each candidate, fetches the CipAuto page and checks for HTTP 404/410 or the "VÂNDUT" (sold) template. Only confirmed-closed listings are flagged.

```bash
# Fastest: use PLP snapshot as source of truth for active sourceIds (no HTTP)
# Path is relative to cwd when not absolute; default layout when PARSING_RUNTIME_DIR is unset and cwd is core/backend:
npm run cipauto:audit-stale -- [--env prod] <userId> --plp-file runtime/parsing/cipauto/cipauto-current-plp.json
# With a disk mount at /var/data: --plp-file /var/data/cipauto/cipauto-current-plp.json (same value as CIPAUTO_CURRENT_PLP_PATH if set)

# Full audit with website verification (read-only, ~17 min for 680 listings)
npm run cipauto:audit-stale -- [--env prod] <userId>

# Close confirmed stale listings in the database
npm run cipauto:audit-stale -- <userId> --plp-file <path> --close

# Force HTTP verification for every listing, ignoring registry
npm run cipauto:audit-stale -- <userId> --verify-all

# Skip website verification (trust registry only)
npm run cipauto:audit-stale -- <userId> --skip-verify
```

The `--plp-file` flag is the recommended mode: it loads the sourceIds from the current PLP snapshot JSON (created by the latest PLP scan) and treats that list as the ground truth. Matching uses `partner_listing_external_key`, the `/vehicul/...` slug from `partner_listing_canonical_url`, and `Cod Produs` from the description (including unique slug-prefix matches like `013207` → `013207-toyota-rav-4`). Listings with no resolvable source key are listed for manual review. Any Active listing that does not match the snapshot is marked as closed — no HTTP calls to CipAuto.

On deployments where PLP artifacts are stored in S3 (same credentials as the app: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, optional `AWS_S3_BUCKET_NAME` / `AWS_REGION`), the script reads the local path first; if the file is missing on disk, it downloads the object under `parsing-plp/<same-relative-path-as---plp-file>` automatically.

Output categories:

| Category                           | Meaning                                                      |
| ---------------------------------- | ------------------------------------------------------------ |
| Active & in PLP                    | Listing exists on both Kupito and CipAuto — no action needed |
| Active & NOT in PLP (confirmed)    | Verified closed/sold on CipAuto — safe to close              |
| Active & NOT in PLP (still active) | Page is live but PLP missed it — do NOT close                |
| No source key                      | Cannot match — needs manual review                           |
| Already closed                     | Already closed in Kupito — ignored                           |

The `--close` flag performs a full listing close matching the application behavior:

- Sets `status = Closed`, `closed_at`, resets all promotion fields (`is_promoted`, `promoted_until`, `promoted_started_at`, `promoted_paused_at`)
- Ends open promotion history records for promoted listings
- Invalidates the Redis listing cache namespace (`cache:listings*`) after all closures

**When to run:** After PLP scans are established, periodically or when the listing count diverges between Kupito and CipAuto.

#### Applying the pattern to other parsers

Both scripts are CipAuto-specific but follow a reusable pattern for any partner import:

1. **Identifier extraction** — find a stable external ID in listing data (product code, external URL slug, etc.)
2. **Registry seeding** — map `externalId → kupitoListingId` before the first automated import
3. **Stale audit** — cross-reference DB listings with the latest PLP, then verify on the source website

For a new parser, create equivalent scripts under `src/scripts/tools/<parser>-import/commands/` following the same structure.

From the **platform repo root**, the same flows are exposed as `npm run 999md:*` (see root `package.json`). Full env flags and operational checklists are platform docs:

- `../../../docs/parsing/cipauto-import.md`
- `../../../docs/parsing/999md-import.md`
- `../../../docs/parsing/autooutlet-import.md`

## Migration Scripts

Database migrations are handled separately and are located in:

- `src/migrations/` - Migration files
- Local (TypeScript): `npm run migration:run` / `npm run migration:revert`
- After `npm run build` (compiled `dist/`): `npm run migration:run:prod` / `npm run migration:revert:prod`

## Notes

- All scripts use relative imports from their directory level
- Stage scripts automatically check environment before execution
- Production scripts should be reviewed before running on production
- Always backup database before running any script on production

## Database Backups

For automated database backups, see:

- **Documentation**: `../../docs/guides/DEPLOYMENT.md` (Database Backups section)
- **TypeScript script**: `src/scripts/production/backup-database.ts`
- **Bash script**: `config/scripts/backup-database.sh` (for cron)

Quick usage:

```bash
# Manual backup
npm run backup

# With custom options
npm run backup -- --output-dir /path/to/backups --keep-days 60
```
