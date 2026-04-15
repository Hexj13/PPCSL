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

1. Admin API creates a run (`plp` or `pdp`) with validated parameters.
2. Orchestrator resolves parser configuration from the catalog.
3. Runner starts parser CLI as a child process (`scan` for PLP, `import` for PDP).
4. Stdout/stderr lines are persisted to `parser_log_chunks`.
5. Final run status and summary are persisted to `parser_runs`.
6. Schedules are persisted in `parser_schedules`.

Parser artifacts (registry, current PLP snapshot, JSON reports) stay in parser-owned `data/` and `reports/` folders.

## Configuration

### Parser catalog (`config/parsers.ts`)

Each parser entry defines:

- identity (`code`, `label`, `domain`)
- capability flags (`manualRunEnabled`, `schedulerEnabled`, visibility, release stage)
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

Optional parser-specific CLI overrides:

- `ADMIN_PARSING_CLI_OVERRIDE_<PARSER_CODE>`
- legacy fallback for CipAuto: `ADMIN_PARSING_CIPAUTO_CLI`

## Adding a parser on a platform

1. Implement parser CLI in platform repository under `parsers/<parser-code>-import/`.
2. Ensure CLI supports `scan` (PLP) and `import` (PDP) command contracts used by the admin runtime.
3. Register parser in platform `config/parsers.ts`.
4. Run `npm run prepare:build` to copy platform parsers and catalog into core runtime paths.
5. Verify catalog API (`/api/admin/parsing/catalog`), manual runs, and schedule flows.

## Documentation boundaries

- Core docs describe the generic framework and contracts.
- Platform docs describe concrete parser implementations and operational checklists.

For `kupito.club` parser-specific docs, see:

- `docs/parsing/cipauto-import.md`
- `docs/parsing/999md-import.md`
- `core/docs/features/parser-import-contracts.md`
