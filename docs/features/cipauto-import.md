# CipAuto Partner Listings Import Tool

## Purpose

`cipauto-import` migrates vehicle listings from `cipauto.md` into Kupito through the standard backend API. Kupito admin credentials and API URL are shared with other partner CLI tools via `KUPITO_IMPORT_*` (see [999md-import.md](./999md-import.md) for the same pattern on 999.md).

The tool is designed for safe production use:

- idempotent (`sourceListingId` in registry)
- restartable (`--resume`)
- selective (`--only-failed`, `--source-id`, `--limit`)
- observable (structured logs + JSON reports)
- sequential (no concurrency) to avoid high load and IP/rate-limit issues

## Location

`core/backend/src/scripts/tools/cipauto-import/`

Runtime files:

- Registry: `core/backend/src/scripts/tools/cipauto-import/data/cipauto-registry.json`
- Reports: `core/backend/src/scripts/tools/cipauto-import/reports/cipauto-run-*.json`

## Architecture

- `../partner-import-shared/` — shared HTTP helpers, Kupito API/auth/upload clients, enum/color/equipment/field mappers, listing payload and import-workflow types (`ImportReport`, `ImportCommandOptions`, …), JSON registry store (`JsonRegistryStore`), import report builder (`buildImportReport`), env helpers (also used by `999md-import`)
- `cli.ts` command entrypoint
- `parsers/` PLP/PDP HTML and JSON-LD extraction
- `storage/` registry persistence + report generation

## Commands

All commands are executed from `core/backend`:

```bash
npm run cipauto:scan -- --pages=24 --env=prod
npm run cipauto:import -- --userId=<UUID> --status=paused --env=prod --limit=10
npm run cipauto:report -- --last --env=prod
```

### `cipauto:scan` flags

- `--pages` required total pages
- `--page-from` start page
- `--page-to` end page
- `--resume` skip already discovered
- `--dry-run` no registry writes
- `--env=local|prod`
- `--delay=<ms>` delay between page requests

### `cipauto:import` flags

- `--userId` required owner user UUID
- `--status=active|paused` default `paused`
- `--env=local|prod`
- `--limit=<n>`
- `--resume`
- `--dry-run`
- `--only-failed`
- `--update-existing`
- `--source-id=<sourceListingId>`
- `--registration-type=Local|Foreign|Cleared` default `Cleared`
- `--default-hp=<number>` default `150`
- `--city=<name>` default `Chișinău`
- `--delay=<ms>` default `3000`

### `cipauto:report` flags

- `--last` read the latest report
- `--env=local|prod`
- `--file=<path>` read a specific report file

## Required environment variables (Kupito API)

Primary (shared with other partner importers such as `999md-import`):

- `KUPITO_IMPORT_ADMIN_EMAIL`
- `KUPITO_IMPORT_ADMIN_PASSWORD`

Legacy aliases (still supported): `CIPAUTO_ADMIN_EMAIL`, `CIPAUTO_ADMIN_PASSWORD`.

Optional (Kupito):

- `KUPITO_IMPORT_API_URL` — override Kupito API base URL (legacy: `CIPAUTO_API_URL`)
- `KUPITO_IMPORT_SECRET` — import secret header when enforced on **prod** (legacy: `CIPAUTO_IMPORT_SECRET`)
- `KUPITO_IMPORT_DEBUG=1` — verbose logs (legacy: `CIPAUTO_DEBUG=1`)

CipAuto source only:

- `CIPAUTO_BASE_URL` source catalog base URL (default `https://cipauto.md`)
- `CIPAUTO_REQUEST_TIMEOUT_MS` request timeout
- `CIPAUTO_MAX_RETRIES` retry count
- `CIPAUTO_DEFAULT_DELAY_MS` delay between listing/page requests
- `CIPAUTO_IMAGE_DELAY_MS` delay between image operations

## Data and idempotency

Registry item key: `sourceListingId`.

State lifecycle:

- `discovered`
- `pdp_parsed`
- `created`
- `updated`
- `failed`
- `skipped`
- `manual_review`

The registry is persisted with atomic write (`.tmp` + rename) after every state change.

## Image processing requirements

Images are never transformed by the import script itself.

For every source image:

1. download from CipAuto
2. upload to `POST /api/upload/image`
3. receive processed URL
4. append URL to listing images array

This guarantees the same pipeline as normal website uploads:

- validation
- EXIF orientation fix
- resize
- watermark
- WebP conversion
- storage (S3/local backend upload path)

Image order is preserved exactly as in CipAuto gallery data.

## Sequential execution model

The tool is intentionally sequential:

- one PLP page at a time
- one PDP listing at a time
- one image at a time
- one listing API mutation at a time

This minimizes CPU/network load and reduces risk of partner-side blocks.

## Mapping notes

- `draft` is not a valid backend status, use `paused` or `active`
- `condition` defaults to `Undamaged`
- `registration_type` defaults to `Cleared` unless provided by CLI
- horsepower is extracted from text if possible, otherwise estimated/fallback
- body/fuel/transmission/color values are normalized via mapping tables
- unresolved brand/model values are moved to `manual_review`

## Troubleshooting

- `401` errors: verify admin credentials and admin role
- `Brand not found` / `Model not found`: update platform brand/model data first
- `Less than 2 images uploaded`: listing goes to `manual_review`
- source site timeouts/rate limits: increase `--delay`
- interrupted run: rerun with `--resume`

## Safe rollout checklist

1. Run scan on 1-2 pages in dry-run
2. Run import dry-run with `--limit=5`
3. Run real import with `--limit=10 --status=paused`
4. Verify created listings in admin
5. Run larger batches incrementally
