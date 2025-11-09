# Scripts Organization

Scripts are organized into two directories based on their intended environment:

## Directory Structure

- **`stage/`** - Scripts for staging, development, and testing environments
- **`production/`** - Scripts safe to run in production environment

## Stage Scripts

These scripts are **blocked from running in production** and can only be executed in:
- `stage`
- `development`
- `test`

### Available Stage Scripts

- `seed.ts` - Seed test data (brands, models, users, listings)
- `seed-vin-test.ts` - Seed test data with VIN codes
- `seed-vehicles-full.ts` - Full vehicle seeding
- `clear-database.ts` - Clear all database data
- `reset-users.ts` - Reset user data
- `make-admin.ts` - Create admin user
- `add-brands.ts` - Add basic brands and models
- `add-grand-models.ts` - Add Grand versions and extended models
- `add-historical-models.ts` - Add historical models
- `add-models-to-brand.ts` - Add models to existing brand
- `delete-all-brands.ts` - Delete all brands
- `check-brands-count.ts` - Check brand count
- `check-brands-dates.ts` - Check brand creation dates (not available via npm script, internal utility)
- `check-models-stats.ts` - Models statistics
- `cleanup-brands.ts` - Cleanup and synchronize brands
- `sync-carquery.ts` - Synchronize from CarQuery API
- `update-engine-volumes.ts` - Update engine volumes
- `clear-cache.ts` - Clear all Redis cache
- `clear-listing-cache.ts` - Clear listings cache (with optional listing ID)
- `clear-brands-cache.ts` - Clear brands and models cache

## Production Scripts

These scripts can be run in production, but should still be used with caution:

- `update-listing-titles.ts` - Update listing titles based on vehicle data
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

### Running Production Scripts

```bash
# On any environment (including production)
npm run update-titles
npm run backup
```

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
- **Documentation**: `docs/DATABASE_BACKUPS.md`
- **TypeScript script**: `src/scripts/production/backup-database.ts`
- **Bash script**: `scripts/backup-database.sh` (for cron)

Quick usage:
```bash
# Manual backup
npm run backup

# With custom options
npm run backup -- --output-dir /path/to/backups --keep-days 60
```

