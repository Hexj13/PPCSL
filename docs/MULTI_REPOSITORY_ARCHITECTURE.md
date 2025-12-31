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
- Image upload and watermarking
- Search functionality
- Admin panel
- Database models and migrations
- All business logic

### What PPCSL Does NOT Contain

- **No hardcoded texts** - All user-facing text uses translation keys
- **No hardcoded colors** - Colors loaded dynamically from theme files
- **No hardcoded URLs/domains** - Site configuration loaded from config files
- **No country-specific business logic** - All logic is generic and configurable

### What's in Platform-Specific Repositories

Each platform (e.g., kupito.club) contains only:
1. **Translations** (`locales/mk.json`) - All user-facing text in local language
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
- **kupito.club** - Platform for Macedonia
- Uses PPCSL core via Git submodule
- Has Macedonian translations, theme, and configuration

---

## Architecture

### Repository Relationships

```
ppcsl (GitHub) - PPCSL (Platform for posting car sale listings)
    │
    └─── kupito.club (GitHub) - Platform for Macedonia
         └── core/ (Git Submodule → ppcsl)
         └── locales/mk.json
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
│   │   ├── api.ts             # API client
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
│   └── mk.json                 # All Macedonian translations
├── theme/
│   └── colors.ts              # Macedonian color scheme
├── config/
│   └── site.ts                # Site configuration (domain, email, etc.)
├── .github/
│   └── workflows/
│       └── ci.yml             # Build and deploy for MK
├── package.json
└── README.md
```

---

## Configuration Systems

### 1. Translation System (i18n)

**In PPCSL:**
- `frontend/lib/i18n.ts` - Interface and translation loading functions
- `frontend/components/I18nProvider.tsx` - React Context Provider
- `frontend/hooks/useTranslation.ts` - Hook for using translations

**In platform repositories:**
- `locales/{country}.json` - Translation files

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

1. **Copy locale files** to core before build:
   ```bash
   cp -r locales core/frontend/lib/
   cp -r theme core/frontend/lib/
   cp -r config core/frontend/lib/
   ```

2. **Build** happens in `core/frontend` and `core/backend` using copied files

3. **Deploy** the built application

---

## CI/CD

### PPCSL (ppcsl)

CI/CD in PPCSL **does NOT include** build steps, as build requires locale-specific files that don't exist in core. Build happens in platform repositories.

**What PPCSL CI/CD does:**
- Runs tests (backend and frontend)
- Checks linters and formatting
- Checks TypeScript types (`tsc --noEmit`)
- On success, updates submodules in platform repositories

### kupito.club

**What kupito.club CI/CD does:**
- Clones repository with submodules
- Copies locale files to core
- Installs dependencies
- Builds frontend and backend
- Deploys to production

---

## Workflow

### Development

1. **Changes** are made in `ppcsl` (PPCSL)
2. **Commit and push** to `ppcsl/main`
3. **CI/CD runs** in `ppcsl`:
   - Tests pass
   - Linters and formatters pass
   - TypeScript type checking passes
   - Submodules updated in platform repositories
4. **CI/CD runs** in platform repositories:
   - Core submodule updated
   - Locale files copied
   - Build with locale configuration
   - Deploy to production

### Adding New Platform

1. Create new repository for the platform
2. Add PPCSL core as submodule
3. Create locale files:
   - `locales/{country}.json` - Translations
   - `theme/colors.ts` - Color scheme
   - `config/site.ts` - Site configuration
4. Setup CI/CD in new repository
5. Add submodule update step in PPCSL CI/CD

### Updating Platform Content

1. Make changes in platform repository (kupito.club)
2. Update `locales/mk.json`, `theme/colors.ts`, or `config/site.ts`
3. Commit and push
4. CI/CD builds and deploys the platform

---

## Troubleshooting

### Submodule Not Updating

```bash
cd kupito.club
git submodule update --init --recursive
git submodule update --remote --merge core
```

### Build Can't Find Translations

- Ensure locale files are copied before build
- Check paths in build script
- Verify `NEXT_PUBLIC_COUNTRY` environment variable

### Theme Not Loading

- Ensure theme files are copied before build
- Check path resolution in Tailwind config
- Verify theme file exports default

### Import Errors

- Use dynamic imports: `await import(\`./locales/${country}.json\`)`
- Ensure files are copied to correct location

---

## Best Practices

1. **Always test** core changes with kupito.club before pushing
2. **Keep translations in sync** - if you add a new key, add it to all locales
3. **Version core** - use semantic versioning for major changes
4. **Monitor builds** - ensure platform builds succeed after core updates
5. **Code review** - carefully review core changes as they affect all platforms

---

## Summary

This architecture provides:

✅ **Separation of concerns** - Core code (PPCSL) separate from locale-specific content  
✅ **Independent deployments** - Each platform can be deployed separately  
✅ **Easy scaling** - Add new platforms by creating new repository  
✅ **Maintainability** - Core changes automatically sync to all platforms  
✅ **Flexibility** - Each platform can have custom configurations

**Current Platform:**
- **kupito.club** - Platform for Macedonia

**Core Repository:**
- **PPCSL** (ppcsl) - Platform for posting car sale listings
- Repository: `git@github.com:Hexj13/PPCSL.git`
