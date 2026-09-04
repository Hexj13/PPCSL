---
title: Core documentation
owner: platform
tags:
  - type/readme
  - domain/docs
  - scope/core
  - status/active
---

# PPCSL Core Documentation

Documentation for **PPCSL (Platform-Portable Car Sales Logic)** — universal core for building car marketplaces.

- **Structure and principles:** [documentation-architecture.md](./documentation-architecture.md) | **Migration report:** [docs/documentation-refactor-report.md](../../docs/documentation-refactor-report.md) (in platform repo)
- **Reference:** [reference/](./reference/) — [popular-brands-sync](./reference/popular-brands-sync.md), [platform-assets](./reference/platform-assets.md), [brands-models master plan](./reference/brands-models-master-plan.md), [SEO audit](./reference/seo-audit.md), analytics
- **Operations:** [operations/](./operations/) — [SMTP email setup](./operations/smtp-email-setup.md) ([RU](./operations/smtp-email-setup-ru.md)), [User action logging](./operations/user-action-logging.md), [Sentry launch checklist](./operations/sentry-launch-checklist.md), [Postgres query baseline](./operations/postgres-query-baseline.md), [Postgres backup and restore](./operations/postgres-backup-restore.md), deploy, monitoring
- **ADR:** [architecture/adr/](./architecture/adr/) — architecture decision records

## Documentation structure

### [`architecture/`](./architecture/)

**System architecture** — how the multi-platform system is built

- **[architecture-overview.md](./architecture/architecture-overview.md)** — **START HERE**
- [multi-repository.md](./architecture/multi-repository.md) — Core + Platform repos
- [backend-overview.md](./architecture/backend-overview.md) — Backend monolith, stack, modules, background jobs
- [backend-layers.md](./architecture/backend-layers.md) — Backend layered architecture (use cases, domain)
- [scripts-architecture.md](./architecture/scripts-architecture.md) — **CRITICAL**
- [known-issues.md](./architecture/known-issues.md) — Known issues
- [e2e-test-architecture.md](./architecture/e2e-test-architecture.md) — Playwright E2E layers and coverage matrix
- [auth-jwt-invalidation-followup.md](./architecture/auth-jwt-invalidation-followup.md) — Planned access JWT invalidation after password change/reset
- [technical.md](./architecture/technical.md) — Technical details

### [`guides/`](./guides/)

**Guides** — platform creation, deploy, service setup

- **[platform-checklist.md](./guides/platform-checklist.md)** — **Checklist for new platforms**
- [platform-guide.md](./guides/platform-guide.md) — Setup and development (GA, GTM, Sentry)
- [google-oauth-setup-ru.md](./guides/google-oauth-setup-ru.md) — Google Sign-In (GIS), cookies, env (Russian operators)
- [facebook-login-setup-ru.md](./guides/facebook-login-setup-ru.md) — Facebook Login, cookies, env (Russian operators)
- [telegram-auth-setup-ru.md](./guides/telegram-auth-setup-ru.md) — Telegram Login Widget, cookies, env (Russian operators)
- [auth-cookie-session.md](./guides/auth-cookie-session.md) — Cookie-only auth JSON, env alignment, one-time re-login note
- [listing-video-production-setup-ru.md](./guides/listing-video-production-setup-ru.md) — Listing video on production (AWS, Render; Russian operators)
- [sentry.md](./guides/sentry.md) — Sentry setup and monitoring
- [logging.md](./guides/logging.md) — Structured Sentry payloads, request correlation, sanitization
- [deployment.md](./guides/deployment.md) — Deploy (optional Telegram support bot)
- [local-development.md](./guides/local-development.md) — Local development
- [e2e-playwright-standards.md](./guides/e2e-playwright-standards.md) — Playwright E2E standards for this project
- [frontend-data-fetching.md](./guides/frontend-data-fetching.md) — Client list/pagination hooks (no React Query in layout)
- [frontend-api-error-handling.md](./guides/frontend-api-error-handling.md) — `X-Skip-Error-Handling`, `useApiErrorToast`
- [react-compiler-evaluation.md](./guides/react-compiler-evaluation.md) — Opt-in React Compiler (`REACT_COMPILER=true`)
- [search-filter-limits.md](./guides/search-filter-limits.md) — Brand/model selection limits in search
- [quick-start-ru.md](./guides/quick-start-ru.md) — Quick start (Russian)
- [mobile-app-ru.md](./guides/mobile-app-ru.md) — Android app via PWA + TWA (Bubblewrap, Google Play; Russian operators)
- [linting.md](./engineering/linting.md) — Linting and code quality (single source, including platform-neutral core)
- [inp-validation.md](./engineering/inp-validation.md) — INP validation checklist

**Order:** platform-checklist → platform-guide → deployment. Local: local-development → quick-start-ru.

### [`analytics/`](./analytics/)

**Analytics**

- [ga4-events.md](./analytics/ga4-events.md) — GA4 events and architecture (Sentry in [guides/sentry.md](./guides/sentry.md))

### [`features/`](./features/)

**Feature documentation** — components and functionality. Current decision: keep active feature docs here until domain clusters are ready to move into `domains/`.

- [search-title-url.md](./features/search-title-url.md) — Search page URL and title (slugs, diacritics)
- Approximate price in default currency (≈ EUR) — FXRatesAPI, daily cron, listing enrichment, price sorting in default currency; env: `FXRATESAPI_API_KEY`, `DEFAULT_CURRENCY` (see [technical.md](./architecture/technical.md) §6 Exchange Rates)
- [image-preview.md](./features/image-preview.md) — Image preview system (card carousel vs listing hero layers, modal; blurhash; `image_blur_hashes` + backfill scripts)
- [overlay-back-navigation.md](./features/overlay-back-navigation.md) — System Back closes modals, bottom sheets, and photo viewer before route navigation (overlay history stack)
- [listings.md](./features/listings.md) — Optional listing video (seller upload, transcoding) and partner-import video-from-URL
- [infocar-history-section.md](./features/infocar-history-section.md) — Infocar report card + on-site VIN history (two cards, RO/RU links)
- [ai-listing-report-ru.md](./features/ai-listing-report-ru.md) — Listing AI analysis (Gemini, PDP modal, RU spec: API, cache, prompts). Clear persisted rows: `npm run clear-listing-ai-reports(:prod)` from `core/backend` ([scripts.md](../backend/docs/scripts.md)); Render steps: platform repo [`docs/deployment/production-deployment.md`](../../docs/deployment/production-deployment.md) §2.3.
- Listing seller phones and full VIN — masked in public listing payloads; optional reveal on the listing page (eye control or Contact action card) with per-viewer Redis rate limits (`GET /api/listings/:id/phones`, `GET /api/listings/:id/vin`); see [technical.md](./architecture/technical.md) § API Reference → Listings
- [loading-states.md](./features/loading-states.md) — Loading states
- [cross-tab-sync.md](./features/cross-tab-sync.md) — Favorites, comparison, listing status, and cookie-based auth session across tabs (UI: `BroadcastChannel` + storage; auth: `storage` on auth keys — see doc)
- [auth-onboarding-gates.md](./features/auth-onboarding-gates.md) — Mandatory phone verification and business company onboarding (middleware, client guards, verify-phone branching)
- [paid-promotion.md](./features/paid-promotion.md) — Paid promotion
- [partner-program.md](./features/partner-program.md) — Platform partners, bonus balance, partner promotion flow, footer partner logos, public `/partners` and `/investors` pages (sitemap / noindex)
- [my-listings-page.md](./features/my-listings-page.md) — My listings filters, badge counts, loading behavior
- Assign listing to user (admin) — on `/listings/new` admin can set listing owner UUID; real-time validation (GET `/api/admin/validate-assign-user/:userId`), backend checks (existence, active, listing limit)
- Admin edit listings — on the admin listings tab, admin can open `/listings/[id]/edit` and edit any listing (including `Closed`), regardless of ownership. Backend bypasses ownership and `Closed` restrictions only for JWT users with role `Admin`. In edit form, `vehicleType` switcher is available only for admins. For editing VIN, admin requests full VIN via `GET /api/listings/:id?includeFullVin=1`.
- [admin-parsing-ru.md](./features/admin-parsing-ru.md) — Russian feature spec for the admin Parsing tab (PLP/PDP history, manual runs, scheduler, parser rollout). English operator notes for `ADMIN_PARSING_*` env: [scripts.md](../backend/docs/scripts.md) (section **Admin parsing (Nest runtime)**).
- [parsing-framework.md](./features/parsing-framework.md) — Generic parsing runtime in core (catalog contract, admin orchestration, schedules, parser CLI runner)
- Platform parser docs (kupito.club): [docs/parsing/cipauto-import.md](../../docs/parsing/cipauto-import.md), [docs/parsing/999md-import.md](../../docs/parsing/999md-import.md), [docs/parsing/autooutlet-import.md](../../docs/parsing/autooutlet-import.md)
- [search-filters.md](./features/search-filters.md) — Search and filters form (tabs, fields, layout)
- [header-catalog-search.md](./features/header-catalog-search.md) — Header typeahead for brand / model / year
- [smart-selection.md](./features/smart-selection.md) — Guided questionnaire that creates a saved search filter from car-use preferences
- [tires-category.md](./features/tires-category.md) — Dev-ready spec for tire listings, taxonomy, create form, and search
- [seller-listings-board.md](./features/seller-listings-board.md) — Seller listings board
- [similar-listings.md](./features/similar-listings.md) — Similar listings
- Comparison (vehicles and tires) — up to 3 + 3 listings; guests in `localStorage`, signed-in users in `comparison_items` and `/api/comparison/*` (see [technical.md](./architecture/technical.md#comparison-vehicles-and-tires))
- [sitemap.md](./features/sitemap.md) — Sitemap generation
- [vehicle-type.md](./features/vehicle-type.md) — Vehicle type toggles (car/truck/moto)
- [seo-audit.md](./reference/seo-audit.md) — SEO audit
- [Documentation and product TODO](./reference/documentation-todo.md) — single backlog (`features/todo.md` redirects there)

---

## Roadmap (architecture)

**Priority 1:** Assets — done; Scripts — [scripts-architecture.md](./architecture/scripts-architecture.md)  
**Priority 2:** Frontend hardcodes — [known-issues.md](./architecture/known-issues.md)

---

## Quick start

### For Product Manager / Project Manager

1. [architecture/architecture-overview.md](./architecture/architecture-overview.md) — System overview
2. [guides/platform-checklist.md](./guides/platform-checklist.md) — Checklist
3. [guides/platform-guide.md](./guides/platform-guide.md) — Creating a new platform from template

### For Backend developer

1. [architecture/multi-repository.md](./architecture/multi-repository.md)
2. [architecture/backend-overview.md](./architecture/backend-overview.md)
3. [architecture/scripts-architecture.md](./architecture/scripts-architecture.md) — **REQUIRED**
4. [guides/local-development.md](./guides/local-development.md)

### For Frontend developer

1. [architecture/multi-repository.md](./architecture/multi-repository.md)
2. [architecture/known-issues.md](./architecture/known-issues.md)
3. [guides/local-development.md](./guides/local-development.md)

### For QA Automation Engineer

1. [guides/qa-automation-onboarding-ru.md](./guides/qa-automation-onboarding-ru.md)
2. [guides/quick-start-ru.md](./guides/quick-start-ru.md)
3. [guides/e2e-playwright-standards.md](./guides/e2e-playwright-standards.md)
4. [architecture/e2e-test-architecture.md](./architecture/e2e-test-architecture.md)
5. [../backend/docs/testing.md](../backend/docs/testing.md)
6. [linting.md](./engineering/linting.md)

### For DevOps

1. [guides/deployment.md](./guides/deployment.md)
2. [guides/platform-guide.md](./guides/platform-guide.md)

---

## Important notes

### Critical architecture issues

1. **Data generation scripts in core** (HIGH priority)
   - See [architecture/scripts-architecture.md](./architecture/scripts-architecture.md)
   - Requires reorganization before adding new platforms

2. **Hardcoded data in frontend** (MEDIUM priority)
   - See [architecture/known-issues.md](./architecture/known-issues.md)
   - Can be worked around with temporary solutions

---

## Support

1. Check documentation in the relevant section (architecture, guides, features)
2. [known-issues.md](./architecture/known-issues.md) — known issues
3. Contact the team

---

## For developers (features)

When adding a new feature: create a doc in `features/`, describe architecture/API/UI, update the list in the features section above.

**Last updated:** 2026-06
