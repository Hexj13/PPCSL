---
title: Known issues
owner: platform
tags:
  - type/architecture
  - domain/architecture
  - scope/core
  - status/active
---

# Multi-platform: known issues and status

This document describes what is implemented and what remains for full multi-platform architecture support.

## Fully implemented

### 1. Configuration (`config/site.ts`)

Platform-specific site configuration: name, domain, currency, locale.

### 2. Translations (`locales/*.json`)

UI and metadata translations in the platform language.

### 3. Theme (`theme/colors.ts`)

Color scheme, including PWA colors (`pwa.backgroundColor`, `pwa.themeColor`).

### 4. Assets (`assets/`)

Logos, favicon, OG images, watermark for photos.

### 5. SEO Keywords

Moved to `locales/*.json` → `metadata.site.keywords`.

### 6. Default Metadata

Moved to `locales/*.json` → `metadata.site.defaultTitle/defaultDescription`.

### 7. OpenGraph

`app/opengraph-image.tsx` and `app/page.tsx` use config and locales.

### 8. PWA Manifest

`app/manifest.ts` uses `theme.pwa` for colors.

### 9. Platform-specific scripts

All scripts in core with `checkPlatform()` and `getPlatformConfig()`.
Platform configs: `core/backend/src/scripts/platforms/{country}/config.ts` (e.g. `md` for Moldova).

---

## Optional (can be improved)

### 1. Popular Brands (`lib/content/popular-brands.ts`)

**Status:** Platform-override architecture implemented

- Loader in `core/frontend/lib/content/popular-brands.ts` loads data by vehicle type (car, truck, moto).
- **Preferred format:** JSON in `config/` with fields `market`, `segment`, `brands` (array of `{ brand, top_models: [{ model, most_popular }] }`):
  - `config/popular-brands.json` — cars (segment `used_cars`);
  - `config/popular-brands-truck.json` — trucks (`commercial_transport_used`);
  - `config/popular-brands-moto.json` — moto (`motorcycles_used`).
- If JSON is missing or invalid, for car the code uses `config/popular-brands.ts` (export default `{ brands, modelsByBrand }`). For truck/moto — built-in fallback in code.
- On build, `config/` is copied to `core/frontend/lib/config/`.

### 2. FAQ (`app/faq/page.tsx`)

**Status:** Moved to platform-level config

- FAQ content: in platform repo — `config/faq.ts` (aggregates `config/faq-data-ro.ts`, `config/faq-data-ru.ts`, `config/faq-data-en.ts` by language); copied to `core/frontend/lib/config/` on build
- Page `app/faq/page.tsx` loads config via `loadFaqSync(country, locale)` from `@/lib/content/faq`
- Support: Q&A blocks (`items`) and user scenarios (`scenarios`); email and domain from `config/site.ts` (via `loadSiteConfigSync`)

### 3. Legal Documents (`app/terms/`, `app/privacy/`)

**Status:** Ready for multi-platform without core changes

- Loader `loadLegalConfigSync()` added (supports `config/legal.ts` as platform override)
- Terms/Privacy use safe replacement of domain/email with values from `config/site.ts`
- Language switching works per platform config languages

**Important:** Terms/Privacy text must live in platform repo in `config/legal.ts` (source of truth)

**For a new country:** add `config/legal.ts` and required locales without changing core.

---

## Platform-specific file structure

```
{platform-repo}/
├── locales/
│   └── {lang}.json          # Translations and metadata.site
├── theme/
│   └── colors.ts            # Colors and pwa
├── config/
│   ├── site.ts              # Site config (domain, email, name)
│   ├── faq.ts               # FAQ: aggregator (faq-data-ro, faq-data-ru, faq-data-en)
│   ├── faq-data-ro.ts       # FAQ content in Romanian
│   ├── faq-data-ru.ts       # FAQ content in Russian
│   ├── faq-data-en.ts       # FAQ content in English
│   ├── faq-types.ts         # Types FAQConfig, FAQItem, FAQScenario
│   ├── legal.ts             # Terms/Privacy text by language
│   ├── popular-brands.json  # Popular brands/models — cars (priority)
│   ├── popular-brands-truck.json  # Trucks (optional)
│   ├── popular-brands-moto.json   # Moto (optional)
│   └── popular-brands.ts   # Fallback for cars if no JSON
├── assets/
│   ├── frontend/public/     # Logos, favicon, OG
│   └── backend/watermark/  # Watermark for photos
└── package.json             # COUNTRY=<code> for scripts

{core}/
└── backend/src/scripts/
    └── platforms/
        └── {code}/
            └── config.ts    # Cities, descriptions, phone prefix
```

---

## Related documents

- [scripts-architecture.md](./scripts-architecture.md) — Scripts architecture
- [multi-repository.md](./multi-repository.md) — Multi-repo architecture
- [../guides/platform-checklist.md](../guides/platform-checklist.md) — Platform creation checklist
