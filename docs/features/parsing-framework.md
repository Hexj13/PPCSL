---
title: Parsing framework
owner: platform
tags:
  - type/feature
  - domain/parsing
  - scope/core
  - status/active
---

# Parsing Framework (Core)

## Purpose

The parsing framework in `core/backend/src/parsing/` provides a generic runtime for:

- manual PLP/PDP runs from the admin UI
- optional **registry sync** runs (`run_type: sync`) from the admin UI for parsers that expose `registrySyncEnabled` in the catalog (same `seed-registry` scripts as CLI)
- **PLP file hint** (`GET .../plp-files/:fileKey/sync-hint`): suggests `assignedUserId` from recent runs for that PLP file (and 999.md login vs filename checks). Used by **manual PDP** and **new PDP schedules** in the admin UI to prefill the partner UUID, same response shape as the **Sync registry** modal. The orchestrator allows this read for catalog parsers with `adminAvailability: enabled` and `supportedRunTypes` including `pdp` (independent of `registrySyncEnabled`). **POST** `.../sync-runs` still requires `registrySyncEnabled`.
- schedule management and cron-triggered runs
- run history, live logs, and reports metadata
- parser rollout control through a catalog

The framework is parser-agnostic. Parser implementations are platform-specific.

## Architecture

- **Core runtime**: `core/backend/src/parsing/`
  - controller (`admin-parsing.controller.ts`)
  - orchestration (`parsing-orchestrator.service.ts`)
  - schedules (`parsing-schedule.service.ts`, `parsing-schedule-cron.service.ts`)
  - availability checks (`parsing-availability.service.ts`)
  - CLI process runner (`cli-parser-runner.service.ts`)
- **Catalog source**: `config/parsers.ts` in the platform root
  - copied to `core/backend/src/common/config/parsers.ts` by `npm run prepare:build`
- **Shared import utilities**: `core/backend/src/scripts/tools/partner-import-shared/`

## Runtime model

1. Admin API or the scheduler creates a run (`plp`, `pdp`, or manual `sync`) with validated parameters. The run is stored with status `queued` if it cannot start immediately. (`sync` is only created from the admin API today, not from schedules.)
2. Orchestrator resolves parser configuration from the catalog.
3. **Per-bucket FIFO queue:** Runs are serialized independently for each `(parser_code, run_type, target_env)` bucket. At most one run per bucket is `in_progress` or `cancel_requested` (child process still running). Additional manual or scheduled runs stay in `queued` until the slot frees; the next run starts in `created_at` order (then `id` as a tie-breaker). Cancelling a `queued` run that never started releases the head-of-queue expectation for that bucket and may allow the next `queued` run to start. After a process server restart, stale `in_progress` / `cancel_requested` rows for the current target env are marked `failed`; `queued` rows are preserved and the queue is kicked so waiting work can resume.
4. Runner starts the appropriate child process when a run claims the slot (`queued` → `in_progress` via an atomic update): parser CLI `scan` for PLP, `import` for PDP, or the standalone `seed-registry` script for `sync`.
5. Stdout/stderr lines are persisted to `parser_log_chunks`.
6. Final run status and summary are persisted to `parser_runs`.
7. Schedules are persisted in `parser_schedules`.

PDP runs may set `config_snapshot.checkUserDuplicatesBeforeCreate` (admin **Parsing** manual PDP modal, PDP **schedules**, or CLI `--check-user-duplicates-before-create`). When true, the import CLI opens the same PostgreSQL connection as `seed-registry` and, before each `createListing`, applies parser-specific duplicate rules for the assigned partner user; matches skip create, set registry state `duplicate_skipped`, and appear in the JSON report (`summary.duplicateSkipped`, `duplicateSkippedItems`). When false, behavior is unchanged.

PDP runs may also set `config_snapshot.autoCreateBrands` / `autoCreateModels` (admin **Parsing** manual PDP modal, PDP **schedules**, or CLI `--auto-create-brands` / `--auto-create-models`). When true, `BrandModelResolver` calls the admin API (`POST /api/admin/brands`, `POST /api/admin/vehicle-models`) to create the missing brand or model and continues importing the listing in the same run; HTTP 409 is treated as a race and resolved by re-fetching once. The import account must have admin rights. The orchestrator and CLI accept the legacy combined flag `autoCreateBrandsModels` for backward compatibility with old run snapshots.

The `scheduled` value exists on the `ParserRunStatus` union for forward compatibility but is not written by the current orchestrator; runs created from cron use `trigger_mode: 'scheduled'` with status `queued` until execution.

Parser artifacts on disk live under `PARSING_RUNTIME_DIR` (default `<backend cwd>/runtime/parsing/<parser>/`: registry JSON, PLP paths from the catalog, `reports/`). The backend and import CLIs use the same root resolver (`src/common/parsing-runtime-path.ts`). PLP files are written and read primarily on disk; when AWS S3 credentials are configured, objects are mirrored under the `parsing-plp/` prefix for backup and cross-host reads.

## Schedules

- Stored on `parser_schedules` with a persisted `cron_expression`, optional `frequency_preset`, and `timezone` (default `Europe/Chisinau`).
- **Frequency presets** (mapped to cron in `parsing-schedule-presets.ts`): `every_n_hours` (bounded interval), `every_n_days` (interval 1–30 days plus run time), `daily`, `weekly`, `custom` (admin-supplied cron).
- **Resource availability:** `ParsingAvailabilityService` issues a single HTTP `GET` against the parser `availabilityProbe.sourceUrl` (or `sourceUrlEnvVar` override; direct fetch first). For CipAuto, if the direct response is blocked by Cloudflare, the probe retries via FlareSolverr when `CIPAUTO_FLARESOLVERR_URL` is set. PLP and PDP schedules use the same site-level check. Results (`available` / `unavailable`) and a short summary are stored on the schedule and refreshed in the background after create/update and **Run now** (the HTTP response does not wait for the probe), and periodically for active schedules (batch job). Legacy `partial` values may remain until the next refresh.
- **Admin PLP files list:** `GET /api/admin/parsing/plp-files` loads snapshot files in parallel and prefers counts from snapshot `meta` (including `errorItemsCount` when present).

## Configuration

### Parser catalog (`config/parsers.ts`)

Each parser entry defines:

- identity (`code`, `label`, `domain`)
- capability flags (`manualRunEnabled`, `schedulerEnabled`, visibility, release stage)
- optional `registrySyncEnabled` — when true, admin **Parsing → PLP files** offers **Sync registry** for that parser (uses the platform’s `seed-registry` implementation). The sync-hint **GET** above is available whenever PDP is supported in the catalog, not only when this flag is set.
- CLI entrypoint (`cliScript`)
- PLP snapshot path (`plpDataPath`, optional)
- source availability probe (`availabilityProbe`, optional)

### Runtime env (`ADMIN_PARSING_*`)

Important variables:

- `ADMIN_PARSING_TARGET_ENV`
- `ADMIN_PARSING_KUPITO_API_URL`
- `ADMIN_PARSING_ADMIN_EMAIL`
- `ADMIN_PARSING_ADMIN_PASSWORD`
- `ADMIN_PARSING_IMPORT_SECRET`
- `ADMIN_PARSING_SCHEDULER_ENABLED`
- `ADMIN_PARSING_CANCEL_GRACE_MS`
- `PARSING_RUNTIME_DIR` (and optional `CIPAUTO_*` / `AUTOOUTLET_*` / `SITE999MD_*` path overrides) — same semantics as partner import CLIs; forwarded into parser child processes when set
- `CIPAUTO_FLARESOLVERR_URL` / `CIPAUTO_FLARESOLVERR_TIMEOUT_MS` — optional FlareSolverr base URL and timeout for CipAuto HTML fetches (see platform `docs/parsing/cipauto-import.md`). Inherited by spawned CLI children via `process.env`.

Optional parser-specific CLI overrides:

- `ADMIN_PARSING_CLI_OVERRIDE_<PARSER_CODE>`
- legacy fallback for CipAuto: `ADMIN_PARSING_CIPAUTO_CLI`

## Adding a parser on a platform

1. Implement parser CLI in core under `core/backend/src/scripts/tools/<parser-code>-import/`.
2. Ensure CLI supports `scan` (PLP) and `import` (PDP) command contracts used by the admin runtime.
3. Register parser in platform `config/parsers.ts`.
4. Run `npm run prepare:build` to copy the platform catalog into core frontend/backend config.
5. Verify catalog API (`/api/admin/parsing/catalog`), manual runs, and schedule flows.

## Documentation boundaries

- Core docs describe the generic framework and contracts.
- Platform docs describe concrete parser implementations and operational checklists.

For `kupito.club` parser-specific docs, see:

- `docs/parsing/cipauto-import.md`
- `docs/parsing/999md-import.md`
- `docs/parsing/autooutlet-import.md`
- `core/docs/features/parser-import-contracts.md`
