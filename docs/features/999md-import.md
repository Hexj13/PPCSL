# 999.md Partner Listings Import Tool

## Purpose

`999md-import` migrates vehicle listings from public [999.md](https://999.md/) GraphQL (`https://999.md/graphql`) into Kupito using the same downstream pipeline as `cipauto-import` (`ParsedPlpItem` / `ParsedPdpData`, `buildCreateListingPayload`, upload client, admin API). **Kupito admin credentials and API URL** use the same `KUPITO_IMPORT_*` variables as `cipauto-import` (with legacy `CIPAUTO_*` fallbacks); see [cipauto-import.md](./cipauto-import.md#required-environment-variables-kupito-api).

The tool is sequential (no concurrency), restartable, and uses a **separate registry** from CipAuto so `sourceListingId` lifecycles do not overlap.

## Location

`core/backend/src/scripts/tools/999md-import/`

Runtime files (generated locally; paths under `data/` and `reports/` are gitignored in `core/.gitignore` like `cipauto-import`):

- Registry: `core/backend/src/scripts/tools/999md-import/data/999md-registry.json`
- Reports: `core/backend/src/scripts/tools/999md-import/reports/999md-run-*.json`

## Architecture

- `cli.ts` — Commander entrypoint (`scan`, `import`, `report`)
- `graphql-client.ts` — POST JSON to 999.md GraphQL with error handling
- `parsers/plp-parser.ts` — `profileAds` with pagination (`skip` / `limit`)
- `parsers/advert-batch.ts` — batched `advert` queries with aliases (`VIEW_ONE_DESKTOP` groups)
- `parsers/pdp-normalizer.ts` — GraphQL `Advert` → `ParsedPdpData` (doors: feature id `851` / «Număr uși», `FEATURE_OPTIONS`; VIN: id `2512` / «VIN-cod`, `FEATURE_TEXT` — validated to 17 characters per `CreateListingDto`, no I/O/Q; **Stare** id `593` → Kupito `condition`: `Damaged` = Avariată / Necesită reparații / Nu funcționează; `ForParts` = La dezmembrare / Pentru piese; `Undamaged` = all other known option ids from 999’s `feature(593)` list — unknown ids → warning `STARE_UNKNOWN:<id>`, default `Undamaged` in payload)
- **Price** — `FEATURE_PRICE` with `UNIT_EUR` / `EUR` or `UNIT_MDL` / `MDL` is accepted (numeric value stored with that currency). Unsupported units (e.g. `UNIT_USD`) → no `price`, warning `PRICE_UNSUPPORTED_CURRENCY:<unit>` or `PRICE_CURRENCY_UNKNOWN` (import then stops with missing price / manual review)
- `mapping/999md-stare-to-condition.ts` — 999 Stare option id → `ConditionType`
- `mapping/subcategory-vehicle-type.ts` — `subCategory` → `car` | `truck` | `moto` (or skip / unmapped)
- `mapping/999md-color-mapper.ts` / `999md-equipment-mapper.ts` — labels → CipAuto-compatible raw values / equipment option slugs (`EQUIPMENT_SLUG_MAP` keys in `cipauto-import/mapping/equipment-mapper.ts`, not Kupito internal keys)
- `storage/` — registry + reports (999md-prefixed report filenames)
- Reuses `cipauto-import` — `AuthClient`, `KupitoApiClient`, `UploadClient`, `BrandModelResolver`, enum/color/equipment/field mappers (`mapTransmission` includes 999 «Cutia de viteze» labels: Mecanică, Automată, Automat-Tiptronic, Semiautomată, Variator, Robotizată; `map999mdColorToCipautoRaw` + `mapColor` cover all `feature(17)` option titles from 999, including Altă → `other`, Bronz, Burgundia, Crom, Fildeș, Ivory, Satin, Șampanie)

## Commands

From the **platform repository root** (same pattern as other platform scripts):

```bash
npm run 999md:scan -- --login=AGMOTORS --env=local --page-size=50
npm run 999md:import -- --userId=<UUID> --status=paused --env=local --limit=5
npm run 999md:report -- --last --env=local
```

Or from `core/backend` directly:

```bash
cd core/backend
npm run 999md:scan -- --login=AGMOTORS --env=local --page-size=50
```

### `999md:scan` flags

- `--login` **required** — profile login on 999.md (e.g. seller slug in `/ro/profile/<login>`)
- `--page-size=<n>` pagination `limit` (default `50`)
- `--max-items=<n>` optional cap on total ads collected
- `--resume` accepted for CLI parity; duplicates are always skipped if already present in the registry
- `--dry-run` — no registry writes
- `--env=local|prod` — selects default Kupito API host (see env table)
- `--delay=<ms>` — delay between **profileAds** pages (default `3000`)

### `999md:import` flags

Same semantics as `cipauto:import`:

- `--userId` (required), `--status`, `--env`, `--limit`, `--resume`, `--dry-run`, `--only-failed`, `--update-existing`, `--source-id`, `--registration-type`, `--default-hp`, `--city`, `--delay`

Brand/model resolution uses **`BrandModelResolver` with `vehicleType`** derived from 999 `subCategory` (`car` / `truck` / `moto`). Non-vehicle transport categories (e.g. bicycles) are marked `skipped`. Unknown transport subcategories → `manual_review` with `UNMAPPED_SUBCATEGORY` in the reason.

### `999md:report` flags

- `--last` — latest `999md-run-*.json` in the tool `reports/` directory
- `--file=<path>` — specific report
- `--env=local|prod` — resolves default reports path via config (same folder in practice)

## Environment variables

### Kupito (shared with `cipauto-import`)

| Variable                       | Purpose                                        | Required                                |
| ------------------------------ | ---------------------------------------------- | --------------------------------------- |
| `KUPITO_IMPORT_ADMIN_EMAIL`    | Admin login email                              | Yes for real import                     |
| `KUPITO_IMPORT_ADMIN_PASSWORD` | Admin password                                 | Yes for real import                     |
| `KUPITO_IMPORT_SECRET`         | Import secret header when enforced on **prod** | Yes for **prod** import when configured |
| `KUPITO_IMPORT_API_URL`        | Override Kupito API base URL                   | No                                      |
| `KUPITO_IMPORT_DEBUG=1`        | Verbose logs                                   | No                                      |

Legacy (still supported): `CIPAUTO_ADMIN_EMAIL`, `CIPAUTO_ADMIN_PASSWORD`, `CIPAUTO_IMPORT_SECRET`, `CIPAUTO_API_URL`, `CIPAUTO_DEBUG=1`.

Defaults: `http://localhost:4000` (local), `https://api.kupito.club` (prod).

### 999.md source

| Variable                         | Purpose                                                                 | Default                                                 |
| -------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------- |
| `SITE999MD_GRAPHQL_URL`          | GraphQL endpoint                                                        | `https://999.md/graphql`                                |
| `SITE999MD_LISTING_URL_TEMPLATE` | Listing URL template; `{{id}}` = numeric id                             | `https://999.md/ro/{{id}}`                              |
| `SITE999MD_IMAGE_BASE_URL`       | Prefix for `FEATURE_IMAGES` filenames                                   | `https://i.simpalsmedia.com/999.md/BoardImages/900x900` |
| `SITE999MD_REQUEST_TIMEOUT_MS`   | HTTP timeout                                                            | `20000`                                                 |
| `SITE999MD_MAX_RETRIES`          | Retries for HTTP                                                        | `3`                                                     |
| `SITE999MD_DEFAULT_DELAY_MS`     | Delay between **advert** batches and shared default delay               | `3000`                                                  |
| `SITE999MD_IMAGE_DELAY_MS`       | Delay between image uploads                                             | `1000`                                                  |
| `SITE999MD_ADVERT_BATCH_SIZE`    | `advert` operations per GraphQL request                                 | `5`                                                     |
| `SITE999MD_DEBUG=1`              | Verbose logs (also `KUPITO_IMPORT_DEBUG=1` or legacy `CIPAUTO_DEBUG=1`) | off                                                     |

## Operational checklist (prod)

1. Confirm `KUPITO_IMPORT_API_URL` (or legacy `CIPAUTO_API_URL`) and `--env=prod` match the intended environment.
2. Run `999md:import` with `--dry-run` and `--limit` first.
3. Respect 999.md terms of use and rate limits; keep delays conservative on shared IPs.

## Registry states

Same lifecycle as CipAuto: `discovered` → `pdp_parsed` → `created` | `updated` | `skipped` | `failed` | `manual_review`.

## Tests

Unit tests (fixtures only, no network):

- `parsers/pdp-normalizer.spec.ts`
- `mapping/subcategory-vehicle-type.spec.ts`
- `mapping/999md-equipment-mapper.spec.ts`
- `../partner-import-shared/kupito-env.spec.ts` (Kupito env variable precedence)

```bash
cd core/backend && npx jest src/scripts/tools/999md-import --no-cache
```
