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
- **Reference:** [reference/](./reference/) — [popular-brands-sync](./reference/popular-brands-sync.md), [platform-assets](./reference/platform-assets.md), analytics, scripts
- **Operations:** [operations/](./operations/) — [Sentry launch checklist](./operations/sentry-launch-checklist.md), deploy, monitoring
- **ADR:** [architecture/adr/](./architecture/adr/) — architecture decision records

## Documentation structure

### [`architecture/`](./architecture/)

**System architecture** — how the multi-platform system is built

- **[architecture-overview.md](./architecture/architecture-overview.md)** — **START HERE**
- [multi-repository.md](./architecture/multi-repository.md) — Core + Platform repos
- [backend-layers.md](./architecture/backend-layers.md) — Backend layered architecture (use cases, domain)
- [scripts-architecture.md](./architecture/scripts-architecture.md) — **CRITICAL**
- [known-issues.md](./architecture/known-issues.md) — Known issues
- [TECHNICAL.md](./architecture/TECHNICAL.md) — Technical details

### [`guides/`](./guides/)

**Guides** — platform creation, deploy, service setup

- **[platform-checklist.md](./guides/platform-checklist.md)** — **Checklist for new platforms**
- [platform-guide.md](./guides/platform-guide.md) — Setup and development (GA, GTM, Sentry)
- [sentry.md](./guides/sentry.md) — Sentry setup and monitoring
- [deployment.md](./guides/deployment.md) — Deploy (optional Telegram support bot)
- [local-development.md](./guides/local-development.md) — Local development
- [quick-start-ru.md](./guides/quick-start-ru.md) — Quick start (Russian)
- [linting.md](./linting.md) — Linting and code quality (single source)

**Order:** platform-checklist → platform-guide → deployment. Local: local-development → quick-start-ru.

### [`analytics/`](./analytics/)

**Analytics**

- [ga4-events.md](./analytics/ga4-events.md) — GA4 events and architecture (Sentry in [guides/sentry.md](./guides/sentry.md))

### [`scripts/`](./scripts/)

**Brands and models scripts**

- [brands-models-master-plan.md](./scripts/brands-models-master-plan.md) — Plan and production scripts (seed-all-brands-complete, order, cache)

### [`features/`](./features/)

**Feature documentation** — components and functionality

- [search-title-url.md](./features/search-title-url.md) — Search page URL and title (slugs, diacritics)
- Approximate price in default currency (≈ EUR) — FXRatesAPI, daily cron, listing enrichment, price sorting in default currency; env: `FXRATESAPI_API_KEY`, `DEFAULT_CURRENCY` (see [TECHNICAL.md](./architecture/TECHNICAL.md) §6 Exchange Rates)
- [image-preview.md](./features/image-preview.md) — Image preview system (cards, listing page, modal; blurhash placeholders; `image_blur_hashes` + backfill scripts)
- [infocar-history-section.md](./features/infocar-history-section.md) — History and report section, Infocar button, language-specific links (RO/RU)
- [loading-states.md](./features/loading-states.md) — Loading states
- [paid-promotion.md](./features/paid-promotion.md) — Paid promotion
- Assign listing to user (admin) — on `/listings/new` admin can set listing owner UUID; real-time validation (GET `/api/admin/validate-assign-user/:userId`), backend checks (existence, active, listing limit)
- Admin edit listings — on the admin listings tab, admin can open `/listings/[id]/edit` and edit any listing (including `Closed`), regardless of ownership. Backend bypasses ownership and `Closed` restrictions only for JWT users with role `Admin`. In edit form, `vehicleType` switcher is available only for admins. For editing VIN, admin requests full VIN via `GET /api/listings/:id?includeFullVin=1`.
- [cipauto-import.md](./features/cipauto-import.md) — CipAuto partner import tool (scan/import/report, idempotent registry, retry-safe)
- [search-filters.md](./features/search-filters.md) — Search and filters form (tabs, fields, layout)
- [seller-listings-board.md](./features/seller-listings-board.md) — Seller listings board
- [similar-listings.md](./features/similar-listings.md) — Similar listings
- [sitemap.md](./features/sitemap.md) — Sitemap generation
- [vehicle-type.md](./features/vehicle-type.md) — Vehicle type toggles (car/truck/moto)
- [seo-audit.md](./audits/seo-audit.md) — SEO audit
- [Documentation and product TODO](./reference/documentation-todo.md) — single backlog (features/todo.md redirects there)

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
2. [architecture/scripts-architecture.md](./architecture/scripts-architecture.md) — **REQUIRED**
3. [guides/local-development.md](./guides/local-development.md)

### For Frontend developer

1. [architecture/multi-repository.md](./architecture/multi-repository.md)
2. [architecture/known-issues.md](./architecture/known-issues.md)
3. [guides/local-development.md](./guides/local-development.md)

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

**Last updated:** 2026-03
