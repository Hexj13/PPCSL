---
title: Multi-repository
owner: platform
tags:
  - type/architecture
  - domain/architecture
  - scope/core
  - status/active
---

# Multi-Repository Architecture

This architecture separates the core application code from locale-specific configurations (translations, colors, site settings) using separate repositories.

---

## PPCSL Overview

**PPCSL** (Platform for Posting Car Sale Listings) is a core framework for creating car marketplace platforms for different countries. It provides all essential functionality for listing, searching, and managing car sales, while allowing each platform to have its own branding, translations, colors, and domain.

### What's in PPCSL Core

**Frontend Core:**

- All React components (Header, Footer, ListingCard, ListingForm, etc.)
- Pages and routes (home, listings, profile, admin, etc.)
- API client and server-side API functions
- State management (Zustand stores)
- Hooks and utilities
- Design system components
- System interfaces: `lib/i18n.ts`, `lib/theme.ts`, `lib/site-config.ts`

**Backend Core:**

- Complete NestJS backend API
- Authentication and authorization
- User management
- Listing management
- Image upload, watermarking, and optional license plate masking
- Search functionality
- Admin panel
- Database models and migrations
- All business logic

### What PPCSL Does NOT Contain

- **No hardcoded texts** - All user-facing text uses translation keys
- **No hardcoded platform names** - Brand, domain, and cookie/storage prefixes are overlay/env/`ppcsl_*`; see [linting.md](../engineering/linting.md) (platform-neutral core)
- **No hardcoded colors** - Colors loaded dynamically from theme files
- **No hardcoded URLs/domains** - Site configuration loaded from config files
- **No country-specific business logic** - All logic is generic and configurable

### What's in Platform-Specific Repositories

Each platform (e.g., kupito.club) contains only:

1. **Translations** (`locales/ro.json`, `locales/ru.json`, `locales/en.json`, etc.) - All user-facing text in supported languages
2. **Theme** (`theme/colors.ts`) - Color scheme specific to the platform
3. **Site Configuration** (`config/site.ts`) - Domain, locale, currency, support email
4. **Build Configuration** - CI/CD workflows, deployment scripts

### Benefits

✅ **Single Source of Truth** - All core functionality maintained in one place  
✅ **Independent Platform Development** - Each platform can be developed and deployed independently  
✅ **Easy Scaling** - Add new country by creating new repository with translations, theme, and config  
✅ **Maintenance Efficiency** - One codebase to maintain instead of multiple  
✅ **Marketing Flexibility** - Each platform can have its own branding and domain  
✅ **Risk Management** - Isolated deployments, independent rollbacks

### Current Status

**Core Repository:**

- **PPCSL** - `git@github.com:Hexj13/PPCSL.git`
- Contains all core functionality
- Ready for use by platform repositories

**Active Platform:**

- **kupito.club** - Platform for Moldova
- Uses PPCSL core via Git submodule
- Has Romanian and Russian translations, theme, and configuration

---

## Architecture

### Repository Relationships

```
ppcsl (GitHub) - PPCSL (Platform for posting car sale listings)
    │
    └─── kupito.club (GitHub) - Platform for Moldova
         └── core/ (Git Submodule → ppcsl)
         ├── locales/ro.json
         ├── locales/ru.json
         └── locales/en.json
         └── theme/colors.ts
         └── config/site.ts
```

### Dependency Flow

1. **Development** happens in `ppcsl` (PPCSL)
2. **CI/CD** in `ppcsl` runs tests, linters, and TypeScript type checking
3. **On success**, updates are pushed to platform repositories (e.g., kupito.club)
4. **Platform repositories** build with their specific configurations
5. **Deployment** happens independently for each platform

---

## Repository Structure

### PPCSL Repository (ppcsl)

```
ppcsl/
├── frontend/
│   ├── app/                    # Pages and routes (no hardcoded texts)
│   ├── components/             # Components (use t() for texts)
│   ├── lib/
│   │   ├── i18n.ts            # Translation system interface
│   │   ├── theme.ts           # Theme system interface
│   │   ├── site-config.ts     # Site config interface
│   │   ├── api/                # API client (api.ts barrel, api-types, api-listings, api-auth, …)
│   │   └── types.ts           # TypeScript types
│   ├── hooks/                 # React hooks
│   ├── ui/                    # Design system components
│   ├── tailwind.config.js     # Tailwind config (uses theme)
│   └── package.json
├── backend/                    # Complete backend (shared)
│   ├── src/
│   └── package.json
├── .github/
│   └── workflows/
│       └── ci.yml             # CI/CD with submodule updates
├── package.json
└── README.md
```

### kupito.club Repository

```
kupito.club/
├── .gitmodules                 # Git submodule configuration
├── core/                       # Git submodule (ppcsl)
│   ├── frontend/
│   └── backend/
├── locales/
│   ├── ro.json                 # Romanian translations
│   ├── ru.json                 # Russian translations
│   └── en.json                 # English translations
├── theme/
│   └── colors.ts              # Platform color scheme
├── config/
│   └── site.ts                # Site configuration (domain, email, etc.)
├── .github/
│   └── workflows/
│       └── ci.yml             # Build and deploy for MD
├── package.json
└── README.md
```

---

## Configuration Systems

### 1. Translation System (i18n)

**In PPCSL:**

- `frontend/lib/i18n.ts` - Interface and translation loading functions
- `frontend/components/providers/I18nProvider.tsx` - React Context Provider
- `frontend/hooks/useTranslation.ts` - Hook for using translations

**In platform repositories:**

- `locales/{country}.json` - Translation files (e.g., `locales/ro.json`, `locales/ru.json`, `locales/en.json`)

**Usage:**

```typescript
const { t } = useTranslation();
return <h1>{t('header.addListing')}</h1>;
```

### 2. Theme System

**In PPCSL:**

- `frontend/lib/theme.ts` - Interface and theme loading functions
- `frontend/tailwind.config.js` - Uses theme for color generation

**In platform repositories:**

- `theme/colors.ts` - Color scheme file

### 3. Site Configuration

**In PPCSL:**

- `frontend/lib/site-config.ts` - Interface and configuration loading functions

**In platform repositories:**

- `config/site.ts` - Configuration (domain, locale, currency, support email)

---

## Build Process

### In Platform Repositories

1. **Copy platform files** to core before build (e.g. `npm run prepare:build`):
   - `locales/ro.json`, `locales/ru.json`, `locales/en.json` → `core/frontend/lib/locales/` (frontend)
   - `locales/backend/*.json` → `core/backend/src/common/i18n/` (backend)
   - `theme/` → `core/frontend/lib/theme/`
   - `config/` → `core/frontend/lib/config/`
   - Assets: `assets/frontend/public/*`, `assets/backend/watermark/` → core

2. **Build** happens in `core/frontend` and `core/backend` using copied files

3. **Deploy** the built application

---

## CI/CD

For complete CI/CD documentation, see **[Technical Documentation - CI/CD Configuration](technical.md#13-cicd-configuration)**.

### Quick Overview

**PPCSL (core):**

- Runs tests, linters, type checking
- Updates submodules in platform repositories on success

**Platform repositories:**

- Copies locale files to core
- Builds and deploys with platform-specific configuration

---

## Workflow

For detailed workflow documentation, see:

- **[Platform Guide - Development Workflows](../guides/platform-guide.md#3-development-workflows)** - Complete workflow guide with examples
- **[Local Development Guide - Common Workflows](../guides/local-development.md#common-workflows)** - Daily development workflows

### Quick Overview

1. **Core changes** → Made in PPCSL → CI/CD updates platform submodules automatically
2. **Platform changes** → Made in platform repository → CI/CD builds and deploys
3. **New platform** → See [Platform Guide - Creating a New Platform](../guides/platform-guide.md#2-creating-a-new-platform)

---

## Troubleshooting

For detailed troubleshooting guides, see:

- **[Platform Guide - Troubleshooting](../guides/platform-guide.md#5-troubleshooting)** - Platform setup issues
- **[Local Development Guide - Troubleshooting](../guides/local-development.md#troubleshooting)** - Local development issues
- **[Deployment Guide - Troubleshooting](../guides/DEPLOYMENT.md#7-troubleshooting)** - Deployment issues

### Quick Fixes

**Submodule not updating:**

```bash
git submodule update --init --recursive
git submodule update --remote --merge core
```

**Build can't find translations:**

- Ensure locale files are copied before build
- Check paths in CI/CD workflow

---

## Best Practices

1. **Always test** core changes with platform files before pushing
2. **Keep translations in sync** - if you add a new key, add it to all platform locales (e.g., `locales/ro.json`, `locales/ru.json`, `locales/en.json`)
3. **Monitor builds** - ensure platform builds succeed after core updates
4. **Code review** - carefully review core changes as they affect all platforms
5. **Use feature branches** for core changes (see [Platform Guide](../guides/platform-guide.md#workflow-1-making-core-changes))

---

## Summary

This architecture provides:

✅ **Separation of concerns** - Core code (PPCSL) separate from locale-specific content  
✅ **Independent deployments** - Each platform can be deployed separately  
✅ **Easy scaling** - Add new platforms by creating new repository  
✅ **Maintainability** - Core changes automatically sync to all platforms  
✅ **Flexibility** - Each platform can have custom configurations

**Current Platform:**

- **kupito.club** - Platform for Moldova

**Core Repository:**

- **PPCSL** (ppcsl) - Platform for posting car sale listings
- Repository: `git@github.com:Hexj13/PPCSL.git`
