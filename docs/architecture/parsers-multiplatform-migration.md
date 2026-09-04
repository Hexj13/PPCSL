# Parsers: Multi-Platform Migration Path

## Status

Planned / deferred. Current state: parsers live in core under `backend/src/scripts/tools/<partner>-import/` and are shared by all platforms. Today only the Moldova platform (`kupito.club`) consumes them, so no per-country split exists.

## Current layout (single platform)

```
core/backend/src/
├── scripts/tools/
│   ├── cipauto-import/       # Moldova partner parser
│   ├── 999md-import/          # Moldova partner parser
│   └── partner-import-shared/ # Shared parser helpers
├── common/config/parsers.ts   # parsersConfig array (copy of platform root/config/parsers.ts)
└── parsing/                   # Runtime parsing module (orchestrator, CLI runner, catalog)
```

Platform root (`kupito.club`) supplies `config/parsers.ts` as the source-of-truth catalog entry list, copied into both `core/frontend/lib/config/parsers.ts` and `core/backend/src/common/config/parsers.ts` by `prepare:build`.

## Trigger to migrate

Start this migration when ANY of the following happens:

- A second country platform is onboarded (e.g. Romania, Ukraine) using the same core.
- A single partner parser must behave differently per country (different selectors, currency, city normalization).
- Two platforms need disjoint parser sets that cannot be toggled by `adminAvailability`.

Until at least one of these is true, stay on the current shared layout. Premature split adds friction without benefit.

## Target layout (multi-platform)

```
core/backend/src/scripts/
├── platforms/
│   ├── md/
│   │   ├── parsers/
│   │   │   ├── cipauto-import/
│   │   │   └── 999md-import/
│   │   └── config.ts
│   └── ro/
│       ├── parsers/
│       │   └── autovit-import/
│       └── config.ts
└── tools/
    └── partner-import-shared/   # Remains shared, partner-agnostic helpers
```

The active platform is selected by the `COUNTRY` env var (matches existing `script-guard.ts` pattern).

## Migration steps (when triggered)

1. Move each partner parser from `scripts/tools/<partner>-import/` to `scripts/platforms/<country>/parsers/<partner>-import/`. Keep imports of `partner-import-shared/` (it remains in `scripts/tools/`).
2. Extend `parsersConfig` with a `country` field (`'md' | 'ro' | ...`). Filter entries via the current `COUNTRY` env in `parser-catalog.ts`.
3. Move the platform-specific parser list from root `config/parsers.ts` into `core/backend/src/scripts/platforms/<country>/config.ts`, exposed through a helper `getPlatformParsers()`.
4. Update `cliScript` paths in `parsersConfig` to point at the new `platforms/<country>/parsers/.../cli.ts`.
5. Update `CliParserRunnerService.resolveCliEntrypoint()` only if the relative path layout changes (it already resolves `dist/` vs `src/` generically).
6. Update `nest-cli.json` / `tsconfig.json` `include` globs if tests or scripts live under new paths.
7. Update `prepare:build` in the platform root to stop copying `config/parsers.ts` into backend (backend config becomes core-owned per platform).
8. Update docs: `architecture.mdc`, `README`, `deployment.md`.
9. Run `npm run release-check` and deploy to each platform separately to confirm parsers load only the intended set.

## What stays unchanged

- `parsing/` module (orchestrator, runner, catalog). The domain is already platform-agnostic; it consumes `parsersConfig` which is just reshuffled.
- `partner-import-shared/` stays in `scripts/tools/`. It is partner- and country-agnostic.
- `CliParserRunnerService.spawnCli` (dist-first strategy with `ts-node` fallback) stays as-is.

## Risks to watch

- Split of `parsersConfig` must remain a pure list (no circular imports into `parsing/`).
- Each country must own its runtime data directory under `backend/runtime/parsing/<country>/` to avoid cross-platform mixing (today the single platform uses `backend/runtime/parsing/`).
- Scheduler and admin visibility flags (`isVisibleInAdmin`, `adminAvailability`) must filter by `COUNTRY` before reaching the admin UI.
