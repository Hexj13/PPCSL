---
title: Technical documentation
owner: platform
tags:
  - type/reference
  - domain/architecture
  - scope/core
  - status/active
---

# PPCSL technical documentation

Complete technical documentation for the PPCSL platform.

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Development Setup](#2-development-setup)
3. [Environment Variables](#3-environment-variables)
4. [Architecture](#4-architecture)
5. [API Reference](#5-api-reference)
6. [Database](#6-database)
7. [Security](#7-security)
8. [Testing](#8-testing)
9. [Scripts](#9-scripts)
10. [SEO & Analytics](#10-seo--analytics)
11. [Performance Optimizations](#11-performance-optimizations)
12. [Project Restart](#12-project-restart)
13. [CI/CD Configuration](#13-cicd-configuration)
14. [Paid Promotion Feature](#14-paid-promotion-feature)

---

## 1. Project Overview

### Purpose

Core application framework for creating car marketplace platforms for different countries. Users can independently add, edit, pause, and close their listings.

### Core Principles

- Fully free service, no payments, subscriptions, or paid options
- Two user types: **Individual** and **Business**
- Individual users: maximum **100 active listings** simultaneously
- Business users: maximum **1000 active listings** simultaneously
- Listings have three statuses: **Active**, **Paused**, **Closed**
- Automatic closing after **90 days** since `last_updated_at` timestamp
  - Non-promoted listings older than 90 days are closed automatically
  - Promoted listings with active promotion are not closed automatically
  - Promoted listings with expired promotion are closed automatically on the next cron run
- **Paid Promotion Feature (MVP):** Users can promote their listings for higher visibility
  - Promoted listings appear first in search results
  - Visual highlighting with green border and "Promoted" tag
  - Promotion periods: 1, 7, 14, or 30 days
  - Promotion time is frozen when listing is paused
  - Access control via backend `PROMOTION_ACCESS` environment variable (disabled/admin/all)
  - See [paid-promotion.md](../features/paid-promotion.md) for complete documentation

### Technologies

- **Frontend:** Next.js 16, React 19, TailwindCSS, Zustand
- **Backend:** NestJS, PostgreSQL, TypeORM, Redis
- **Database:** PostgreSQL 15 with comprehensive indexing and triggers
- **Search:** PostgreSQL Full-Text Search
- **Image Processing:** Sharp library for optimization and WebP conversion
- **File Storage:** AWS S3 for images and optional listing video (using AWS SDK v3), AWS CloudFront CDN for delivery when configured
- **Authentication:** JWT tokens (1 hour expiration), Refresh tokens (7 days)
- **Task Scheduling:** NestJS Schedule module (cron jobs)

---

## 2. Development Setup

### Requirements

- Node.js 20.9+
- Docker and Docker Compose
- npm or yarn

### Quick Start

```bash
# Install dependencies
cd core
npm run install:all

# Start database
docker compose up -d

# Start backend (Terminal 1)
cd backend && npm run start:dev

# Start frontend (Terminal 2)
cd ../frontend && npm run dev
```

**Frontend:** http://localhost:3000 | **Backend:** http://localhost:4000

### Docker Issues

If you see `Cannot connect to the Docker daemon`:

**Option 1: Start Docker Desktop**

1. Open Docker Desktop application
2. Wait for full startup
3. Run `cd core && docker compose up -d`

**Option 2: Install PostgreSQL and Redis locally**

#### PostgreSQL (macOS)

```bash
brew install postgresql@15
brew services start postgresql@15
createdb kupito
psql postgres
```

In psql:

```sql
CREATE USER kupito WITH PASSWORD 'kupito123';
ALTER DATABASE kupito OWNER TO kupito;
GRANT ALL PRIVILEGES ON DATABASE kupito TO kupito;
\q
```

#### Redis (macOS)

```bash
brew install redis
brew services start redis
```

### Database Setup

**For production (migrations):**

```bash
cd core/backend
npm run build
npm run migration:run:prod
```

**For development (TypeORM sync):**

```bash
cd core/backend && npm run start:dev
```

**Important:** Always use migrations in production. The latest migration includes database optimizations (indexes, triggers).

---

## 3. Environment Variables

### Backend (`backend/.env`)

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=kupito
DB_PASSWORD=kupito123
DB_NAME=kupito

# Database Connection Pooling (optional)
DB_POOL_MAX=20
DB_POOL_MIN=0
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=10000

# Authentication
JWT_SECRET=your-secret-key-change-in-production

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# Watermark Configuration (optional)
WATERMARK_DOMAIN=your-domain.com
# If not set, domain will be extracted from FRONTEND_URL

# Redis Configuration (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_MESSAGING_SERVICE_SID=your-twilio-messaging-service-sid
# Optional: skip real Twilio sends outside production (codes still stored in Redis); see SMS Verification in this doc
# SMS_OUTBOUND_DISABLED=true
# Optional: allow fixed test SMS code in NODE_ENV=test (integration tests); forbidden in production
# ALLOW_SMS_TEST_CODE=true

# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@your-domain.com
# Setup: ../operations/smtp-email-setup.md (EN), ../operations/smtp-email-setup-ru.md (RU)

# Internationalization (optional)
DEFAULT_LOCALE=<locale>
# Supported locales depend on platform (e.g. ro, ru for Moldova)

# Promotion and cron configuration
PROMOTION_ACCESS=disabled
MAX_PROMOTIONS_PER_USER=10
CRON_SECRET=your-secret-key-here

# Weekly listing views email digest (optional) — off when unset
# true enables the Monday cron send and the profile UI toggle (exposed as weeklyViewsDigestAvailable in GET /api/auth/me)
# WEEKLY_VIEWS_DIGEST_ENABLED=true

# Infocar partner integration (optional)
INFOCAR_SECRET_KEY=<secret-from-infocar>
# Required for report URL with encrypted VIN (GET /api/listings/:id/report-url). If unset, endpoint returns 404.
# Optional: INFOCAR_BASE_URL (default https://infocar.md for RO), INFOCAR_BASE_URL_RU (default https://ru.infocar.md for RU).

# Google Gemini (optional) — listing AI analysis (POST /api/listings/:id/ai-report). If GEMINI_API_KEY is unset, the endpoint returns status unavailable.
GEMINI_API_KEY=<google-ai-studio-api-key>
# Optional: GEMINI_MODEL (default gemini-3.5-flash). GEMINI_MODEL_FALLBACK (default gemini-3.1-flash-lite) is used when the primary model returns transient errors (e.g. 503 / overload).
# Production only: max new AI report generations per user per rolling hour (Redis). Unset = 5. Non-production (e.g. development): quota disabled.
# AI_REPORT_MAX_GENERATIONS_PER_HOUR=5

# Listing video (optional) — same AWS S3 credentials as images; add MediaConvert endpoint/queue/role and SNS → /api/webhooks/mediaconvert for transcoding. Full checklist: ../guides/listing-video-production-setup-ru.md (operators, Russian); API behavior: ../features/listings.md
```

### Frontend (`frontend/.env.local`)

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_COUNTRY=<country>
# ISO 3166-1 alpha-2 country code (e.g. md for Moldova)

# Google Search Console Verification (optional)
NEXT_PUBLIC_GOOGLE_VERIFICATION=your-verification-code

# Google Analytics Measurement ID (required for GA4 hits via gtag.js)
# NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Listing views visibility (optional)
# all: show view counts to everyone (default)
# admin: show view counts only to Admin users
# Set in frontend/.env.local — backend .env does not affect the Next.js client bundle.
NEXT_PUBLIC_LISTING_VIEWS_VISIBILITY=all

```

### Promotion Feature Variables (backend runtime)

- **`PROMOTION_ACCESS`**: Controls who can access promotion features
  - `disabled`: Feature disabled for all users
  - `admin`: Only administrators can promote listings
  - `all`: All authenticated users can promote listings
- **`MAX_PROMOTIONS_PER_USER`**: Maximum number of active promotions per user (default: 10)
- **`CRON_SECRET`**: Secret key for authenticating cron job endpoints (minimum 32 characters)

See [paid-promotion.md](../features/paid-promotion.md) for complete promotion feature documentation.

### Production Notes

⚠️ **Important:** In production, you **must** set `JWT_SECRET` and `DB_PASSWORD` to secure values. The application will throw an error if `JWT_SECRET` is missing in production mode.

---

## 4. Architecture

### Backend: monolith and layers

The backend (`core/backend/`) is a **single NestJS monolith**: one process, one PostgreSQL database, feature areas as NestJS modules in `AppModule`. It exposes a **REST** API (no GraphQL or WebSockets). Background work uses **cron** (`@nestjs/schedule`), in-process **events** (`EventEmitterModule`), and **CLI scripts** — there is no Bull/Redis queue.

Layered design (target): **Presentation** → **Application** (use cases, ports) → **Domain** → **Infrastructure** (TypeORM, Redis, S3, SMS). Fully adopted in **Listings** and **Auth**; other modules are hybrid or classic controller → service. Deployments are **multi-platform** (`COUNTRY` env), not multi-tenant SaaS.

- [backend-overview.md](./backend-overview.md) — monolith, stack, module list, Redis, auth summary, what is not used
- [backend-layers.md](./backend-layers.md) — layer conventions, bounded contexts, migration state

### Project Structure

```
PPCSL/
├── frontend/          # Next.js application
│   ├── app/          # Pages and routes (Server Components)
│   ├── components/   # React components (layout/, listing/, search/, modals/, analytics/, providers/, pwa/, common/)
│   ├── config/       # Tool configs (ESLint, Jest, Sentry, Stylelint, Vitest, proxy)
│   └── lib/          # Utilities and API clients
│       ├── api/      # Client API (api.ts barrel, api-types, api-*.ts modules), server API (server-api.ts), api-utils
│       ├── search/   # search-params, listingSort
│       ├── utils/    # utils.ts, status-utils
│       ├── validation/, options/, content/, store/
│       └── config/   # Loaders: faq, legal, popular-brands (copied from platform)
├── backend/          # NestJS API
│   ├── src/
│   │   ├── auth/     # Authentication
│   │   ├── users/    # Users
│   │   ├── listings/ # Listings
│   │   ├── favorites/# Favorites
│   │   ├── saved-filters/ # Saved search filters
│   │   ├── smart-selection/ # Guided questionnaire that creates saved filters
│   │   ├── board/    # Seller listings board (public by slug)
│   │   ├── brands/   # Brands and models
│   │   ├── admin/    # Admin panel
│   │   ├── parsing/  # Parsing orchestration (admin runs, schedules, CLI runner)
│   │   ├── upload/   # File upload service (with watermark support)
│   │   ├── common/   # Common utilities and services
│   │   │   ├── decorators/ # Custom validation decorators (IsName, IsPhone, IsPassword)
│   │   │   ├── i18n/  # Internationalization service (I18nService)
│   │   │   └── utils/ # Utility functions (data-cleanup, error-handling, query-builder, validation)
│   │   └── scripts/  # Utility scripts
│   ├── assets/
│   │   └── watermark/ # Watermark assets (logo.png)
│   └── uploads/       # Local file storage (development)
├── docs/             # Documentation
└── docker-compose.yml # Database configuration
```

### Frontend Architecture

**Server Components (Next.js App Router):**

- Homepage (`app/page.tsx`) is an async Server Component that fetches initial listings data
- Server-side data fetching uses native `fetch` with Next.js Data Cache and Request Memoization
- Initial data passed as props to client components for client-side pagination and load-more interactions
- Improves SEO, reduces client-side JavaScript, and improves initial page load performance

**Client Components:**

- Interactive components (forms, modals, pagination controls) remain as Client Components
- State management handled by Zustand stores
- API calls for subsequent data loads use Axios client (`lib/api`; barrel `api.ts` re-exports from `api-listings.ts`, `api-auth.ts`, etc.)

### Shared UI Components

Reusable UI primitives are located in `frontend/ui/` and exported from `@/ui`:

- **InfoBlock** — Static informational block with icon (info or warning variant)
- **HintTooltip** — "?" click-to-reveal popover with smart positioning and animation

See [ui-components.md](../features/ui-components.md) for props, behavior, and usage guidelines.

### Key Features

- **Image Processing:** Automatic compression, resizing (max 1920px width), conversion to WebP format (75% quality by default)
- **Adaptive Quality:** Different quality levels for different contexts (75% for listing cards, 75-80% for detail pages, 85% for full-size modal views)
- **File Storage:** AWS S3 for persistent images and optional listing video (using AWS SDK v3, required for production on Render.com), AWS CloudFront CDN for fast global delivery when configured
- **Search:** PostgreSQL Full-Text Search with extensive filtering options
- **Smart Selection:** authenticated questionnaire that maps car-use preferences to a saved search filter
- **Caching:** Redis for SMS codes, cache optimization (SCAN instead of KEYS), listing AI analysis generation locks and per-user hourly quotas (production; see `POST /api/listings/:id/ai-report` and `AI_REPORT_MAX_GENERATIONS_PER_HOUR`)
- **Monitoring:** Health check endpoint (`/health`) with database and Redis connectivity checks; Prometheus text at `GET /metrics` (`MetricsModule`, protected by `CronSecretGuard` — scrapers must send `x-cron-secret: <CRON_SECRET>`)
- **Listing views:** Pending view counts accumulate in Redis hash `listing:views:pending`; a cron flush every 5 minutes applies them to Postgres under Redis lock `listing:views:flush:lock` (single writer across instances); shutdown runs an unlocked flush
- **Tracing (optional):** OpenTelemetry OTLP export when `OTEL_EXPORTER_OTLP_ENDPOINT` is set (`OTEL_SERVICE_NAME`, default `kupito-backend`)
- **Code Quality:** TypeScript strict mode, CI/CD automation, bundle optimization

---

## 5. API Reference

### Authentication

```http
POST /api/auth/register              # Register new user
POST /api/auth/login                  # Login (sets httpOnly session cookies; JSON returns user only)
POST /api/auth/refresh                # Refresh session (rotates refresh token in cookies; JSON returns user only)
POST /api/auth/google                 # Google Sign-In (GIS idToken)
POST /api/auth/telegram               # Telegram Sign-In (Login Widget payload + HMAC verification)
GET  /api/auth/me                     # Get current user profile (includes hasPassword; password hash never returned)
PATCH /api/auth/profile              # Update user profile (response includes hasPassword)
POST /api/auth/change-password       # Change or set password (JWT; throttle: 5/min per IP in production)
POST /api/auth/change-phone-request  # Request phone number change; sends SMS to new number (JWT; per-phone SMS quota in Redis)
POST /api/auth/change-phone-verify   # Complete phone change with SMS code (JWT)
DELETE /api/auth/profile              # Delete user account
POST /api/auth/send-sms              # Send SMS verification code (always { success: true } to avoid phone enumeration)
POST /api/auth/verify-sms            # Verify SMS code
POST /api/auth/request-password-reset # Request password reset
POST /api/auth/reset-password         # Reset password
```

Refresh tokens rotate on each successful refresh (the previous refresh token is revoked). Access and refresh tokens are stored in **httpOnly cookies** (`kupito_access_token`, `kupito_refresh_token`); API JSON responses do not include token fields. `POST /api/auth/change-password` revokes all refresh tokens except the one in the current browser’s `kupito_refresh_token` cookie (other devices are logged out; session cookies are unchanged). `POST /api/auth/reset-password` revokes refresh tokens and clears session cookies. Already-issued access JWTs remain valid until expiry (see [auth-jwt-invalidation-followup.md](./auth-jwt-invalidation-followup.md)). The Axios client calls `POST /api/auth/refresh` with credentials; Zustand holds the `user` snapshot only—see [AUTH_COOKIE_SESSION.md](../guides/AUTH_COOKIE_SESSION.md) and [cross-tab-sync.md](../features/cross-tab-sync.md#auth-refresh-and-token-rotation).

**Profile password (`/profile`):** `GET /api/auth/me` exposes `hasPassword` (derived from the stored hash; the `password` column uses `select: false` in TypeORM). Accounts created via Google with no hash show **Set password** (new password only, `InfoBlock` hint); `POST /api/auth/change-password` accepts body `{ newPassword }` without `currentPassword`. After a password exists, the UI switches to **Change password** (current + new). Google Sign-In remains available; login by email or phone + password works once `hasPassword` is true. Password-only save does not require other profile fields (e.g. company website) to be valid. No separate “confirm new password” field—client validates length (max 100) and strength before submit.

**Profile email input hardening (`/profile`):** The client sanitizes prefilled values before submit:
- invalid persisted email values are normalized to empty state on load
- phone-like autofill values in the email field are dropped
- profile inputs disable browser/password-manager autocomplete hints to reduce accidental cross-field autofill

### Listings

```http
GET    /api/listings                  # List listings (with filters); embedded `user.phone` / `user.additionalPhone` are last-three-digits masked for public payloads (same rules as single listing when contact fields are present)
GET    /api/listings/:id              # Get listing details (supports includeFullVin=1 for Admin). Non-owner/non-admin: masked 17-char VIN; seller phones last-three-digits masked
POST   /api/listings                  # Create listing
PATCH  /api/listings/:id              # Update listing (owner: non-closed only; Admin can edit any status; create-only fields such as status, assignedUserId, stagedVideoToken are not accepted)
POST   /api/listings/:id/publish      # Activate listing
POST   /api/listings/:id/pause        # Pause listing
POST   /api/listings/:id/close        # Close listing
GET    /api/listings/my               # Get user's listings; query: page, limit, status (Active|Paused|Closed), promoted (true|false), search (brand/model text); meta: last_listing_refresh_at, refreshCooldownMs for 48h timer
GET    /api/listings/my/status-counts # Get current user's listing counts; query: search (brand/model text); returns Active, Paused, Closed, Promoted
GET    /api/listings/vin/:vin         # Find listings by VIN
GET    /api/listings/:id/vin          # Get full VIN (JWT required; up to 20 different listings per rolling hour per user in Redis; repeat same listing in the hour does not consume quota; query action=reveal|copy)
GET    /api/listings/:id/phones       # Full seller phone numbers (optional JWT). Anonymous: visitor id sha256(ip|user-agent); up to 5 different listings/hour. Authenticated: up to 20 different listings/hour. Listing owner and Admin skip rate limits. One call returns both numbers; repeat same listing in the hour does not consume quota
GET    /api/listings/:id/history      # Previous listings with same VIN
GET    /api/listings/:id/report-url        # Infocar report URL (AES-256-CBC encrypted VIN, param vin); optional query locale=ro|ru
GET    /api/listings/:id/report-redirect   # 302 redirect to Infocar (direct link for iOS); optional query locale=ro|ru
POST   /api/listings/:id/ai-report         # Optional structured AI analysis for vehicle listings (JWT). Body optional { language?: ru|ro } (lower priority than Accept-Language / X-Report-Language). Returns { status: ready|pending|unavailable } or 429 rate_limited. Cached by listing + language + input hash; Redis lock dedupes parallel generation. User hourly quota: disabled when NODE_ENV is not production; in production see AI_REPORT_MAX_GENERATIONS_PER_HOUR (default 5).
POST   /api/listings/refresh-dates    # Refresh all user's listing dates (max once per 48h; returns 400 if too soon, throttle: 5 req/min/user)
POST   /api/listings/cron/close-old            # Close old listings (cron job, requires x-cron-secret header)
POST   /api/listings/cron/expire-promotions   # Expire promotions (cron job, requires x-cron-secret header)
PATCH  /api/listings/:id/promote      # Toggle listing promotion (user, JWT required)
GET    /api/listings/promotion-history # Get user's promotion history (JWT required)
GET    /api/listings/promotion-history/check # Check if user has promotion history (JWT required)
GET    /api/listings/promotion-access  # Get promotion access status (no auth required)
```

**Listing video (optional, JWT):** `GET /api/listings/video/constraints`. Staged flow (no listing id yet): `POST /api/listings/video/staged-upload-init`, `POST /api/listings/video/staged-upload-complete`, `POST /api/listings/video/staged-status`. Bound to an existing id: `POST /api/listings/:id/video/upload-init`, `POST /api/listings/:id/video/upload-complete`, `DELETE /api/listings/:id/video`. Create payload may include `stagedVideoToken` when a staged upload has finished processing. Partner CLI imports call `POST /api/upload/video/from-url` with the import JWT and optional `x-import-secret` (`KUPITO_IMPORT_SECRET` / legacy `CIPAUTO_IMPORT_SECRET`). Job completion: `POST /api/webhooks/mediaconvert` (SNS). Env, S3 prefixes, MediaConvert, and Render steps: [listings.md](../features/listings.md), [listing-video-production-setup-ru.md](../guides/listing-video-production-setup-ru.md) (operators, Russian).

**Listing detail — seller phones (frontend):** For guests and non-owner viewers, masked numbers from `GET /api/listings/:id` are shown with a reveal control; `GET /api/listings/:id/phones` runs on reveal. A **Contact** action card (when promote card is not shown) scrolls to the seller block and triggers the same reveal flow. Copy is available after reveal for that flow. Listing owner and Admin see full numbers from `GET /api/listings/:id` with copy and no reveal control (no `GET .../phones` needed for display). Visibility rules: `listingPagePromoteCard.ts` (`listingPageShowsContactCard`, `listingPageShowsPromoteCard`).

**Listing images / blurhash:** Listings store `cover_blur_hash` (first photo, for cards) and optional `image_blur_hashes` (JSON array aligned with `images`, entries may be `null`). `POST /api/listings` and `PATCH /api/listings/:id` accept `image_blur_hashes` when its length matches `images`. For existing rows without the array, run `npm run backfill:blurhash:all` (see `core/backend/docs/SCRIPTS.md`). The listing UI shows blur placeholders only when these fields are populated; a local DB without blurhash data will not show them compared to production—see `core/docs/features/image-preview.md` (Local development vs production).

**Filter Parameters:**

- The frontend supports **slug-based URLs** for better SEO and user-friendly URLs:
  - `?brand=toyota` or `?brand=toyota,bmw` - Filter by brand slugs (comma-separated)
  - `?model=yaris` or `?model=yaris,corolla` - Filter by model slugs (comma-separated, requires brand filter)
  - Slug parameters are converted to `brand_ids` and `model_ids` on the **frontend** (in `parseSearchParams` via `brandResolver`) before the API request; the API receives only UUIDs.
  - If a brand slug from the URL is not found (e.g. no such brand in the catalog), the search returns **0 listings** (no fallback to “all brands”).
  - Other filter parameters remain unchanged (price, year, city, etc.)
- When both `brand_ids` and `model_ids` are sent, the backend uses **OR** logic so that “brand-only” selections still return results: a listing matches if its `model_id` is in the list **or** its `brand_id` is in the list and that brand has no selected models (e.g. “all Škoda” + specific models for other brands returns all Škoda listings plus the chosen models). Implementation: `TypeOrmListingRepository.applyBrandModelFilter`.
- `?equipment=air_conditioning,navigation` - Filter by equipment keys (comma-separated). Options depend on `vehicleType` (car/truck/moto). See `vehicle-equipment.ts` for keys and categories.
- `?equipmentMatch=full|partial` - Equipment match mode (optional; default `full`). **Full:** listing must contain all selected equipment (AND). **Partial:** listing must contain at least one selected option (OR).
- `?seller_types=Individual,Business` - Restrict results to listings whose owner has one of those account types (`user.type`). Applied to both vehicle and tire searches. Omit for no filter. Legacy `?seller_type=Individual|Business` (singular) is still accepted by the frontend URL parser and the API.
- Example URLs:
  - `/?brand=toyota` - All Toyota listings
  - `/?brand=toyota&model=yaris` - Toyota Yaris listings
  - `/?brand=toyota,bmw&model=yaris,3-series` - Multiple brands and models
  - `/?brand=skoda,toyota&model=corolla` - All Škoda listings plus Toyota Corolla (brand-only + specific model)

### Favorites

```http
GET    /api/favorites                 # Get user's favorites
POST   /api/favorites/:id             # Add to favorites
DELETE /api/favorites/:id             # Remove from favorites
GET    /api/favorites/check/:id       # Check if listing is in favorites
```

**Favorites sort order:** Listings are ordered by `listing.is_promoted DESC`, then `listing.last_updated_at DESC` (promoted first, then by freshness). Saved filters tab lists filters by `created_at DESC`.

**Note:** Favorites page includes tab counters showing the number of listings and saved filters.

**Favorites removal UX:** Removing a card from `/favorites` is optimistic and delayed by a short exit animation (~280ms). If API deletion fails, local favorite state is restored.

**Multi-tab:** The favorites page and client store stay aligned when another tab changes favorites (cross-tab events and `storage` on persist keys). See [cross-tab-sync.md](../features/cross-tab-sync.md).

### Comparison (vehicles and tires)

Users can compare up to three vehicle listings and up to three tire listings; each category has its own list in client state.

```http
GET    /api/comparison/ids            # Listings IDs grouped by category (authenticated)
POST   /api/comparison/sync           # Merge guest buckets with saved rows (authenticated)
POST   /api/comparison/:listingId     # Add listing to comparison (authenticated)
DELETE /api/comparison/:listingId     # Remove listing from comparison (authenticated)
```

- **Guests:** comparison lists persist in `localStorage` (Zustand, key `comparison-storage`): `vehicleComparisons` and `tireComparisons` (legacy shape `comparisons` maps to vehicles only).
- **Authenticated users:** rows in `comparison_items` (Postgres) are the source of truth; the client loads them after session init (`loadComparisonFromApi`) and syncs mutations via the comparison API. Adding own listings is allowed (unlike favorites).
- Comparison page (`/compare`) is public; guests use local storage only; signed-in users call the API when toggling compare or removing rows on the compare page.
- On login or registration, `applyComparisonAfterAuth` merges `pendingComparisons` (legacy) and buckets from `comparison-storage` (up to 3 vehicles and 3 tires separately) into the account via `POST /api/comparison/sync` (server order kept, then guest IDs fill free slots).
- **Logout:** local comparison state is cleared; server-side rows remain for the next login.
- Header shows a Compare link with a counter badge (total items in both lists).
- Vehicle comparisons can show an optional equipment/options table built from the union of selected equipment keys in the compared listings.
- **Multi-tab:** Compare UI and signed-in comparison IDs refresh when another tab changes comparison; guests rely on persist rehydrate. See [cross-tab-sync.md](../features/cross-tab-sync.md).

### Saved Filters

```http
GET    /api/saved-filters              # Get all saved filters (authenticated users)
POST   /api/saved-filters              # Create saved filter (max 20 per user)
PATCH  /api/saved-filters/:id          # Update saved filter name
DELETE /api/saved-filters/:id          # Delete saved filter
```

**Saved filters payload sanitization:** Client-side create requests keep only allowed filter keys before calling `POST /api/saved-filters`. This prevents accidental UI-only/transient fields from being persisted.

**E2E:** Reusing the same authenticated user across runs can hit the per-user cap (`400` from `POST`). Specs that create filters should clear existing rows first (see [e2e-playwright-standards.md](../guides/e2e-playwright-standards.md)).

### Smart Selection

Guided saved-filter creation for authenticated, phone-verified users. The frontend route is `/smart-selection`; guests are redirected through sign-in with that return path.

```http
POST /api/smart-selection             # Create a saved car filter from questionnaire answers (JWT + phone verified)
```

The request includes purpose, driving mode, budget preset, currency, flexible budget flag, size/body type preferences, transmission/fuel choices, year/mileage presets, and up to three priorities. The backend maps answers to a regular saved filter (`vehicleType=car`) and relaxes narrow filters until enough listings are found or all expansion steps are exhausted. The saved filter is returned and appears on `/favorites?tab=filters`. See [smart-selection.md](../features/smart-selection.md).

### Seller Listings Board

Public seller board page: all active listings of a seller by slug (no auth required). Pages `/board/*` are noindex. See [seller-listings-board.md](../features/seller-listings-board.md) for full specification.

```http
GET    /api/board/:slug                 # Get board info (displayName, boardSlug)
GET    /api/board/:slug/listings        # Get active listings (page, limit, sortBy, sortOrder); embedded seller phones last-three-digits masked on `user`
```

### Upload

```http
POST /api/upload/image                # Upload and optimize image
                                      # Automatically applies watermark (logo + domain text)
                                      # Images are resized, watermarked, and converted to WebP
GET  /api/upload/image/:filename      # Get optimized image version
                                     # Query params: ?quality=X&width=Y
                                     # Response: Cache-Control: public, max-age=31536000, immutable, stale-while-revalidate=604800; ETag for 304 Not Modified
                                     # Delivery cache: in-memory LRU, then persistent /uploads/optimized/{name}_{width}_{quality}.webp (S3 or disk)
                                     # Persistent cache is written only for standard responsive widths/qualities (bounds storage on the unthrottled endpoint)
POST /api/upload/video/from-url       # Ingest listing video from HTTPS URL (import JWT + optional x-import-secret); SSRF-hardened download; used by partner import CLIs
```

**Watermark Details:**

- Watermark is automatically applied to all uploaded images
- License plate masking is optional in the listing form; when the user enables it, backend detects plates with an ONNX model and overlays a gray mask. Animated images are rejected; see [license-plate-mask.md](../features/license-plate-mask.md)
- Logo file location: `backend/assets/watermark/logo.png`
- Watermark includes: logo (15% of image size) + domain text below
- Watermark domain is configurable via `WATERMARK_DOMAIN` environment variable
- If `WATERMARK_DOMAIN` is not set, domain is extracted from `FRONTEND_URL` environment variable
- Default domain: extracted from `FRONTEND_URL` (fallback)
- Watermark opacity: 35%
- Watermark position: bottom-right corner with 3% padding
- Logo is centered relative to the text

### Admin

Admin panel (role `Admin` only, `JwtAuthGuard` + `AdminGuard`). Tabs: Users, Brands/Models, Listings, Promotions, Parsing.

**Users & Listings:**

```http
GET   /api/admin/users                # Get all users (paginated)
GET   /api/admin/listings             # Get all listings (paginated)
GET   /api/admin/stats                # Get statistics
PATCH /api/admin/listings/:id/status  # Change listing status
PATCH /api/admin/users/:id/toggle-status # Enable/disable user (revokes refresh tokens when deactivating)
```

**Brands / Models** — catalog management (soft delete via archive; no `is_active`):

```http
GET   /api/admin/brands-models        # Paginated brands with models; query: page, limit, query (search), vehicleType (car|truck|moto)
POST  /api/admin/brands               # Create brand (name, vehicleTypes, optional popularCountry)
PATCH /api/admin/brands/:id           # Update brand (name, vehicleTypes, optional popularCountry)
POST  /api/admin/models               # Create model (brandId, name, vehicleTypes)
PATCH /api/admin/models/:id           # Update model
PATCH /api/admin/brands/:id/archive   # Archive brand (and all its models); 409 if active listings exist
PATCH /api/admin/models/:id/archive  # Archive model; 409 if active listings exist
PATCH /api/admin/brands/:id/unarchive # Unarchive brand (409 if non-archived brand with same name exists)
PATCH /api/admin/models/:id/unarchive # Unarchive model
```

**Tire brands / models** — separate catalog (`tire_brands`, `tire_models`); listings use `listings.tire_id` and `Listing.category = tire`:

```http
GET   /api/admin/tire-brands-models   # Paginated tire brands with models; query: page, limit, query (search), tireVehicleType (car|truck|moto) — brand must have ≥1 active tire listing of that type
POST  /api/admin/tire-brands         # Create tire brand (name)
PATCH /api/admin/tire-brands/:id     # Update tire brand
POST  /api/admin/tire-models        # Create tire model (brandId, name, optional isOther)
PATCH /api/admin/tire-models/:id     # Update tire model
PATCH /api/admin/tire-brands/:id/archive
PATCH /api/admin/tire-models/:id/archive
PATCH /api/admin/tire-brands/:id/unarchive
PATCH /api/admin/tire-models/:id/unarchive
```

Entities: `brands` and `vehicle_models` have `is_archived`, `name_normalized`, `vehicle_types` (array). `brands` also has optional `popular_country` (`chinese` | `french` | `german` | `korean` | `japanese` | `american` | `italian`) for the search “Popular brands by country” chips. `tire_brands` and `tire_models` have `is_archived`, `name_normalized`; models also `is_other`. Public catalog endpoints exclude archived records. Audit: `admin_audit_log` for vehicle and tire entities. After vehicle mutations, brands cache is invalidated; after tire mutations, tire Redis cache and listing search cache are invalidated.

**Frontend (Brands/Models tab):** Container `BrandsModelsTab` uses `usePaginatedData`, renders `BrandsModelsFilters` (search, vehicle or tire catalog toggle, vehicle type filter for cars/trucks/moto, tire listing-type filter when in tire mode, Add Brand / Add Model), `BrandsModelsTable` (expandable rows, archive/unarchive buttons, edit icons, copy ID), `ArchiveConfirmModal`, `BrandFormModal`, `ModelFormModal`, `TireBrandFormModal`, `TireModelFormModal`. `BrandFormModal` includes a “Popular brands by country” dropdown (`popularCountry`, single optional value, clearable). Model form uses searchable brand dropdown with `renderMenuInPortal` so the list is not clipped by the modal. Duplicate name errors show inline (no global toast); API returns `code: 'DUPLICATE_NAME'` with 409.

**Search (popular tab):** `PopularCountryBrandsFilter` renders country chips above popular brands when at least one brand in the current vehicle-type catalog has `popular_country`; clicking a chip adds that country’s brand IDs to `brand_ids`, clicking again removes them (respects `MAX_SEARCH_BRAND_SELECTIONS` when adding).

### Health

```http
GET /                                 # API status check
GET /health                          # Health check (database, Redis)
GET /metrics                         # Prometheus metrics (text/plain). Requires header x-cron-secret: <CRON_SECRET> (CronSecretGuard). Scrape from private network only; do not expose without the secret
```

---

## 6. Database

### Optimizations

#### Indexes

**Listings Table:**

- `status`, `user_id`, `status + user_id` (composite)
- `status + last_updated_at` (composite, for auto-closing)
- `price`, `created_at`, `views`, `vin` (partial), `urgent` (partial)
- `currency`, `city`, `title`

**Listing Date Fields:**

- `created_at` - Date when listing was created (automatic, never changes). Used for "My listings" and admin listings sort (newest first).
- `last_updated_at` - Updated only when:
  - Listing is created
  - User clicks "Refresh dates" button (updates all active listings)
  - Used for automatic closing after 90 days
  - Used for "newest/oldest" sort on main search, board, and favorites (so sort order matches the date shown on listing cards)
- `last_edited_at` - Updated when listing content is edited (price, description, images, etc.)
- `last_published_at` - Updated when listing status changes to Active:
  - When listing is created with Active status
  - When listing is published via `POST /api/listings/:id/publish`
- `updated_at` - Automatically updated by TypeORM on any listing modification

**Listings Table Fields:**

- `price` - Integer (stored as integer, no decimal places)
- `negotiable` - Boolean, default false (price is negotiable; shown on listing page under price)
- `available_in_credit` - Boolean, default false (available in credit/installment)
- `down_payment_amount` - Integer, nullable (minimum down payment when available_in_credit is true)
- `power_kw` - Integer, nullable (power in kilowatts)
- `equipment` - Simple array, nullable. Array of equipment keys; the available set depends on vehicle type (car / truck / moto). Keys and categories are defined in `core/frontend/lib/options/vehicle-equipment.ts`. Create/edit form and search filter UI group options by category (Comfort, Safety, Lighting, Multimedia, Driver assistance, Other). On the listing detail page, `buildListingEquipmentDisplay` (`equipment-display.ts`) uses the same categories when the listing has at least 10 equipment keys spanning at least 3 categories; otherwise it shows a single two-column flat list. Translations: `vehicleOptions.equipment.<key>` and `vehicleOptions.equipmentCategories.<category>` in frontend locales.
- `availability` - Enum `InStock` | `OnOrder`, default `InStock` (vehicle listings)

**Vehicles Table:**

- `brand_id`, `model_id`, `brand_id + model_id` (composite)
- `year`, `fuel` (partial), `transmission` (partial)
- `body_type`, `mileage_km` (partial), `engine_displ_l` (partial)
- `country_of_origin` (nullable, ISO alpha-2), `owners_count` (nullable, 0–100), `interior_color` (nullable color slug), `seats` (nullable, 1–9)

**Users Table:**

- `phone` (partial), `additional_phone` (nullable; optional business contact), `type`, `active`, `email` (unique)
- `last_listing_refresh_at` - Timestamp of last "Refresh dates" action; used to enforce 48h limit per user
- `last_login_at` - Timestamp of the most recent successful login; set by login use case

**Saved Filters Table:**

- `user_id`, `created_at`

**Parsing Tables** (`parser_runs`, `parser_schedules`, `parser_log_chunks`):

- Managed by the `parsing` module. Schema and indexes are described in `docs/features/parsing-framework.md`.
- `parser_runs` — individual PLP/PDP runs with status, env, actor, and timing.
- `parser_schedules` — recurring schedules with frequency presets (`every_n_hours`, `every_n_days`, `daily`, `weekly`, `custom`) and persisted cron.
- `parser_log_chunks` — sequenced log lines from CLI runner stdout/stderr.

#### Triggers

1. **Auto-increment views counter** - Increments views when view is recorded
2. **Cleanup listing views** - Removes view records when listing is deleted
3. **Cleanup favorites** - Removes favorite records when listing is deleted

**Note:** The auto-update trigger for `last_updated_at` was removed. This field is now updated manually only during listing creation and when using the "Refresh dates" feature. This allows users to control when their listings' auto-close timer resets.

**Refresh dates (48h limit):** The "Refresh dates" action is allowed at most once per 48 hours per user. The backend defines `REFRESH_COOLDOWN_MS` in `common/constants.ts`, stores `users.last_listing_refresh_at`, and returns 400 with `errors.refreshDatesTooSoon` if the user calls `POST /api/listings/refresh-dates` before the cooldown has passed. The response of `GET /api/listings/my` includes `meta.last_listing_refresh_at` (ISO string or null) and `meta.refreshCooldownMs`; the frontend uses these (no hardcoded 48h) to show the countdown and syncs to localStorage as fallback.

#### Exchange Rates

**Table:** `exchange_rates` — stores daily exchange rates from FXRatesAPI.

- **Retention:** keeps the 3 most recent rows per currency pair (rolling window, not date-based cutoff)
- **Fetch schedule:** daily cron at 02:30 UTC (`ExchangeRatesService.fetchDailyRates`)
- **Cache:** Redis with 1h TTL per rate; env fallback `EXCHANGE_RATE_EUR_<CURRENCY>`
- **`ExchangeRatesService.getAllRatesMap()`** — returns `{ defaultCurrency, rates }` for all non-default currencies (parallel fetch via `Promise.all`)
- **`enrichListingsWithApproxPrice()`** — adds `approxPriceDefaultCurrency` and `defaultCurrencyCode` to each listing; used in search, board, favorites, user listings, and single listing endpoints
- **Price sorting in default currency:** when `sortBy=price`, the SQL ORDER BY uses a CASE expression that converts prices to the default currency (EUR) using current exchange rates:
  ```sql
  CASE WHEN currency = 'EUR' THEN price
       WHEN currency = 'MDL' THEN price::numeric / :rate_MDL
       ELSE price END
  ```
  The expression is added via `addSelect(expr, alias)` + `addOrderBy(alias)` to avoid TypeORM alias parsing issues. Exchange rates are fetched in the use case and passed to the repository via `SearchCriteria.priceSortRates`; these fields are excluded from the cache key (rates only affect sort order, not which results are returned).

#### Connection Pooling

- **Max connections:** 20 (configurable via `DB_POOL_MAX`)
- **Min connections:** 0 (configurable via `DB_POOL_MIN`)
- **Idle timeout:** 30 seconds
- **Connection timeout:** 10 seconds

### Backups

#### TypeScript Script (Development)

```bash
npm run backup
npm run backup -- --output-dir /path/to/backups
npm run backup -- --no-compress
npm run backup -- --keep-days 60
```

#### Bash Script (Production/Cron)

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_USERNAME=kupito
export DB_PASSWORD=your_password
export DB_NAME=kupito
export BACKUP_DIR=/var/backups/ppcsl
export KEEP_DAYS=30

./core/backend/config/scripts/backup-database.sh
```

#### Automated Backups (Cron)

```bash
# Daily backup at 2 AM
0 2 * * * source /etc/ppcsl/backup.env && /path/to/kupito.club/core/backend/config/scripts/backup-database.sh >> /var/log/ppcsl-backup.log 2>&1
```

Backups are saved to `backend/backups/` by default with format: `ppcsl_backup_YYYY-MM-DD_HH-MM-SS.sql.gz`

---

## 7. Security

### Implemented Security Measures

#### Authentication & Authorization

- JWT tokens with expiration (1 hour access tokens, 7 days refresh tokens)
- Password hashing with bcrypt (10 rounds)
- Protected routes with guards (JwtAuthGuard, AdminGuard)
- Token rotation for enhanced security

#### Rate Limiting

**Global:** 600 requests per 60 seconds per IP (production)

**Special Limits:**

- `POST /api/auth/register`: 3 requests per 10 minutes
- `POST /api/auth/login`: 5 requests per 5 minutes
- `POST /api/auth/change-password`: 5 requests per minute (higher limit in non-production)
- `POST /api/auth/send-sms`: 30 requests per hour per IP (supplementary; per-phone SMS quota enforced in Redis)
- `POST /api/auth/request-password-reset`: 30 requests per hour per IP (supplementary; per-phone SMS quota enforced in Redis)
- `POST /api/upload/image`: 20 requests per minute

**Excluded from throttling:** `GET /api/upload/image/:filename` (image delivery) uses `@SkipThrottle()` so viewing listing photos is not rate-limited by NestJS; edge caching (see [DEPLOYMENT.md](../guides/DEPLOYMENT.md)) reduces origin load.

#### SMS Verification

- IP-based brute force protection (40 failed attempts per IP on guarded auth endpoints, 1-hour block)
- **Short-window per-phone limits** (`AuthPhoneRateLimitService`, separate Redis keys per operation, 10-minute TTL):
  - `send`: 5 attempts → `errors.tooManySmsRequests`
  - `verify`: 10 attempts → `errors.maxSmsCodeAttempts`
  - `password-reset`: 10 attempts → `errors.maxSmsCodeAttempts`
- The `send` bucket increments only when an SMS is actually sent (e.g. `SendVerificationSmsUseCase` skips send for another user's phone but still returns `{ success: true }` without consuming the send limit)
- **Hourly Twilio quota** (`SmsService`): at most 3 SMS sends per phone per rolling hour (`errors.smsHourlyLimit`); at most 3 incorrect code submissions per active code (separate Redis counters for registration/phone-change vs password-reset)
- **Development only:** when `NODE_ENV=development`, `DISABLE_SMS_SEND_RATE_LIMIT=true` on the API skips the per-phone hourly send counter (`SmsService`). Do not use outside local development.
- **Non-production:** when `SMS_OUTBOUND_DISABLED=true` or `SMS_OUTBOUND_DISABLED=1` and `NODE_ENV` is not `production`, the API stores SMS codes in Redis but does not call Twilio `messages.create`. The flag has no effect in production. Use for local development and Playwright runs so Twilio credentials can stay in `.env` without sending real SMS.
- **Fixed test code (`000000`):** accepted for SMS verify endpoints when `NODE_ENV` is `development` or `stage`, or when `NODE_ENV` is `test` and `ALLOW_SMS_TEST_CODE=true` / `1`. Never enabled in production (`ALLOW_SMS_TEST_CODE` is rejected at startup). Implementation: `auth/infrastructure/services/sms-test-code.utils.ts`.
- Frontend: 3 attempts per code before prompting for a new SMS; up to 2 resends after the initial send (3 SMS total per hour aligned with backend)
- Frontend: when a resend fails with API error key `errors.smsHourlyLimit`, the client sets the resend cooldown to one hour (instead of clearing it) on registration verify, password reset, and profile phone-change verify, so the UI does not allow immediate repeated resend clicks against an exhausted per-phone quota
- Automatic cleanup of expired IP blocks (hourly cron job)

#### File Upload Security

- Magic byte validation (file signature checking for JPEG, PNG, GIF, WebP)
- MIME type validation
- File size limits (10MB per image)
- Image metadata validation (width, height)
- Maximum dimension limits (10000x10000 pixels)
- Empty file detection
- Authentication required (JWT)

#### HTML Sanitization

- **Backend** (`backend/src/common/utils/html-sanitizer.ts`): sanitizes stored listing description HTML on write/update.
  - Removes dangerous tags (e.g. script, iframe, object, embed, img, style, form, input, button, link, meta).
  - Strips inline event handlers and `javascript:` URLs.
  - Keeps a whitelist of tags: `p`, `br`, `div`, `strong`, `em`, `i`, `b`, `u`, `ul`, `ol`, `li`, `font` (only `size` attribute, values 2–7), `a` (only `http:`, `https:`, or `mailto:` hrefs; unsafe anchors become text; external links get `target="_blank"` and `rel="noopener noreferrer"`).
  - `normalizeDescriptionHtml()` trims leading/trailing empty block markup.
- **Frontend** (`frontend/lib/listingDescriptionHtml.ts`): before render, DOMPurify with a matching tag/attr allowlist and `linkifyPlainUrlsInHtml` turns plain `http(s)` / `www.` / `mailto:` in text nodes into safe links (`useListingPageClient` → `prepareListingDescriptionHtml`).

#### HTTP Security Headers

- Helmet middleware configured
- Content Security Policy (CSP)
- Standard security headers (XSS Protection, Content-Type-Options, Frame-Options, etc.)

#### Input Validation

- Class-validator for all DTOs
- ValidationPipe with whitelist and transform
- Custom validation decorators:
  - `@IsName()` - Validates name fields (letters, spaces, hyphens, dashes only)
  - `@IsPhone()` - Validates SMS-capable phone via `libphonenumber-js` (E.164, real country code, correct length, mobile/fixed-line-or-mobile only)
  - `@IsPassword()` - Validates password strength (uppercase, lowercase required)
- **Frontend** (`frontend/lib/phone/`): same `libphonenumber-js` rules (default country `MD` for parsing), plus input sanitization, blur formatting (`finalizePhoneFromRawInput` reads the live input value on blur so validation matches the last keystroke before focus leaves), E.164 for API payloads, and backend validation-key mapping; used on register, profile change-phone, and reset-password
- Email validation
- VIN length validation (17 characters)
- SMS code validation (6 digits, numeric only)

#### Error Handling

- Global exception filter with integrated I18nService for localized error messages
- Error logging without exposing details to users
- Unified error messages with support for multiple locales (ro, ru, en)
- Locale detection from `Accept-Language` header or `DEFAULT_LOCALE` environment variable

---

## 8. Testing

### Unit Tests

**Backend:** Jest-based unit tests for services and controllers
**Frontend:** Jest + React Testing Library for components and utilities

**Running Tests:**

```bash
# Backend unit tests
cd core/backend && npm test

# Backend integration tests
cd core/backend && npm run test:integration

# Frontend tests
cd core/frontend && npm test
```

### Integration Tests

- **Contract Testing:** API endpoints validated against Swagger/OpenAPI specification
- **Framework:** Jest + Supertest + jest-openapi
- **Location:** `backend/src/test/*.integration.ts`
- **Coverage:** Listings, Auth, Brands, Cities, Favorites, Upload, Users, Admin APIs

### Test Coverage

**Backend Services:** ✅ All critical services have unit tests
**Controllers:** ✅ All controllers have comprehensive unit tests
**Guards:** ✅ JwtAuthGuard, AdminGuard, IpBlockGuard tested
**Frontend Components:** ✅ Core components tested (AuthProvider)
**Frontend Server API:** ✅ Server-side data fetching functions tested (`lib/api/server-api.test.ts`)
**Frontend API:** ✅ Client-side API functions tested (`lib/api/api.test.ts`; modules: api-types, api-listings, api-auth, etc.)
**Frontend Utilities:** ✅ Utility functions tested (`lib/utils/utils.test.ts`)

**Test Statistics (indicative; run `npm test` for current counts):**

- **Backend unit:** on the order of 650+ tests across 85+ suites
- **Backend integration:** 50 tests across 6 suites
- **Frontend:** on the order of 280+ tests across 40+ suites (components, utilities, API, server API)

### CI/CD

- All tests run automatically in GitHub Actions on push and pull requests
- Automated deployment job for production (main branch)
- Bundle size analysis in frontend CI

---

## 9. Scripts

### Brand and Model Scripts

```bash
# Add brands and models
npm run add-brands
npm run add-historical
npm run add-grand
npm run add-models
npm run add-french-models
npm run add-german-models
npm run add-italian-models
npm run add-japanese-models
npm run add-american-models
npm run add-commercial-models
npm run add-other-model
npm run seed:all-brands  # Run all brand scripts sequentially (optimized)

# Check and manage
npm run check-brands
npm run check-models
npm run check-citroen
npm run check-duplicates
npm run remove-duplicates
npm run delete-all-brands
npm run cleanup-brands
npm run sync-carquery
npm run generate-listings-for-models
```

### Database Scripts

```bash
# Seeding
npm run seed
npm run reset-and-seed
npm run seed:vin
npm run seed:vehicles
npm run copy-seed-images
npm run create-test-listing

# Management
npm run clear-database
npm run update-titles
npm run check-user
```

### Cache Management

```bash
npm run clear-cache
npm run clear-cache:listings
npm run clear-cache:listing <listing-id>
npm run clear-cache:brands
```

### User Scripts

```bash
npm run make-admin
npm run reset-users
```

### Partner Import Scripts (platform-specific)

```bash
npm run cipauto:scan -- --pages=24 --env=prod
npm run cipauto:import -- --userId=<UUID> --status=paused --env=prod --limit=10
npm run cipauto:report -- --last --env=prod
```

See platform parser docs for CLI flags, idempotency model, and rollout checklists:

- `../../../docs/parsing/cipauto-import.md`
- `../../../docs/parsing/999md-import.md`

### Backup Scripts

```bash
npm run backup
npm run backup -- --output-dir /path/to/backups
npm run backup -- --keep-days 60
```

All scripts are located in `backend/src/scripts/` and can be executed via npm commands.

---

## 10. SEO & Analytics

### SEO Optimizations

#### Meta Tags

- **Comprehensive metadata** (title, description, keywords) on all pages
- **Open Graph tags** for social media sharing:
  - `og:type`, `og:url`, `og:title`, `og:description`, `og:image`, `og:site_name`, `og:locale`
  - All URLs are absolute (using `NEXT_PUBLIC_SITE_URL`)
  - Image size: 1200×630 pixels
- **Twitter Cards** (`summary_large_image`) with title, description, and image
- **Canonical URLs** for all pages
- **Dynamic meta tags for listings** (`/listings/[id]`):
  - Browser title generated from listing details: brand, model, engine volume, horsepower, fuel, transmission, city, body type, year, price, and site suffix when available
  - Description from listing content (first 160 characters, HTML stripped)
  - Image from listing's main photo or fallback to default OG image
  - URL: `https://your-domain.com/listings/{id}`
- **Static meta tags for key pages**:
  - Homepage (`/`): Category-aware SEO titles and dynamic search titles for brand, model, body type, and tire filters
  - Auth pages (`/sign` with optional `?tab=register` for the registration tab, `/reset-password`): Page-specific descriptions; legacy `/login` and `/register` URLs redirect to `/sign`
  - Legal and info pages (`/terms`, `/privacy`, `/faq`, `/contacts`): Content-specific descriptions
- **Meta description length**: All descriptions are optimized to 110-160 characters (Open Graph recommendation)
- **H1 tags**: All pages have proper `<h1>` tags:
  - Listing pages: Dynamic H1 from vehicle info (brand + model + year) with fallback
  - Homepage: Dynamic H1 for selected brand/model, with category-specific fallback for cars, trucks, moto, and tires
  - Other pages: Page-specific H1 tags

#### Structured Data (Schema.org)

- **Organization Schema** - Business entity information
- **WebSite Schema** - Site structure with SearchAction
- **Vehicle Schema** - Vehicle-specific information for listings
- **Product Schema** - Product information alongside Vehicle schema
- **Offer data** - Included only for listings with a defined price (`price`, `priceCurrency`, `priceValidUntil`)
- **BreadcrumbList Schema** - Navigation structure

#### Technical SEO

- **Robots.txt** - Proper crawling instructions
- **Sitemap** - Backend-generated XML sitemap index at `/sitemap.xml` (proxied from frontend) with child sitemaps:
  - Static pages (homepage, listings, terms, privacy, FAQ, contacts, cookie-settings)
  - Brand and brand+model landing pages in `brands-car.xml`, `brands-truck.xml`, `brands-moto.xml` (listed directly in the root index; no nested sitemap index)
  - Seller board pages (`/board/{slug}`) for active sellers with active listings
  - Active listings by month in `listings-YYYY-MM.xml` — one `<url>` per listing; default-locale canonical in `<loc>`, Russian locale via `xhtml:link` alternates (`hreflang` ro / ru / x-default); `/sitemap.txt` lists both locale URL forms derived from each `<loc>`
  - Cached in Redis under prefix `sitemap:v3:` (1 hour TTL; prefix bumped when XML shape changes); proper XML escaping and Cache-Control headers. Detail: [SITEMAP.md](../features/SITEMAP.md).
- **Image optimization** - WebP format, lazy loading, proper alt text
- **Performance** - Compression, security headers, optimized image sizes

### Google Search Console Setup

1. Go to https://search.google.com/search-console
2. Add property: `https://your-domain.com`
3. Choose verification method: **HTML tag**
4. Copy verification code and add to `NEXT_PUBLIC_GOOGLE_VERIFICATION` in `.env.local`
5. Restart server and verify
6. Submit sitemap: `https://your-domain.com/sitemap.xml`

### Google Analytics Setup

1. Go to https://analytics.google.com/
2. Create account: "Your Platform Name"
3. Create property: "Your Platform Website"
4. Create data stream: Web → `https://your-domain.com`
5. Copy Measurement ID (format: `G-XXXXXXXXXX`)
6. Set `NEXT_PUBLIC_GA_ID` on the frontend service (baked at build time)
7. `GoogleAnalytics.tsx` loads `gtag.js` after idle and sends consented SPA `page_view` via `gtag('config')`; consent defaults stay in `GoogleAnalyticsConsent.tsx`
8. GTM container `GTM-K527X5WK` may stay loaded; do not add a duplicate GA4 auto page_view tag there while direct `gtag.js` is enabled

#### Google Analytics Features

**Consent Mode v2:**

- Implements Google Analytics Consent Mode v2 for GDPR compliance
- Analytics are disabled by default until user grants consent
- Consent can be managed via `/cookie-settings` page
- All events respect user consent preferences

**Tracked Events:**

- `view_item` - When user views a listing detail page
- `search` - When user performs search/filtering
- `select_content` with `content_type: search_tab` - Switching search filter tabs (`basic` / `advanced` / `equipment` / `popular`)
- `select_content` with `content_type: brand` / `model` / … - Selecting values in search multi-select filters (on add)
- `select_content` with `content_type: popular_brand` / `popular_model` - Selecting brands/models on the Popular search tab
- `select_content` with `content_type: popular_body_type` - Expanding a body-type accordion on the Popular tab (cars)
- `select_content` with `content_type: vehicle_type` - Switching car / truck / moto
- `add_to_wishlist` / `remove_from_wishlist` - Favorite management
- `add_to_comparison` / `remove_from_comparison` - Comparison (vehicles or tires)
- `contact_seller` - When user contacts seller (phone/Viber/WhatsApp/Telegram)
- `create_listing` - When user creates a new listing
- `save_filter` - When user saves a search filter
- `login` / `sign_up` - Authentication events
- `select_content` with `content_type: auth_tab` - Switching between login and registration on `/sign`
- `conversion_event_page_view` - Homepage conversion tracking

All events are sent only after user grants analytics consent.

#### Google Ads Conversion Tracking

**Architecture:**
The project uses the recommended approach:

1. **Google Analytics 4 (GA4)** - tracks all user events
2. **Google Ads conversions** - imported from GA4 (the only recommended method)

**Data Flow:**

```
User → Site → GA4 (all events) → Google Ads (only conversions)
```

**Setup Steps:**

1. **Create events in GA4:**
   - Go to Google Analytics → Events → Create Event
   - Mark events as conversions:
     - `conversion_event_page_view` (Homepage view)
     - `sign_up` (User registration)
     - `create_listing` (Listing creation)

2. **Link GA4 to Google Ads:**
   - In Google Ads: Tools & Settings → Linked Accounts
   - Find Google Analytics (GA4)
   - Click "Link" and select your GA4 property
   - Enable "Import conversions from Google Analytics"

3. **Import conversions:**
   - Go to Goals → Conversions
   - Click "+" → Import
   - Select "Google Analytics (GA4)"
   - Select events to import:
     - ✅ `conversion_event_page_view`
     - ✅ `sign_up`
     - ✅ `create_listing`

4. **Configure each conversion:**
   - **Category:** Page views / Registration
   - **Optimization:** Main action
   - **Value:** Use default or from GA4
   - **Attribution:** Data-driven (Recommended)
   - **Conversion window:** 1-90 days depending on conversion type

**Main Conversions:**

- **Homepage view** (`conversion_event_page_view`) - 1 day window, high priority
- **User registration** (`sign_up`) - 30 days window, high priority
- **Listing creation** (`create_listing`) - 90 days window, high priority

**Verification:**

1. Check events in GA4 real-time reports
2. Check conversions in Google Ads (may take 24-48 hours for first data)
3. Use Google Tag Assistant for debugging

**Common Issues:**

- **Conversions not recording:** Check events are sent correctly, verify user consent
- **Data delay:** Normal - GA4 data updates in Google Ads every 3-24 hours
- **Duplicate conversions:** Use only import from GA4, don't configure events directly in Google Ads

For detailed setup instructions, see [Google Ads Help](https://support.google.com/google-ads/answer/1727054).

### Cloudflare Setup (Optional)

**Code is already ready for Cloudflare!** ✅

The backend has `trust proxy: true` configured, which correctly identifies real user IP through Cloudflare.

**Setup Steps:**

1. Register on Cloudflare (free)
2. Add domain
3. Change DNS servers at registrar
4. Configure caching rules (cache `/uploads/*`, bypass `/api/*`)
5. Enable SSL/TLS (Full strict mode)
6. Enable WAF and Bot Protection

See [DEPLOYMENT.md](../guides/DEPLOYMENT.md#72-rendercom-deployment) for CloudFront CDN setup instructions (CloudFront is AWS's CDN service, similar to Cloudflare).

---

## 11. Performance Optimizations

### Database Optimizations

- Comprehensive indexing strategy with partial and composite indexes
- **Search query optimization:**
  - Main search and board: when user selects "newest/oldest" (`sortBy=created_at`), results are ordered by `is_promoted DESC`, then `last_updated_at DESC` (to match the date shown on listing cards). Other sort options use `created_at`, `price`, `year`, or `views` with the same promoted-first rule.
  - Composite indexes for search: `(status, is_promoted, created_at)` with `WHERE status = 'Active'`; sorting by date in UI uses `last_updated_at` for consistency with card display.
  - Index on `vehicles.year DESC` for year-based sorting
  - Selective field selection in queries to reduce data transfer by ~25-40%
- Triggers for automatic updates and cleanup
- Connection pooling (min 5, max 20 connections)
- Full-text search support with GIN indexes (if pg_trgm available)

### Frontend Optimizations

- **Server-side data fetching:** Initial listings data loaded on server using Next.js Server Components and native `fetch` API, improving SEO and initial page load performance
- **Request deduplication:** `React.cache()` wrapper for server-side functions (`fetchBrands`, `fetchModelsByBrands`, `getListings`) eliminates duplicate API calls, reducing initial page load time by ~40-50%
- **Centralized search parameter parsing:** Shared `lib/search/search-params.ts` module provides `buildSearchQuery()` (URL construction, base64 encoding, localStorage fallback for long query strings), `getDefaultFilters()`, URL parameter parsing via `parseSearchParams()`, base64 encoding/decoding, and slug-to-ID conversion via `createBrandResolver` / `createModelResolver`
- **Search filters:** `SearchFilters.tsx` delegates to `useSearchFiltersController` → `search-filters/SearchFiltersForm.tsx` (composed hooks include `useSearchFiltersSync`, `useVehicleType`, `useSearchTabs`, `useFilterHandlers`, `useFilterOptions`). On the home page, `useVehicleType` derives the active vehicle category from URL query params (and `body_types` when present), not from `kupito_vehicle_type` in localStorage; listing grid and search UI stay in sync.
- **Unified listing fetch logic:** Merged `fetchListings` and `handleLoadMore` functions into a single unified function, eliminating ~180 lines of duplicate code
- **Virtualized results grid:** `ListingGrid` renders results through `VirtualizedListingGrid.tsx` using `@tanstack/react-virtual` (`useWindowVirtualizer`). SSR and the first client paint stay on a static grid for hydration safety; after mount, `listing-grid-measure.ts` reads row heights from that markup and `listing-grid-virtual-swap.ts` swaps to the virtualizer with those estimates (before user interaction). Rows are built by `buildVirtualRows.ts` (column count from `useGridColumns` matchMedia breakpoints; one breakpoint-aligned partner banner). Only visible rows plus overscan stay in the DOM, so DOM size no longer grows with the accumulated load-more list. Home scroll restore (`lib/home-scroll-restore.ts`) uses exact saved `scrollY` plus a `min-height` placeholder on `listing-grid-placeholder`; listing-return restore keeps a static grid until restore completes. A repeatable DOM-node/layout-shift audit lives in `scripts/perf/list-perf.mjs` (`npm run perf:list-grid`).
- **Component memoization:** React.memo, useMemo, useCallback for preventing unnecessary re-renders
  - ListingCard wrapped in React.memo for optimal re-render performance
  - Memoized event handlers in Header, SearchFilters, and other interactive components
- **Non-blocking updates:** startTransition for deferring non-urgent state updates, improving INP (Interaction to Next Paint)
  - Favorite toggle operations use startTransition to prevent blocking user interactions
  - Navigation and filter updates wrapped in startTransition
- **Deferred value updates:** useDeferredValue for delaying expensive computations
  - Search query filtering in Dropdown and MultiSelectDropdown components
  - Listing grid updates deferred to prevent blocking during data fetching
- Next.js built-in bundle optimization (removed custom webpack splitChunks configuration)
- **Image optimization with Next.js Image component:**
  - Automatic optimization for external images via `remotePatterns` configuration
  - Conditional `unoptimized` prop for localhost images in development
  - Proper `sizes` attribute for responsive image loading - Next.js automatically generates appropriate image sizes for mobile and desktop
  - Optimized quality settings: 75% for listing cards (responsive srcset up to 1080px via `listing-card-image.ts`), 70% for management cards (900px), 75% for detail pages (1200px)
  - Priority loading for first 4 visible images in grid; carousel neighbor preload only on those cards
  - Next.js Image component handles responsive image loading automatically via `srcSet` based on `sizes` attribute
  - Improved sizes attributes for better responsive image selection across breakpoints
- **Image preview system:** Simplified, efficient image preview and photo viewer system
  - **Thumbnail switching:** Instant switching when images are in browser cache (thumbnails and preview use same URL)
  - **Simple preloading:** Adjacent listing-card photos preloaded with responsive `srcset`/`sizes` matching `next/image`; listing page preview uses `new window.Image()` with staggered delays — browser manages caching
  - **Loading states:** Listing page hero keeps the confirmed layer visible while a pending image loads; large spinner only during pending navigation, with `useLoadingState` show/min display delays (120ms). See `image-preview.md`.
  - **Modal viewer:** Full-screen photo viewer with keyboard navigation and swipe gestures
  - **Performance:** 80% code reduction, instant cache switching, no artificial delays
  - See [image-preview.md](../features/image-preview.md) for complete documentation
  - **Image load Sentry diagnostics:** After retry exhaustion, `reportImageLoadFailure` calls `GET /api/diagnostics/image-status` (Nest `DiagnosticsModule`) for an allowlisted server-side `HEAD` to the failing URL; see `image-preview.md` and `DEPLOYMENT.md` (CloudFront CORS for `/uploads/*`).
- **Race condition prevention:** Loading states and request guards to prevent duplicate API calls
  - Favorite toggle button disabled during operation with visual feedback
  - Ref-based guards to prevent concurrent requests
- Third-party scripts optimization: GTM loads after idle (`lazyOnload`); GA page views via `dataLayer` (no separate `gtag.js` on the critical path)
- **INP (Interaction to Next Paint) optimizations for mobile:** Deferred analytics (search/select_content) via requestIdleCallback; single rAF for scroll restore after router.replace; rAF-throttled scroll handlers with state guards (ScrollToFiltersButton, useSearchTabs, BackgroundDecorations, usePageScroll); GTM loaded after idle; parse cache for ListingGrid search params; chunked dropdown render and precomputed lowerLabel for filter options; listing card blur placeholders decoded off the main thread via a dedicated Web Worker (`lib/blurhash-worker.ts`) with sync fallback. See [inp-validation.md](../engineering/inp-validation.md) for post-deploy validation.
- **Resource hints optimization:**
  - Static preconnect to API domain in `layout.tsx` for faster image loading (server-rendered, no JS required)
  - DNS-prefetch and preconnect for Google Tag Manager (server-rendered in `layout.tsx`)
  - Resource hints are included in initial HTML, allowing browsers to establish connections immediately
- Set-based lookups in MultiSelectDropdown for O(1) performance instead of O(n) with Array.includes()
- Optimized SortDropdown with memoized sort key resolution
- URL parameter synchronization for search filters and sorting
- Lazy loading for images with priority for above-the-fold content
- Skeleton loaders for improved UX
- **PWA Support:** Service Worker (`frontend/public/sw.js`) with selective caching
  - Static assets (CSS, JS, images, fonts) cached in a dedicated static cache
  - Small catalog API responses (`/api/brands`, `/api/cities`, brand models) cached with 1 hour TTL (stale-while-revalidate) when requested same-origin
  - Navigations and other non-static same-origin responses are not cached (network-only; offline navigations fall back to `/offline`)
  - Logout posts `CLEAR_USER_CACHE` to delete data/runtime caches
  - Precache on install: `/offline` only (not the home route)
  - Automatic cache cleanup for expired entries and old cache names on activate
  - Full-page reload after a waiting worker activates only when the user confirms an update (`ServiceWorkerRegistration`)
  - Offline page support
  - PWA installation support for iOS and Android with tabbed modal interface
  - Installation instructions with keyword highlighting and browser compatibility notes
- Optimistic UI updates for car comparison (no flickering on item removal)
- Cached filter loading to prevent skeleton flickering on tab switches
- Zustand stores with persist middleware for favorites and comparisons (localStorage)
- **Collapsible description block:** Long listing descriptions are automatically collapsed to 400px (including padding, title, text, and button) with expand/collapse functionality
  - Smooth animation (0.4s ease-in-out) between collapsed (400px) and expanded (full height) states
  - Gradient overlay at bottom when collapsed to indicate more content
  - Button positioned absolutely at bottom with z-index above gradient
  - Auto-scroll to block start (with 110px offset for header) when collapsing
  - Skeleton loader reserves 400px height during initial load to prevent CLS
  - Height measurement after content hydration (100ms delay) to account for formatted text
  - Component: `components/ListingPage/ListingPageDescription.tsx`

### Redis Optimizations

- SCAN instead of KEYS for better performance
- Batch operations
- Proper TTL management

### Code Quality

- TypeScript strict mode enabled in backend
- CI/CD automation
- Automated bundle analysis
- **ESLint with custom rules:**
  - `no-hardcoded-text` - Enforces use of translation keys instead of hardcoded text
  - `import/order` - Ensures consistent import ordering
  - TypeScript and React rules for code quality
  - See [linting.md](../engineering/linting.md) for complete linting guide

---

## 12. Project Restart

### Full Restart

```bash
# Stop all processes (Ctrl+C in terminals)

# Install/update dependencies
npm run install:all

# Ensure database is running
docker compose up -d

# Create uploads folder (if needed)
mkdir -p backend/uploads

# Start both servers
npm run dev
```

### Quick Restart

If already running:

1. In backend terminal: `Ctrl+C`, then `npm run start:dev`
2. In frontend terminal: `Ctrl+C`, then `npm run dev`

Or use `npm run dev` in root - it will start both servers.

### Verification

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- API check: http://localhost:4000 (should show "Kupito API v1.0")

---

## Additional Resources

- **API Documentation:** Swagger available at `/api/docs` (when running in non-production)
- **Project README:** See [README.md](../../README.md) in project root
- **Deployment Guide:** See [DEPLOYMENT.md](../guides/DEPLOYMENT.md) for production deployment
- **Feature docs:** [seller-listings-board.md](../features/seller-listings-board.md), [paid-promotion.md](../features/paid-promotion.md), [image-preview.md](../features/image-preview.md), [smart-selection.md](../features/smart-selection.md), [ui-components.md](../features/ui-components.md), [TODO.md](../features/TODO.md)

---

## 13. CI/CD Configuration

Complete guide for Continuous Integration and Continuous Deployment of PPCSL core and platform repositories (kupito.club and future platforms).

### 13.1. Overview

The CI/CD system is designed to:

- **Validate every pull request** (lint, tests, build) on both repos — no merge to `main` without a green CI.
- **Run jobs in parallel** (prepare → frontend-check + backend-check + audit → deploy) for fast feedback.
- **Gate production deploys** behind successful CI via Render Deploy Hooks, not direct push auto-deploy.
- **Propagate core changes** to platform repos through a PR (not a direct push), so submodule bumps go through the same CI gate as any other change.
- **Keep platform files as the single source of truth**: `npm run prepare:build` is called identically in local `release-check` and in CI, eliminating drift.

Both workflows set `ONNXRUNTIME_NODE_INSTALL=skip` so `onnxruntime-node` does not run NuGet downloads for optional GPU binaries during `npm ci` (plate masking uses CPU only).

Node version is pinned via `.nvmrc` at the repository root (`node-version-file: .nvmrc` in `actions/setup-node`), so local, CI, and Render run the same major version.

### 13.2. Architecture

```
PPCSL (core repository)
  on: push [main, develop] | pull_request [main, develop]
    ├── backend-test     (lint, unit, integration)
    ├── frontend-test    (lint, styles, format, unit)
    └── typecheck        (needs: backend-test, frontend-test)
            │
            └── on push main only:
                sync-to-locales
                  └── opens a PR in each platform repo
                      (kupito.club, …) bumping submodule pointer

Platform repo (kupito.club)
  on: push [main] | pull_request [main]
    ├── prepare              (checkout + npm ci + npm run prepare:build + verify files)
    ├── frontend-check       (lint, styles, format, typecheck, knip, test, next build)   needs: prepare
    ├── backend-check        (lint, format, unit, integration, nest build)               needs: prepare
    ├── audit                (npm audit --audit-level=critical)                          needs: prepare
    ├── frontend-lighthouse  (optional; vars.LIGHTHOUSE_URL)                               needs: prepare, frontend-check
    ├── frontend-e2e-p0      (optional; vars.PLAYWRIGHT_BASE_URL, mobile @p0)            needs: prepare, frontend-check
    └── deploy               (only on push main, after frontend-check + backend-check)
          └── POST Render deploy hooks (frontend + backend)
```

Platform `frontend-check` runs `npm run typecheck` and `npm run knip` explicitly. PPCSL core keeps a separate `typecheck` job after tests; platform repos rely on `next build` / `nest build` for compile coverage in addition to `typecheck` on the frontend.

### 13.3. PPCSL Core CI/CD

**Workflow:** `.github/workflows/ci.yml` in the PPCSL repository.

**Jobs:**

1. **backend-test** — installs deps, runs ESLint (`lint:check`), prettier (`format:check`), unit tests (`npm test`) and integration tests (`npm run test:integration`) against service containers (Postgres 15, Redis 7).
2. **frontend-test** — installs deps, runs ESLint (`lint`), Stylelint (`lint:styles`), prettier (`format:check`), Jest (`npm test -- --passWithNoTests`).
3. **typecheck** — depends on both tests; runs `npx tsc --noEmit` for frontend and backend (sanity check; builds live in platform repos).
4. **sync-to-locales** — depends on typecheck; only on `push: main`. Opens a pull request in each registered platform repo with the new submodule pointer, a commit list (`git log --oneline PREV..CURRENT`) inlined in the PR body, and a branch name `chore/update-core-<short-sha>`. No direct push to `main`, so platform `main` branch protection stays intact.

**Required secrets:**

- `PAT_TOKEN` (required for `sync-to-locales`) — Personal Access Token with `repo` scope (and `workflow` scope to open PRs that touch workflow files if any). If not set, the sync job is skipped with a warning.

### 13.4. Platform CI/CD (kupito.club)

**Workflow:** `.github/workflows/ci.yml` at the kupito.club root.

**Jobs:**

1. **prepare** — checkout with submodules, `npm ci` at the root, `npm run prepare:build`, then verifies that all expected files exist in the submodule (locales RO/RU/EN, `theme.json`, `config/site.ts`, `config/parsers.ts`, frontend and backend parsers catalog, `public/logo.png`, `watermark/logo.png`).
2. **frontend-check** (needs prepare) — `npm ci` in `core/frontend`, restores `actions/cache` for `core/frontend/.next/cache`, runs lint / lint:styles / format:check / typecheck / knip / test / `next build`, verifies `.next` directory exists.
3. **backend-check** (needs prepare) — runs with Postgres + Redis services, `npm ci` in `core/backend`, runs lint:check / format:check / unit / integration / `nest build`, verifies `dist/main.js`.
4. **audit** (needs prepare) — runs `npm audit --omit=dev --audit-level=critical` for frontend and backend (blocking).
5. **frontend-lighthouse** (optional, needs prepare + frontend-check, `if: vars.LIGHTHOUSE_URL != ''`) — Lighthouse CI against deployed URLs.
6. **frontend-e2e-p0** (optional, needs prepare + frontend-check, `if: vars.PLAYWRIGHT_BASE_URL != ''`) — `npm run test:e2e:p0 -- --project=mobile` with `PLAYWRIGHT_SKIP_WEBSERVER=1`.
7. **deploy** (needs frontend-check + backend-check, `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`) — POSTs to `RENDER_FRONTEND_DEPLOY_HOOK` and `RENDER_BACKEND_DEPLOY_HOOK`. If a hook secret is missing, that step is skipped and Render's own auto-deploy is expected as a fallback.

`prepare:build` is the single source of truth: the same script runs locally (`npm run release-check`, `release-check:fast`) and in every CI job. No inline copy script duplicates it anywhere. The script never uses `rm -rf` against `core/frontend/lib/config` or `core/frontend/lib/locales`, so core-only files in those directories (for example `parsers.ts` kept under `!frontend/lib/config/parsers.ts` in `core/.gitignore`) are never accidentally wiped.

Caches:

- `actions/setup-node` with `cache: 'npm'` and a multi-path `cache-dependency-path` (root, `core/frontend`, `core/backend` lockfiles).
- `actions/cache@v5` for `core/frontend/.next/cache`, keyed on the frontend lockfile plus a content hash of TS/TSX sources. Next.js uses this to skip unchanged module work.

**Required secrets:**

- `PAT_TOKEN` (required) — Personal Access Token with `repo` scope for cloning the private PPCSL submodule. `GITHUB_TOKEN` alone is not enough for private submodules.
- `API_URL` — backend API URL injected as `NEXT_PUBLIC_API_URL` during `next build`.
- `RENDER_FRONTEND_DEPLOY_HOOK`, `RENDER_BACKEND_DEPLOY_HOOK` — Render Deploy Hook URLs for frontend and backend services. If absent, CI skips the explicit deploy and Render's own auto-deploy on `push: main` still runs.

**Branch protection for `main`** is documented in the platform repo at `docs/deployment/branch-protection.md` (required checks: `Prepare platform files`, `Frontend check`, `Backend check`, `Dependency audit`; optional: `Frontend Lighthouse`, `Frontend E2E @p0` when repo variables are set).

`actions/checkout@v5` is configured with `token: ${{ secrets.PAT_TOKEN || secrets.GITHUB_TOKEN }}` across all jobs so private submodules resolve consistently.

### 13.4.1. Render.com Deployment Configuration

For deploying kupito.club on Render.com, configure the following:

**Root Directory:** (leave empty)

**Environment Variables:**

- `GITHUB_PAT` - Personal Access Token with `repo` scope for accessing private PPCSL submodule
- `NEXT_PUBLIC_COUNTRY` - Set to your platform's country code (e.g. `md` for Moldova)
- `NEXT_PUBLIC_SITE_URL` - Set to `https://kupito.club`
- `NEXT_PUBLIC_API_URL` - Backend API URL

**Build Command:**

```bash
git config --global credential.helper store && echo "https://x-access-token:${GITHUB_PAT}@github.com" > ~/.git-credentials && rm -rf core .git/modules/core && git submodule update --init --recursive && npm run prepare:build && cd core/frontend && npm ci && npm run build
```

**Start Command:**

```bash
cd core/frontend && npm start
```

**Important:** The Build Command must:

1. Configure git credentials for accessing private submodule
2. Initialize and update the submodule
3. Copy platform-specific files via `npm run prepare:build` (frontend locales ro/ru/en, backend locales, theme, config, assets)
4. Install dependencies and build the application

**Memory tuning (Next.js frontend):** To avoid out-of-memory restarts on Render.com (e.g. when traffic is low but health checks run frequently), the app uses: `cacheMaxMemorySize: 25MB` in next.config.js, `minimumCacheTTL: 86400` for image optimization, and Sentry server `tracesSampleRate: 0.2`. See [SENTRY.md](../guides/SENTRY.md) for Sentry server config.

### 13.4.2. Render.com Backend Deployment Configuration

For deploying kupito.club backend on Render.com, configure the following:

**Root Directory:** (leave empty)

**Environment Variables:**

- `GITHUB_PAT` - Personal Access Token with `repo` scope for accessing private PPCSL submodule
- `NODE_ENV` - Set to `production`
- `PORT` - Automatically set by Render (use `process.env.PORT || 4000` in code)
- `DB_HOST` - PostgreSQL database host
- `DB_PORT` - PostgreSQL port (usually `5432`)
- `DB_USERNAME` - Database username
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name
- `JWT_SECRET` - Secure random key for JWT tokens
- `FRONTEND_URL` - Frontend URL (e.g., `https://kupito.club`)
- `API_URL` - Backend API URL (e.g., `https://kupito-backend.onrender.com`)
- `AWS_ACCESS_KEY_ID` - AWS S3 access key (required for file storage)
- `AWS_SECRET_ACCESS_KEY` - AWS S3 secret key (required for file storage)
- `AWS_S3_BUCKET_NAME` - S3 bucket name
- `AWS_REGION` - AWS region (e.g., `eu-north-1`)
- Optional listing video: MediaConvert account endpoint, queue ARN, role ARN, webhook SNS → `POST /api/webhooks/mediaconvert`, plus optional `AWS_CLOUDFRONT_URL`, `LISTING_VIDEO_WATERMARK_S3_URI`, `VIDEO_MAX_SIZE_BYTES`, `VIDEO_MAX_DURATION_SEC` — see [listing-video-production-setup-ru.md](../guides/listing-video-production-setup-ru.md) (operators, Russian) and [listings.md](../features/listings.md)
- `REDIS_HOST` - Redis host (if using external Redis)
- `REDIS_PORT` - Redis port (if using external Redis)
- `ONNXRUNTIME_NODE_INSTALL` - Set to `skip` on Render (or inline in the Build Command). Skips `onnxruntime-node` postinstall NuGet downloads for optional GPU binaries; plate masking uses CPU only. Without it, backend `npm ci` may fail with `ETIMEDOUT` to `api.nuget.org`.

**Build Command:**

```bash
git config --global credential.helper store && echo "https://x-access-token:${GITHUB_PAT}@github.com" > ~/.git-credentials && rm -rf core .git/modules/core && git submodule update --init --recursive && npm ci && npm run prepare:build && cd core/backend && ONNXRUNTIME_NODE_INSTALL=skip npm ci && npm run build
```

**Start Command:**

```bash
cd core/backend && npm run start:prod
```

**Important:** The Build Command must:

1. Configure git credentials for accessing private submodule
2. Initialize and update the submodule
3. Install dependencies and build the backend application

**After First Deployment:**

1. Run database migrations via Render Shell:

   ```bash
   cd core/backend && npm run migration:run:prod
   ```

2. Load brands and models:

   ```bash
   cd core/backend && npm run seed:all-brands:prod
   ```

3. Create admin user:
   ```bash
   cd core/backend && npm run make-admin:prod -- --email your-email@example.com --password your-secure-password
   ```

### 13.5. Workflow Overview

**Core change lands in production:**

1. Developer opens a PR into `PPCSL/main` — core CI runs backend-test, frontend-test, typecheck.
2. After review and merge to `PPCSL/main`, `sync-to-locales` opens a PR in each platform repo (e.g. `kupito.club`) titled `chore: update PPCSL core to <short-sha>` with the core changelog in the body.
3. The platform PR is validated by the full platform CI (prepare + frontend-check + backend-check + audit).
4. After review and merge to platform `main`, the `deploy` job POSTs Render deploy hooks, and Render rebuilds the frontend and backend services.

**Platform-specific change (translation/theme/config/assets):**

1. Developer opens a PR into `kupito.club/main` editing root `locales/`, `theme/`, `config/`, or `assets/`.
2. Platform CI validates the PR (prepare step verifies that `prepare:build` still produces all required files).
3. After review and merge, the `deploy` job triggers Render hooks.

Pre-push hook (husky) runs `npm run release-check:fast` locally (prepare:build + lint + unit tests, no integration, no build) to catch the most common CI failures before pushing. It is skipped when `CI=true` or `HUSKY=0`.

### 13.6. Troubleshooting

**Submodule Update Fails:**

- Ensure `PAT_TOKEN` secret is set in repository settings
- PAT must have `repo` scope to push to other repositories
- To create PAT: GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)

**Submodule Checkout Fails in kupito.club (Repository not found):**

- Ensure `PAT_TOKEN` secret is set in kupito.club repository settings
- The `actions/checkout@v5` action must be configured with `token: ${{ secrets.PAT_TOKEN || secrets.GITHUB_TOKEN }}`
- `GITHUB_TOKEN` may not have sufficient permissions to access private submodules
- PAT must have `repo` scope to access private repositories
- Verify that the submodule URL in `.gitmodules` is correct and points to the right repository
- Add secret: Repository Settings → Secrets and variables → Actions → New repository secret → Name: `PAT_TOKEN`

**Build Fails After Submodule Update:**

- Verify copy commands in workflow are correct
- Check file paths match repository structure
- Ensure files exist in platform repository

**Tests Fail in Platform CI/CD:**

- Platform CI runs lint, unit + integration tests, and builds in `frontend-check` and `backend-check`. If a job is too expensive, adjust it intentionally rather than assuming CI is build-only.
- Reproduce locally with `npm run release-check`. For a faster loop (no integration tests, no build), use `npm run release-check:fast`.

**Why No Build in PPCSL Core:**

- Build requires platform-specific files (translations, theme, config, assets) that do not exist in core.
- Build in core would use placeholder/default values, not reflecting real production output.
- Build runs in platform repositories (e.g. kupito.club) where `prepare:build` fills those files in first.
- `tsc --noEmit` in core is kept as a quick sanity check; real type coverage is provided by platform `next build` and `nest build`.

**Deploy Hook Did Not Fire:**

- Check that `RENDER_FRONTEND_DEPLOY_HOOK` / `RENDER_BACKEND_DEPLOY_HOOK` secrets are set on the platform repo (Repository Settings → Secrets and variables → Actions).
- The `deploy` job runs only on `push: main` after both `frontend-check` and `backend-check` pass — red CI keeps a failing main out of production.
- If a hook secret is missing, the step logs a skip message and Render's own auto-deploy takes over (fallback).
- For full-stack gating, disable Render's "Auto-Deploy" on the service so deploys fire only via the webhook from CI.

**Submodule Update PR Not Created:**

- Ensure `PAT_TOKEN` is set on the core repo with `repo` scope.
- The PR is opened by `sync-to-locales` only on `push: main` of core; `pull_request` events do not open platform PRs.
- If a PR for the same branch name already exists (for example a stale `chore/update-core-<short-sha>`), the API call fails softly and logs `PR creation failed (branch may already have an open PR)`.

### 13.7. Best Practices

1. **Every change goes through a PR** — both PPCSL and kupito.club require CI green on `main`.
2. **Never push directly to `main`** in either repo; configure branch protection (see `docs/deployment/branch-protection.md` in the platform repo).
3. **`npm run prepare:build` is the single source of truth** for platform files. Do not add ad-hoc `cp -r`/`rm -rf` steps in CI or docs.
4. **Pin Node with `.nvmrc`.** Both repos use `node-version-file: .nvmrc`; keep Render pinned to the same major.
5. **Keep `release-check` and CI aligned.** If you add a validation step, add it to `release-check` too, and vice versa.
6. **Let core changes propagate via PR**, not direct push. The auto-PR from `sync-to-locales` replaces any "push submodule bump" pattern.
7. **Gate Render on CI.** Trigger deploys from the CI `deploy` job via Render Deploy Hooks; disable Render auto-deploy on the service so a red CI cannot ship.
8. **Monitor the audit job.** `npm audit --omit=dev --audit-level=critical` runs on each push and blocks merges when critical vulnerabilities are found.
9. **Keep caches effective.** `actions/setup-node` (npm) and `actions/cache` for `.next/cache` speed up CI significantly; do not key caches on branch names.
10. **Review deploy logs on Render.** The GitHub `deploy` job only triggers the hook; actual build output lives on Render.

For detailed implementation, see [Multi-Repository](./multi-repository.md).

---

## 14. Paid Promotion Feature

The platform includes a paid promotion feature (MVP) that allows users to promote their listings for higher visibility in search results.

### Overview

- **Status:** MVP fully implemented
- **Documentation:** See [paid-promotion.md](../features/paid-promotion.md) for complete documentation
- **Access Control:** Controlled via `PROMOTION_ACCESS` environment variable

### Key Features

- Promoted listings appear first in search results
- Visual highlighting with green border and "Promoted" tag
- Promotion periods: 1, 7, 14, or 30 days (unlimited for admins)
- Promotion time is frozen when listing is paused
- Promotion history tracking
- Automatic expiration of expired promotions
- Server-side pagination and filtering in admin panel

### Testing

Comprehensive test coverage for promotion features:

- **P0 (Critical):** `togglePromotion`, access control, validation
- **P1 (Important):** Promotion history, sorting, pause/resume behavior

Run tests:

```bash
cd core/backend && npm run test -- listings.service.spec.ts
```

### Related Documentation

- [paid-promotion.md](../features/paid-promotion.md) - Complete promotion feature documentation
- [listings.service.spec.ts](../../backend/src/listings/listings.service.spec.ts) - Test suite

---

**Last Updated:** 2026-05-25
**Version:** 1.14

### Recent Updates

- **Listing seller phones and VIN (2026-04):** Search and listing payloads mask seller phone fields; full numbers via `GET /api/listings/:id/phones` (guest hash or JWT user, hourly distinct-listing caps). Full VIN via `GET /api/listings/:id/vin` (JWT, hourly distinct-listing cap). Phone validation uses `libphonenumber-js` on backend and in `frontend/lib/phone/`.
- **Slug-based URLs & SEO Improvements (2025-12-17):**
  - Implemented slug-based URLs for brand and model filters (`?brand=toyota&model=yaris`) for better SEO and user-friendly URLs
  - Added utility functions `createSlug()` and `slugToName()` in `lib/utils/utils.ts` for URL-friendly text conversion
  - Updated sitemap to include brand landing pages (`/?brand={slug}`) and brand-model combinations (`/?brand={slug}&model={slug}`)
  - Enhanced SavedFiltersList to use slug-based URLs when applying saved filters
  - Sitemap moved to backend (NestJS): sitemap index + child sitemaps (pages, `brands-{car|truck|moto}`, sellers, listings by month), Redis cache, frontend rewrites
  - Fixed scroll restoration bug on homepage that was overwriting restored scroll position
- **Core Web Vitals & INP Optimizations (2025-01-29):**
  - Implemented startTransition for non-blocking state updates, improving INP (Interaction to Next Paint)
  - Added useDeferredValue for deferred search filtering and listing updates
  - Optimized image quality and sizes: reduced thumbnail quality to 65% (800px), improved responsive sizes attributes
  - Added priority loading for first 8 visible images in grid to improve LCP
  - Enhanced component memoization: React.memo for ListingCard, useCallback for all event handlers
  - Fixed race conditions in favorite toggle with loading states and request guards
  - Optimized SearchFilters: Complete refactoring into 5 hooks and 3 components, reducing from 1796 to 473 lines (73% reduction), improved maintainability and testability
- **INP mobile follow-up (2026-02):**
  - Deferred analytics (searchDeferred, selectContentDeferred, pageScrollDeferred) and memoized consent/currency in analytics.ts
  - Single requestAnimationFrame for scroll restore after filter/sort navigation (useFilterHandlers, SearchFilters, SortDropdown)
  - rAF-throttled scroll handlers with early-exit on unchanged state (ScrollToFiltersButton, useSearchTabs, BackgroundDecorations, usePageScroll)
  - GTM load after requestIdleCallback (2.5s); lower Sentry replay sampling on mobile viewport
  - ListingGrid: parsed search params cache (keyed by searchParamsString + vehicleType), deferred viewItemList; ListingCard prefetch
  - MultiSelectDropdown/Dropdown: precomputed lowerLabel for options, chunked render (first 50 then rAF to full list)
  - KPI and validation: lib/performance/inp-kpi.ts (targets, observer), [inp-validation.md](../engineering/inp-validation.md) for GSC validation steps
- **Listing grid virtualization (2026-06):**
  - `VirtualizedListingGrid.tsx` with `@tanstack/react-virtual` (`useWindowVirtualizer`); row model in `buildVirtualRows.ts`, column breakpoints in `useGridColumns.ts`
  - Static CSS grid on SSR/first paint; `listing-grid-measure.ts` + `listing-grid-virtual-swap.ts` swap to the virtualizer after mount (listing-return restore keeps static grid until `scrollY` is applied)
  - Home scroll restore after listing detail uses `lib/home-scroll-restore.ts` (exact saved `scrollY` + grid min-height placeholder, same path as reload restore)
  - Resize handlers coalesced via `lib/resize-coalesced.ts` (search tabs, tab indicator, hint tooltips, virtualizer)
  - LCP priority and carousel neighbor preload on first 4 visible cards; link prefetch on first 4; popular body-type filter icons served as WebP with long-cache headers
  - Repeatable audit: `npm run perf:list-grid` → `core/frontend/.perf-audit/list-perf.json`
- **Performance Optimizations (2025-01):**
  - Migrated initial data fetching to Server Components for improved SEO and initial page load
  - Optimized third-party scripts (Google Analytics, Google Tag Manager) with `lazyOnload` strategy
  - Enhanced image optimization with proper Next.js Image configuration
  - Removed custom webpack configuration, relying on Next.js built-in optimizations
- Added comparison feature (vehicles and tires; up to 3 listings per category)
- Added status filters with counters on My Listings page
- Added tab counters on Favorites page
- Added breadcrumbs navigation on key pages
- Optimized filter loading to prevent skeleton flickering
- Comprehensive test coverage across frontend and backend (see Test Statistics above)
