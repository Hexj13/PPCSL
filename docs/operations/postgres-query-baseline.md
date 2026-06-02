---
title: Postgres query baseline and operations
owner: platform
tags:
  - type/runbook
  - domain/ops
  - scope/core
  - status/active
---

# Postgres query baseline and operations (Render)

Runbook after upgrading Render Postgres or when investigating slow queries, 503s, and pool timeouts.

## Phase A: connectivity and pool

1. **Internal URL** — Point `DATABASE_URL` (or `DB_HOST` / credentials) at the **internal** connection string from the Render database **Connect** panel. Same region as `kupito-backend` minimizes latency. See [Render: Create and Connect to Render Postgres](https://render.com/docs/postgresql-creating-connecting).
2. **Connection limits** — Render caps max connections by instance RAM. Ensure `instances × DB_POOL_MAX` plus pgAdmin, scripts, and other clients stays below that limit.
3. **Pool env** — Backend pool is configured in [`data-source.ts`](../../backend/src/data-source.ts) via `DB_POOL_MAX`, `DB_POOL_MIN`, `DB_POOL_IDLE_TIMEOUT`, `DB_POOL_CONNECTION_TIMEOUT`. After a DB upgrade, a small `DB_POOL_MIN` (e.g. 2–5) on a single web instance can reduce cold connection bursts if the DB limit allows it.
4. **Dashboards** — Watch Postgres metrics: active connections, CPU, RAM, disk, Top Queries. Watch Redis: errors, memory, evictions (cache misses increase load on Postgres).

### Phase A2: pool saturation checklist (prod)

1. **Capacity formula** — `backend_replicas × DB_POOL_MAX` + importers + scripts + BI tools + local sessions ≤ Postgres `max_connections` (with headroom for superuser/maintenance).
2. **Active sessions** — In Postgres (read-only): `SELECT state, count(*) FROM pg_stat_activity GROUP BY 1;` and inspect `wait_event_type` / `wait_event` for `Client` / `IO` spikes during incidents.
3. **Top Queries** — Sort by total time and call count; map to [Phase B](#phase-b-correlate-top-queries-with-code). Pay attention to listing search (`getCount` + `getMany`) and `GET /api/listings/:id` if Sentry shows `pg-pool:connect` or connection timeouts.
4. **Backend logs** — Search for `[db_connectivity]` (see [`HttpExceptionFilter`](../../backend/src/common/filters/http-exception.filter.ts)) and correlate timestamp with Postgres metrics and Redis.
5. **Caching vs load** — If Redis miss rate rises before DB saturation, treat Redis latency/evictions as a force multiplier; see [intermittent-toast-cache-checklist.md](./intermittent-toast-cache-checklist.md).

## Phase B: correlate Top Queries with code

Map slow statements to handlers:

| Symptom / pattern | Likely code path |
|-------------------|------------------|
| `Listing` search shape, high call count | [`SearchListingsUseCase`](../../backend/src/listings/application/use-cases/search-listings.use-case.ts), [`TypeOrmListingRepository.search`](../../backend/src/listings/infrastructure/persistence/typeorm-listing.repository.ts) |
| Single listing by id | [`GetListingUseCase`](../../backend/src/listings/application/use-cases/get-listing.use-case.ts), [`findById`](../../backend/src/listings/infrastructure/persistence/typeorm-listing.repository.ts) |
| `VehicleModel` full table volume | [`SitemapService.computeAllBrandsSitemaps`](../../backend/src/sitemap/sitemap.service.ts), or [`BrandsService`](../../backend/src/brands/brands.service.ts) model loaders |
| `User` lookups | Auth and [`UsersService.ensureBoardSlug`](../../backend/src/users/application/users.service.ts) |

`vehicle_models.vehicle_types` is stored as comma-separated text; brand/catalog filters use `string_to_array` + `ANY` in [`BrandsService`](../../backend/src/brands/brands.service.ts). Migration `1792000000000-AddVehicleModelsVehicleTypesGinIndex` adds partial GIN index `IDX_vehicle_models_vehicle_types_gin` for non-archived rows.

## Phase C: EXPLAIN (safe procedure)

1. Prefer **staging** or a **recent dump** restored locally. Run `EXPLAIN (ANALYZE, BUFFERS)` there first.
2. Use **production** only if unavoidable: **read-only** scenarios, **off-peak**, and **one or two** representative queries. `ANALYZE` executes the query and adds load.
3. Capture plans for:
   - Listing search: default listing page filters (no exotic filters).
   - Listing search: combined `brand_ids` + `model_ids` (uses `applyBrandModelFilter` subquery).
   - Count-only: same filters as search, without `ORDER BY` / `LIMIT` (match what [`TypeOrmListingRepository.search`](../../backend/src/listings/infrastructure/persistence/typeorm-listing.repository.ts) uses for `getCount()`).
   - `GET /api/listings/:id`: primary `findById` SQL; separately note extra calls from `ensureBoardSlug`, `recordView`, `convertToDefaultCurrency`.

## Phase D: listing detail checklist

For [`GetListingUseCase.execute`](../../backend/src/listings/application/use-cases/get-listing.use-case.ts):

- `findById` — one query with joins.
- `ensureBoardSlug` — should no-op when `board_slug` exists; may write when missing.
- `recordView` — fire-and-forget; increments Redis hash `listing:views:pending` (batched flush to `listings.views` every 5 minutes under `listing:views:flush:lock`).
- `convertToDefaultCurrency` — [`ExchangeRatesService`](../../backend/src/exchange-rates/exchange-rates.service.ts) uses Redis then DB for rates.

## Redis observability

Listing search and brands catalog use Redis ([`RedisListingCache`](../../backend/src/listings/infrastructure/cache/redis-listing-cache.ts), [`RedisBrandsCache`](../../backend/src/brands/infrastructure/cache/redis-brands-cache.ts)). If Redis is slow or failing, cache misses amplify Postgres traffic. Alert on Redis errors, high latency, and evictions.

## Success criteria (release)

- Fewer Sentry issues and 503s on `GET /api/listings/:id` where the root cause was DB pool or slow SQL.
- Top Queries: lower total time on hot `Listing` / `VehicleModel` patterns after targeted fixes.
- Stable or improved p95/p99 for listing detail and search.
- Postgres active connections within limits without recurring `connection timeout` errors from `pg-pool`.
