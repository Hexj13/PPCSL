---
title: Platform guide
owner: platform
tags:
  - type/guide
  - domain/platform
  - scope/core
  - status/active
---

# Platform setup and development guide

Complete guide for creating new platforms and understanding where to make code changes.

---

## Table of Contents

1. [Where to Make Changes](#1-where-to-make-changes)
2. [Creating a New Platform](#2-creating-a-new-platform)
3. [Development Workflows](#3-development-workflows)
4. [File Structure Reference](#4-file-structure-reference)
5. [Troubleshooting](#5-troubleshooting)
6. [Analytics and monitoring configuration (GA, GTM, Sentry)](#6-analytics-and-monitoring-configuration-ga-gtm-sentry)

---

## 1. Where to Make Changes

### Core Repository (PPCSL)

**Location:** `git@github.com:Hexj13/PPCSL.git`

**Make changes here when:**

- ✅ Adding new features (components, pages, API endpoints)
- ✅ Fixing bugs in core functionality
- ✅ Updating business logic
- ✅ Adding new database models or migrations
- ✅ Improving performance or security
- ✅ Adding new translation keys (but translations go to platform repos)

**Do NOT make changes here for:**

- ❌ Translations (text content)
- ❌ Colors and themes
- ❌ Site-specific configuration (domain, email, etc.)
- ❌ Platform-specific branding

### Platform Repository (e.g., kupito.club)

**Location:** `git@github.com:Hexj13/kupito.club.git` (example)

**Make changes here when:**

- ✅ Translating text (updating `locales/{country}.json`)
- ✅ Changing colors or theme (`theme/colors.ts`)
- ✅ Updating site configuration (`config/site.ts`)
- ✅ Platform-specific deployment settings
- ✅ Platform-specific CI/CD workflows

**Do NOT make changes here for:**

- ❌ Core functionality (components, API, business logic)
- ❌ Database models or migrations
- ❌ Shared utilities or hooks

### Decision Tree

```
Is it a new feature or bug fix?
├─ YES → Make changes in PPCSL (core)
│   └─ Does it need translation?
│       └─ YES → Add translation key in core, add translation text in platform repo
│
└─ NO → Is it text, colors, or site config?
    └─ YES → Make changes in platform repository
```

---

## 2. Creating a New Platform

Complete step-by-step guide to create a new platform from scratch.

### Step 1: Create GitHub Repository

1. Go to GitHub and create a new repository
2. Name it appropriately (e.g., `example.com`, `country-site`)
3. Initialize with a README (optional)
4. **Do NOT** clone it yet

### Step 2: Clone and Setup Repository Locally

```bash
# Clone your new repository
git clone git@github.com:your-username/your-platform.git
cd your-platform

# Add PPCSL core as submodule
git submodule add git@github.com:Hexj13/PPCSL.git core

# Initialize submodule
git submodule update --init --recursive
```

### Step 3: Create Directory Structure

```bash
# Create directories for platform-specific files
mkdir -p locales theme config
```

### Step 4: Create Translation File

Create `locales/{country-code}.json` (e.g., `locales/en.json`, `locales/de.json`):

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "search": "Search"
  },
  "header": {
    "addListing": "Add Listing",
    "myListings": "My Listings",
    "favorites": "Favorites",
    "login": "Login",
    "register": "Register"
  },
  "listing": {
    "title": "Title",
    "price": "Price",
    "year": "Year",
    "mileage": "Mileage",
    "fuelType": "Fuel Type"
  }
}
```

**Important:** Copy all translation keys from `locales/ro.json`, `locales/ru.json` or `locales/en.json` in the root directory (or from another existing platform) and translate them to your language. Translation files are loaded directly from the root `locales/` directory.

### Step 5: Create Theme File

Create `theme/colors.ts`:

```typescript
export default {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9', // Main primary color
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  secondary: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a', // Main secondary color
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
  },
  accent: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444', // Main accent color
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
};
```

**Note:** Adjust colors to match your platform's branding.

### Step 6: Create Site Configuration

Create `config/site.ts`:

```typescript
import { SiteConfig } from '../core/frontend/lib/site-config';

const config: SiteConfig = {
  country: 'us', // ISO country code (lowercase)
  name: 'Your Platform Name',
  domain: 'your-platform.com',
  locale: 'en_US', // Locale code
  currency: 'USD', // ISO currency code
  countryCode: 'US', // ISO country code (uppercase)
  supportEmail: 'support@your-platform.com',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://your-platform.com',
};

export default config;
```

#### Locale routing (optional)

If you omit `localeRouting`, the Next.js frontend uses core defaults (Moldova-style `ro` without a URL prefix and `ru` under `/ru`). For a new country or a single-language site, set `localeRouting` explicitly on `SiteConfig`.

Fields:

- `defaultLocale` — URL segment omitted for the primary language (no leading slash in the value; use `ro`, `en`, `bg`).
- `supportedLocales` — all UI locales; order is preserved for the language switcher.
- `prefixedLocales` — locales that appear as the first path segment (`/ru/...`, `/en/...`). Must not include `defaultLocale`.
- `enableLegacyDefaultLocaleRedirect` — when `true`, requests to `/<defaultLocale>/...` are redirected with 308 to strip that segment (useful if you previously published default-locale URLs with a prefix). Ignored when `defaultLocale` is listed in `prefixedLocales`. The older config key `enableLegacyRoPathRedirect` is still read as a fallback when `enableLegacyDefaultLocaleRedirect` is omitted.
- `languageSwitcherTranslationKeys` — map of locale code to a frontend translation key for the label in `LanguageSwitcher` (for example `ro` → `common.languageRo`). Locales without an entry use `common.languageLocaleCode` with a `{code}` placeholder.

Single-locale example (English only, no URL prefix):

```typescript
const config: SiteConfig = {
  country: 'us',
  name: 'Your Platform Name',
  domain: 'your-platform.com',
  locale: 'en-US',
  currency: 'USD',
  currencies: ['USD'] as const,
  countryCode: 'US',
  supportEmail: 'support@your-platform.com',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://your-platform.com',
  localeRouting: {
    defaultLocale: 'en',
    supportedLocales: ['en'],
    prefixedLocales: [],
    enableLegacyDefaultLocaleRedirect: false,
  },
};
```

Moldova-style example (default `ro` at `/`, Russian at `/ru`, English at `/en`):

```typescript
const config: SiteConfig = {
  country: 'md',
  name: 'Example',
  domain: 'example.md',
  locale: 'ro-MD',
  currency: 'EUR',
  currencies: ['EUR', 'MDL'] as const,
  countryCode: 'MD',
  supportEmail: 'support@example.md',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://example.md',
  localeRouting: {
    defaultLocale: 'ro',
    supportedLocales: ['ro', 'ru', 'en'],
    prefixedLocales: ['ru', 'en'],
    enableLegacyDefaultLocaleRedirect: true,
    languageSwitcherTranslationKeys: {
      ro: 'common.languageRo',
      ru: 'common.languageRu',
      en: 'common.languageEn',
    },
  },
};
```

The header and footer `LanguageSwitcher` is shown only when `NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER` is set to `true` in the frontend environment and `supportedLocales` has more than one entry.

Frontend routing (PPCSL): pages live under `app/[locale]/...`. The Next.js proxy (`proxy.ts`) rewrites unprefixed URLs to `/<defaultLocale>/...` internally and leaves prefixed locales (for example `/ru/...`) unchanged. Locale for SSR metadata and translations comes from the `[locale]` path segment (not from `cookies()` / `headers()`), so document responses are not forced into `Cache-Control: no-store` solely because of locale resolution. Preferred-locale cookies are still used only in the proxy for redirects onto a prefixed path.

When the switcher is enabled, the Next.js middleware may redirect a path **without** a locale prefix to a prefixed URL (for example `/ru/...`) using cookies: **`kupito-locale`** (explicit choice from the UI) takes precedence over **`kupito-preferred-locale`** (first-visit hint). If `kupito-locale` is the `defaultLocale`, that redirect does not run to the prefixed locale even when the preferred cookie suggests one.

### Step 7: Create CI/CD Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    name: Build and Deploy
    runs-on: ubuntu-latest

    steps:
      - name: Checkout with submodules
        uses: actions/checkout@v4
        with:
          submodules: recursive
          token: ${{ secrets.PAT_TOKEN }}

      - name: Copy platform files
        run: npm run prepare:build

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install frontend dependencies
        working-directory: ./core/frontend
        run: npm ci

      - name: Install backend dependencies
        working-directory: ./core/backend
        run: npm ci

      - name: Run linters
        working-directory: ./core/frontend
        run: npm run lint

      - name: Build frontend
        working-directory: ./core/frontend
        env:
          NEXT_PUBLIC_API_URL: ${{ secrets.API_URL }}
          NEXT_PUBLIC_SITE_URL: ${{ secrets.SITE_URL }}
        run: npm run build

      - name: Build backend
        working-directory: ./core/backend
        run: npm run build

      # Add deployment steps here (Render.com, VPS, etc.)
      # See DEPLOYMENT.md for details
```

**Required Secrets:**

- `PAT_TOKEN` - Personal Access Token with `repo` scope for accessing PPCSL submodule
- `API_URL` - Your backend API URL
- `SITE_URL` - Your frontend URL

### Step 8: Add Submodule Update to PPCSL CI/CD

In PPCSL repository (`.github/workflows/ci.yml`), add a new step in `sync-to-locales` job:

```yaml
- name: Update your-platform.com submodule
  env:
    PAT_TOKEN: ${{ secrets.PAT_TOKEN }}
  run: |
    if [ -z "$PAT_TOKEN" ]; then
      echo "⚠️ PAT_TOKEN secret not set. Skipping submodule update."
      exit 0
    fi

    CREDENTIAL_FILE=$(mktemp)
    echo "https://x-access-token:${PAT_TOKEN}@github.com" > "$CREDENTIAL_FILE"
    git config --global credential.helper "store --file=$CREDENTIAL_FILE"

    cleanup() {
      rm -f "$CREDENTIAL_FILE"
      git config --global --unset credential.helper 2>/dev/null || true
    }
    trap cleanup EXIT

    git clone https://github.com/your-username/your-platform.git ../your-platform || exit 0
    cd ../your-platform
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"
    git submodule update --init --recursive || exit 0
    cd core
    git fetch origin
    git checkout ${{ github.sha }}
    cd ..
    git add core
    git commit -m "chore: update PPCSL core to ${{ github.sha }}" || exit 0
    git push origin main || exit 0

    cleanup
```

### Step 9: Test Locally

```bash
# Copy platform files to core (or: npm run prepare:build from repo root)
mkdir -p core/frontend/lib/locales && cp locales/ro.json locales/ru.json locales/en.json core/frontend/lib/locales/ && cp locales/backend/*.json core/backend/src/common/i18n/
cp -r theme core/frontend/lib/
cp -r config core/frontend/lib/

# Navigate to core
cd core

# Install dependencies
npm run install:all

# Start Docker containers
docker-compose up -d

# Setup environment variables (see LOCAL_DEVELOPMENT.md)

# Run migrations
cd backend
npm run build
npm run migration:run

# Start development servers
cd ..
npm run dev
```

### Step 10: Deploy

Follow instructions in [DEPLOYMENT.md](./DEPLOYMENT.md) for:

- VPS deployment
- Render.com deployment
- Namecheap domain setup

### Step 11: Commit and Push

```bash
# In your platform repository
git add locales theme config .github
git commit -m "feat: initial platform setup"
git push origin main
```

---

## 3. Development Workflows

### Workflow 1: Making Core Changes

**When:** Adding new features, fixing bugs, improving core functionality

**Steps:**

1. **Work in PPCSL repository:**

   ```bash
   cd PPCSL
   git pull origin main
   git checkout -b feature/new-feature
   ```

2. **Make changes:**
   - Edit components, pages, API endpoints, etc.
   - Add translation keys if needed (e.g., `common.newFeature`)

3. **Test locally:**

   ```bash
   npm run dev
   ```

4. **Commit and push:**

   ```bash
   git add .
   git commit -m "feat: new feature"
   git push origin feature/new-feature
   ```

5. **Create Pull Request** in PPCSL repository

6. **After merge to main:**
   - CI/CD automatically updates submodules in platform repositories
   - Platform repositories build and deploy automatically

7. **If you added new translation keys:**
   - Go to each platform repository
   - Add translations for new keys in `locales/{country}.json`
   - Commit and push

### Workflow 2: Updating Platform Content

**When:** Changing translations, colors, or site configuration

**Steps:**

1. **Work in platform repository:**

   ```bash
   cd kupito.club  # or your platform
   git pull origin main
   ```

2. **Update core submodule (if needed):**

   ```bash
   cd core
   git pull origin main
   cd ..
   ```

3. **Copy platform files to core for testing:**

   ```bash
   mkdir -p core/frontend/lib/locales && cp locales/ro.json locales/ru.json locales/en.json core/frontend/lib/locales/ && cp locales/backend/*.json core/backend/src/common/i18n/
   cp -r theme core/frontend/lib/
   cp -r config core/frontend/lib/
   ```

4. **Make changes:**
   - Edit `locales/{country}.json` for translations
   - Edit `theme/colors.ts` for colors
   - Edit `config/site.ts` for site configuration

5. **Copy files again and test:**

   ```bash
   mkdir -p core/frontend/lib/locales && cp locales/ro.json locales/ru.json locales/en.json core/frontend/lib/locales/ && cp locales/backend/*.json core/backend/src/common/i18n/
   cp -r theme core/frontend/lib/
   cp -r config core/frontend/lib/
   cd core
   npm run dev
   ```

6. **Commit and push:**

   ```bash
   cd ..
   git add locales theme config
   git commit -m "feat: update translations"
   git push origin main
   ```

7. **CI/CD builds and deploys automatically**

### Workflow 3: Testing Core Changes with Platform Files

**When:** You want to test core changes with real platform translations and theme

**Steps:**

1. **Make changes in PPCSL:**

   ```bash
   cd PPCSL
   git checkout -b feature/test-feature
   # Make changes
   ```

2. **Clone platform repository in another directory:**

   ```bash
   cd ..
   git clone git@github.com:Hexj13/kupito.club.git test-platform
   cd test-platform
   ```

3. **Link core submodule to local PPCSL (temporary):**

   ```bash
   cd core
   git remote set-url origin /absolute/path/to/PPCSL
   git fetch
   git checkout feature/test-feature
   cd ..
   ```

4. **Copy platform files and test:**

   ```bash
   mkdir -p core/frontend/lib/locales && cp locales/ro.json locales/ru.json locales/en.json core/frontend/lib/locales/ && cp locales/backend/*.json core/backend/src/common/i18n/
   cp -r theme core/frontend/lib/
   cp -r config core/frontend/lib/
   cd core
   npm run dev
   ```

5. **After testing, restore submodule:**
   ```bash
   cd core
   git remote set-url origin git@github.com:Hexj13/PPCSL.git
   git checkout main
   cd ..
   ```

### Workflow 4: Adding New Translation Keys

**When:** You add a new feature that needs translation

**Steps:**

1. **In PPCSL (core):**
   - Use translation key in component: `t('feature.newKey')`
   - Commit and push to PPCSL

2. **In each platform repository:**
   - Add translation to `locales/{country}.json`:
     ```json
     {
       "feature": {
         "newKey": "Translated text"
       }
     }
     ```
   - Commit and push

3. **CI/CD handles the rest**

---

## 4. File Structure Reference

### Platform Repository Structure

```
your-platform/
├── .gitmodules              # Git submodule configuration
├── .github/
│   └── workflows/
│       └── ci.yml          # CI/CD workflow
├── core/                    # Git submodule (PPCSL)
│   ├── frontend/
│   └── backend/
├── locales/
│   └── {country}.json      # Translations
├── theme/
│   └── colors.ts           # Color scheme
├── config/
│   └── site.ts             # Site configuration
└── README.md
```

### Key Files

#### `locales/{country}.json`

All user-facing text in your language. Must include all keys from core.

#### `theme/colors.ts`

Color scheme for your platform. Exports default object with primary, secondary, accent colors.

#### `config/site.ts`

Site-specific configuration:

- Domain name
- Locale
- Currency
- Support email
- Country code

#### `.github/workflows/ci.yml`

CI/CD workflow that:

1. Checks out repository with submodules
2. Copies platform files to core
3. Builds frontend and backend
4. Deploys to production

---

## 5. Troubleshooting

### Submodule Not Updating

```bash
cd your-platform
git submodule update --init --recursive
git submodule update --remote --merge core
```

### Build Can't Find Translations

- Ensure locale files are copied before build
- Check paths in CI/CD workflow
- Verify translation keys exist in `locales/{country}.json`

### Theme Not Loading

- Ensure theme files are copied before build
- Check that `theme/colors.ts` exports default object
- Verify Tailwind config can access theme

### CI/CD Fails with Submodule Error

- Verify `PAT_TOKEN` secret is set in GitHub repository
- Check that token has `repo` scope
- Ensure submodule URL is correct in `.gitmodules`

### Changes Not Appearing After Deploy

- Check CI/CD logs for errors
- Verify files were copied correctly
- Ensure environment variables are set
- Check that build completed successfully

### Translation Keys Missing

- Add missing keys to `locales/{country}.json`
- Ensure all keys from core are present
- Check for typos in key names

---

## Quick Reference

### Where to Make Changes

| Type of Change      | Repository                      | Location                  |
| ------------------- | ------------------------------- | ------------------------- |
| New feature         | PPCSL                           | `frontend/` or `backend/` |
| Bug fix             | PPCSL                           | `frontend/` or `backend/` |
| Translation         | Platform                        | `locales/{country}.json`  |
| Colors              | Platform                        | `theme/colors.ts`         |
| Site config         | Platform                        | `config/site.ts`          |
| New translation key | PPCSL (usage) + Platform (text) | Component + `locales/`    |

### Common Commands

```bash
# Update core submodule
cd your-platform
cd core
git pull origin main
cd ..

# Copy platform files for testing
mkdir -p core/frontend/lib/locales && cp locales/ro.json locales/ru.json locales/en.json core/frontend/lib/locales/ && cp locales/backend/*.json core/backend/src/common/i18n/
cp -r theme core/frontend/lib/
cp -r config core/frontend/lib/

# Test locally
cd core
npm run dev

# Build for production
cd core/frontend && npm run build
cd ../backend && npm run build
```

---

## 6. Analytics and monitoring configuration (GA, GTM, Sentry)

All settings are configured **only via environment variables**. Each platform has separate GA4, GTM (optional), and Sentry (Frontend + Backend) projects.

### Google Analytics

- **Load path:** direct `gtag.js` via `NEXT_PUBLIC_GA_ID` in `GoogleAnalytics.tsx` (required on production frontend).
- **`GoogleAnalytics.tsx`:** after idle + script load + granted consent, calls `gtag('config', gaId, { page_path })` for SPA page views; updates Consent Mode when consent is known. Consent defaults stay in `GoogleAnalyticsConsent.tsx`.
- **GTM:** container still loads; keep it free of a competing GA4 Configuration tag with automatic page_view to avoid double counting.

### Google Tag Manager

- **Current:** `GTM_ID` is hardcoded in `GoogleTagManager.tsx`. For multi-platform, move to `NEXT_PUBLIC_GTM_ID`.
- **Order in layout:** `GoogleTagManager` → `GoogleAnalyticsConsent` → `GoogleAnalytics`.
- GTM loads after idle (`lazyOnload`).

### Sentry (variables)

- **Frontend:** `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
- **Backend:** `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`

Detailed setup and integration: [SENTRY.md](./SENTRY.md).

### Example (Moldova, Frontend)

```env
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SENTRY_DSN=https://md-frontend@sentry.io/123456
SENTRY_ORG=kupito
SENTRY_PROJECT=kupito-frontend
```

### Checklist for new platform

- [ ] GA4: separate property; set `NEXT_PUBLIC_GA_ID`; verify `gtag/js` + collect hits and GA4 Realtime / DebugView
- [ ] GTM (optional): container and/or `NEXT_PUBLIC_GTM_ID` — no duplicate GA4 auto page_view while gtag.js is enabled
- [ ] Sentry: Frontend + Backend projects, DSN and env in both; see [SENTRY.md](./SENTRY.md) if needed

### Important

- Do not use one GA/Sentry project for multiple platforms.
- No fallback: core does not set default values.

**See also:** [ga4-events.md](../analytics/ga4-events.md), [SENTRY.md](./SENTRY.md), [platform-checklist.md](./platform-checklist.md).

---

**Related Documentation:**

- [multi-repository.md](../architecture/multi-repository.md) - Architecture overview
- [local-development.md](./local-development.md) - Local development guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment instructions
- [SENTRY.md](./SENTRY.md) - Sentry setup and monitoring
- [technical.md](../architecture/technical.md#13-cicd-configuration) - CI/CD configuration
