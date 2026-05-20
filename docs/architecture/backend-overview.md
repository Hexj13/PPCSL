---
title: Backend overview
owner: platform
tags:
  - type/architecture
  - domain/architecture
  - scope/core
  - status/active
---

# Backend overview

High-level description of the NestJS backend in `core/backend/`: deployment model, stack, modules, and architectural choices. For layer conventions and DDD structure, see [backend-layers.md](./backend-layers.md). For API endpoints and env vars, see [TECHNICAL.md](./TECHNICAL.md).

## Deployment model: monolith

The backend is a **single deployable NestJS application** (monolith):

- One process: `node dist/main` (`npm run start:prod`)
- One entry: `src/main.ts` → `AppModule`
- One PostgreSQL database (TypeORM, shared schema)
- Feature areas are **NestJS modules**, not separate microservices

```
┌─────────────────────────────────────────┐
│           NestJS AppModule              │
│  Auth │ Listings │ Brands │ Upload │ …  │
├─────────────────────────────────────────┤
│  PostgreSQL          │  Redis (cache)    │
│  S3 (prod uploads)  │  Twilio / Email   │
└─────────────────────────────────────────┘
```

## Layered architecture (partial adoption)

The target design is **four layers + ports** (Presentation → Application → Domain; Infrastructure implements ports). See [backend-layers.md](./backend-layers.md).

| Adoption | Modules | Pattern |
| -------- | ------- | ------- |
| Full layers + use cases | `listings/`, `auth/` | `presentation/`, `application/use-cases/`, `domain/`, `infrastructure/` |
| Hybrid | `users/`, `brands/` | Mix of presentation + service; some ports/cache |
| Classic NestJS | `favorites/`, `saved-filters/`, `board/`, `comparison/`, `exchange-rates/`, `sitemap/`, `telegram/`, `notifications/`, `diagnostics/` | Controller → service → TypeORM entity |

New code in core domains should follow the layered layout; older modules are migrated gradually. Expect **mixed patterns** when reading the codebase.

## Stack

| Area | Technology |
| ---- | ---------- |
| Framework | NestJS 11, Express |
| API | REST (`@Controller`); Swagger at `/api/docs` in non-production |
| Database | PostgreSQL 15, **TypeORM** (not Prisma) |
| Migrations | `src/migrations/*.ts`, `npm run migration:run` |
| Cache | Redis (`common/redis.service.ts`) |
| Search | PostgreSQL queries + FTS (see [TECHNICAL.md](./TECHNICAL.md)) |
| Auth | JWT + Passport, refresh tokens (cookie), Google OAuth, SMS (Twilio) |
| Files | Local `/uploads/` in dev; **AWS S3** + optional CloudFront in production; `sharp`, blurhash |
| Video | AWS MediaConvert + webhooks (`listings/video/`) |
| i18n | `common/i18n/` — `ro`, `ru`, `en` JSON copied from platform `locales/backend/` via `prepare:build` |
| Observability | Sentry (`SentryInterceptor`, global filter) |
| Security | `helmet`, CORS, global `ValidationPipe`, `@nestjs/throttler` |

## Not used

These are intentionally absent from the backend design:

| Capability | Status |
| ---------- | ------ |
| GraphQL | Not used |
| WebSockets | Not used in application code |
| Message queue (Bull, BullMQ, etc.) | Not used |
| Runtime multi-tenancy (`tenant_id`) | Not used — one schema per deployment |

## NestJS modules (`AppModule`)

Registered in `src/app.module.ts`:

| Module | Responsibility |
| ------ | -------------- |
| `CommonModule` | Redis, I18n, shared guards/utils |
| `AuthModule` | Registration, login, JWT, SMS/email verification |
| `UsersModule` | Profile, limits, board slug |
| `ListingsModule` | Ads, vehicles, search, promotion, views, AI report |
| `BrandsModule` | Brands and vehicle models (catalog) |
| `CitiesModule` | Geography reference data |
| `FavoritesModule` | Saved listings |
| `SavedFiltersModule` | Saved search filters |
| `ComparisonModule` | Vehicle/tire comparison lists |
| `BoardModule` | Public seller board by slug |
| `TiresModule` | Tire catalog and tire listings |
| `UploadModule` | Image upload, processing, S3 |
| `ExchangeRatesModule` | FX rates (cron) |
| `AdminModule` | Admin APIs, audit log |
| `ParsingModule` | Partner parser orchestration (admin, schedules, CLI runner) |
| `SitemapModule` | XML sitemaps (Redis cache) |
| `TelegramModule` | Support bot webhook |
| `NotificationsModule` | User notifications |
| `DiagnosticsModule` | Diagnostics endpoints |

Global providers: `HttpExceptionFilter`, `SentryInterceptor`, `ClassSerializerInterceptor`, `CipautoImportThrottlerGuard`.

## Bounded contexts

Logical domains (see also [backend-layers.md](./backend-layers.md)):

| Context | Main aggregates / data |
| ------- | ---------------------- |
| Listings | `Listing` → `Vehicle` |
| Auth | Coordinates `User`; JWT, refresh tokens |
| Users | `User` profile and limits |
| Catalog | `Brand` → `VehicleModel`; tires: `TireBrand` → `TireModel` |
| Favorites | `Favorite` |
| SavedFilters | `SavedFilter` |
| Comparison | `ComparisonItem` |
| Upload | Files on disk / S3 |
| Parsing | `ParserRun`, CLI partner imports |

Modules should own their entities; avoid registering another context’s entities in a module (see `.cursor/rules/backend-architecture.mdc`).

## Background work and events

There is **no** Redis/job queue library. Background behavior uses:

| Mechanism | Examples |
| --------- | -------- |
| `@nestjs/schedule` (`@Cron`) | Auto-close old listings, exchange rates, refresh-token cleanup, IP block, parsing schedules, video reconcile |
| `EventEmitterModule` | In-process events (e.g. user account deleted → close listings) |
| CLI scripts | `src/scripts/stage/`, `src/scripts/production/`, `src/scripts/tools/` (partner imports, seed, cache clear) |

Partner parsers: CLI tools under `scripts/tools/` (`cipauto-import`, `999md-import`, `autooutlet-import`, `partner-import-shared`); runtime orchestration in `ParsingModule`. Platform parser catalog: root `config/parsers.ts` → copied by `prepare:build`. See [scripts-architecture.md](./scripts-architecture.md).

## Multi-platform vs multi-tenant

| Model | How it works |
| ----- | ------------ |
| **Multi-platform build** | One core codebase; each deployment sets `COUNTRY` / `NEXT_PUBLIC_COUNTRY` (e.g. `md` for Moldova). Platform-specific cities, phone prefix, and copy live in `scripts/platforms/{country}/config.ts`. |
| **Multi-tenant SaaS** | **Not** used — no per-tenant row isolation in a shared DB. |

Frontend/backend UI strings: platform root `locales/` and `locales/backend/`. See [multi-repository.md](./multi-repository.md).

## Redis usage

| Prefix / area | Purpose |
| ------------- | ------- |
| `brands:*`, `brands:models:*` | Brand/model lists |
| `listings:search:*` | Search result cache |
| SMS / auth | Verification codes, rate limits |
| `sitemap:v3:*` | Sitemap XML cache |
| Listing AI report | Generation locks and hourly quotas (production) |
| Telegram | Per-user message rate limit |

Clear caches after catalog mutations: `npm run clear-cache:brands` (see platform rules and [SCRIPTS.md](../../backend/docs/SCRIPTS.md)).

## Authentication (summary)

- Access token: JWT (short-lived)
- Refresh token: HTTP-only cookie, rotated on refresh, stored in DB
- Strategies: `JwtStrategy`, `LocalStrategy`; guards: `JwtAuthGuard`, `OptionalJwtAuthGuard`, `AdminGuard`, `PhoneVerifiedGuard`, `IpBlockGuard`, `CronSecretGuard`
- Google Sign-In, SMS verification, email (MJML templates in `common/email/`)
- Global throttling: 600 req/min per IP in production (configurable per route on auth)

Detail: [TECHNICAL.md](./TECHNICAL.md) § API Reference → Authentication.

## Testing

| Type | Location | Command |
| ---- | -------- | ------- |
| Unit | `**/*.spec.ts` under `src/` | `npm test` |
| Integration | `src/test/*.integration.ts` | `npm run test:integration` (Jest + Supertest + jest-openapi) |

See [backend/docs/TESTING.md](../../backend/docs/TESTING.md) and [TECHNICAL.md](./TECHNICAL.md) §8 Testing.

## Related documentation

- [backend-layers.md](./backend-layers.md) — layers, use cases, ports, module folder layout
- [multi-repository.md](./multi-repository.md) — core vs platform repo, `prepare:build`
- [scripts-architecture.md](./scripts-architecture.md) — `COUNTRY`, platform configs, CLI scripts
- [TECHNICAL.md](./TECHNICAL.md) — env vars, API reference, database, CI
- [backend/docs/SCRIPTS.md](../../backend/docs/SCRIPTS.md) — npm script catalog
- [features/parsing-framework.md](../features/parsing-framework.md) — parsing runtime

**Last updated:** 2026-05
