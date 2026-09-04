---
title: Architecture overview
owner: platform
tags:
  - type/architecture
  - domain/architecture
  - scope/core
  - status/active
---

# Multi-Platform Architecture: Documentation Overview

This document is the **entry point** for understanding the PPCSL multi-platform architecture.

## Main concept

**PPCSL (Platform-Portable Car Sales Logic)** — universal core for building car marketplaces for different countries.

**Principle:**

- **Core** = universal business logic (one for all)
- **Platform-repo** = localization (country, language, currency, design)

```
Moldova (kupito.club)              Future Platform
├── config/                        ├── config/
├── locales/                       ├── locales/
├── theme/                         ├── theme/
├── assets/                        ├── assets/
└── core/ (submodule) ←────────────┴── core/ (submodule)
  Platform config: core/backend/src/scripts/platforms/{country}/
  ONE CORE FOR ALL!
```

---

## Documentation

### Understanding the system (read first)

1. **[multi-repository.md](./multi-repository.md)**
   - Multi-repository architecture overview
   - How core + platform-repo work together
   - Git submodules

### Creating new platforms

2. **[platform-checklist.md](../guides/platform-checklist.md)** — **START HERE**
   - Step-by-step checklist for creating a platform
   - All required steps
   - Commands and examples

3. **[platform-guide.md](../guides/platform-guide.md)**
   - Detailed guide
   - Best practices
   - Configuration examples

4. **[platform-plans/](../platform-plans/)** — Platform plans when adding a new country (e.g. Moldova).

### For developers (important)

5. **[backend-overview.md](./backend-overview.md)** — Backend monolith, stack, NestJS modules, what is not used (GraphQL, queues), background jobs, multi-platform vs multi-tenant.

6. **[backend-layers.md](./backend-layers.md)** — Backend layered architecture (Presentation → Application → Domain → Infrastructure), use cases, ports, Listings/Auth module structure.

7. **[scripts-architecture.md](./scripts-architecture.md)** — **CRITICAL**
   - Scripts and platform configs in core
   - Configs in `platforms/{country}/config.ts`
   - Running with `COUNTRY` variable

8. **[known-issues.md](./known-issues.md)** — **KNOWN ISSUES**
   - Hardcoded data in core
   - SEO keywords, metadata, OpenGraph
   - Optimization plan

### Deploy

9. **[deployment.md](../guides/deployment.md)**
   - Deploy instructions for Render.com
   - CI/CD setup
   - Production checklist

10. **[local-development.md](../guides/local-development.md)**
   - Local development
   - Environment setup
   - Debugging

---

## Critical issues (require attention)

### 1. Scripts and platform configs

**Done:** Scripts in core, platform data (cities, descriptions, phone) — in `core/backend/src/scripts/platforms/{country}/config.ts`. `COUNTRY` variable selects the platform.

**Documentation:** [scripts-architecture.md](./scripts-architecture.md)

---

### 2. SEO and metadata

**Done:** SEO keys, metadata, OpenGraph moved to platform locales (`locales/*.json` → `metadata.*`) and config.

**Details:** [known-issues.md](./known-issues.md)

---

## Already implemented

1. **Platform-specific configuration** (`config/site.ts`)
2. **Translations** (`locales/*.json`)
3. **Theme** (`theme/colors.ts`)
4. **Assets** (`assets/` — logos, icons, watermark)

---

## Roadmap for creating a new platform

### Creating a new platform

1. Create platform-repo (config, locales, theme, assets).
2. Add platform config in core: `core/backend/src/scripts/platforms/{country}/config.ts` (cities, descriptions, phone prefix, etc.).
3. Register platform in `platforms/index.ts` and in `Platform` type in `script-guard.ts`.
4. Use [platform-checklist.md](../guides/platform-checklist.md).
5. Deploy with `NEXT_PUBLIC_COUNTRY={country}` and `COUNTRY={country}` for scripts.

---

## Documentation reading order

### For Product Manager / Project Manager

1. This README
2. [platform-checklist.md](../guides/platform-checklist.md)
3. [platform-plans/](./platform-plans/) — when adding a new country

### For Backend developer

1. [multi-repository.md](./multi-repository.md)
2. [backend-overview.md](./backend-overview.md) — monolith and stack
3. [backend-layers.md](./backend-layers.md) — layers and use cases
4. [scripts-architecture.md](./scripts-architecture.md) — **REQUIRED**
5. [platform-guide.md](../guides/platform-guide.md)
6. [local-development.md](../guides/local-development.md)

### For Frontend developer

1. [multi-repository.md](./multi-repository.md)
2. [known-issues.md](./known-issues.md)
3. [platform-guide.md](../guides/platform-guide.md)

### For DevOps

1. [deployment.md](../guides/deployment.md)
2. [platform-guide.md](../guides/platform-guide.md)

---

## Contributing

When changing core:

1. Do **not** hardcode platform-specific data
2. Use config, locales, theme
3. Test on all existing platforms
4. Document changes

---

## Support

If you have questions:

1. Check the documentation (see above)
2. Check [known-issues.md](./known-issues.md) — it might be a known issue
3. Contact the development team

---

**Last updated:** 2026-05
