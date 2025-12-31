# Multi-Repository Architecture Guide

Complete guide for implementing multi-repository architecture with core project and locale-specific projects.

**Note:** The core repository is named **PPCSL** (Platform for posting car sale listings) and uses the repository name `ppcsl`.

---

## PPCSL Overview

**PPCSL** (Platform for Posting Car Sale Listings) is a core application framework designed to create unified car marketplace platforms for different countries. It provides all the essential functionality for listing, searching, and managing car sales, while allowing each country-specific platform to have its own branding, translations, colors, and domain.

### Core Concept

PPCSL serves as the **foundation** for building car marketplace platforms. Instead of maintaining separate codebases for each country, PPCSL provides a single, well-tested core that can be customized for each market through configuration files.

### What's in PPCSL Core

**Frontend Core:**
- All React components (Header, Footer, ListingCard, ListingForm, etc.)
- Pages and routes (home, listings, profile, admin, etc.)
- API client and server-side API functions
- State management (Zustand stores)
- Hooks and utilities
- Design system components
- Translation system interface (`lib/i18n.ts`)
- Theme system interface (`lib/theme.ts`)
- Site configuration interface (`lib/site-config.ts`)

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

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture Design](#2-architecture-design)
3. [Repository Structure](#3-repository-structure)
4. [Implementation Steps](#4-implementation-steps)
5. [Code Adaptation](#5-code-adaptation)
6. [CI/CD Configuration](#6-cicd-configuration)
7. [Migration Process](#7-migration-process)
8. [Workflow](#8-workflow)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Overview

### Concept

This architecture separates the core application code from locale-specific configurations (translations, colors, site configs) using separate repositories:

- **PPCSL** (Platform for posting car sale listings) - Core application code (shared across all locales)
- **kupito.club** - Platform for Macedonia - core + MK translations + MK colors

### Benefits

✅ **Isolation** - Each locale has its own repository and deployment  
✅ **Shared Code** - Core logic maintained in one place  
✅ **Independent Deployments** - Deploy each locale separately  
✅ **Easy Scaling** - Add new countries by creating new repository  
✅ **Version Control** - Separate history for each locale  

### Trade-offs

⚠️ **Complexity** - More repositories to manage  
⚠️ **Synchronization** - Need to keep core updates in sync  
⚠️ **Setup Time** - Initial setup requires more configuration  

---

## 2. Architecture Design

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
3. **On success**, updates are pushed to locale repositories (e.g., kupito.club)
4. **Locale repositories** build with their specific configurations
5. **Deployment** happens independently for each locale

---

## 3. Repository Structure

### 3.1. PPCSL Repository (ppcsl)

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

### 3.2. kupito.club Repository

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

## 4. Implementation Steps

### Step 1: Create PPCSL Repository (ppcsl)

1. **Create new GitHub repository** `ppcsl`
2. **Initialize repository:**
   ```bash
   mkdir ppcsl
   cd ppcsl
   git init
   ```

3. **Copy core files** (excluding locale-specific content):
   ```bash
   # From current project
   cp -r frontend/ ppcsl/
   cp -r backend/ ppcsl/
   cp package.json ppcsl/
   cp .gitignore ppcsl/
   ```

4. **Remove locale-specific hardcoded content** (see [Code Adaptation](#5-code-adaptation))

5. **Initial commit:**
   ```bash
   git add .
   git commit -m "Initial PPCSL repository"
   git remote add origin git@github.com:Hexj13/PPCSL.git
   git push -u origin main
   ```

### Step 2: Create kupito.club Repository

1. **Create new GitHub repository** `kupito.club`

2. **Initialize repository:**
   ```bash
   mkdir kupito.club
   cd kupito.club
   git init
   ```

3. **Add core as submodule:**
   ```bash
   git submodule add git@github.com:Hexj13/PPCSL.git core
   ```

4. **Create locale structure:**
   ```bash
   mkdir -p locales theme config
   ```

5. **Create `.gitmodules`:**
   ```ini
   [submodule "core"]
       path = core
       url = git@github.com:Hexj13/PPCSL.git
   ```

6. **Initial commit:**
   ```bash
   git add .
   git commit -m "Initial kupito.club repository with PPCSL core submodule"
   git remote add origin https://github.com/your-org/kupito.club.git
   git push -u origin main
   ```


---

## 5. Code Adaptation

### 5.1. Translation System

The translation system uses **synchronous static imports** to prevent "blinking" of translation keys on page load. Translations are loaded immediately when the module is initialized.

#### Create `frontend/lib/i18n.ts` in PPCSL (ppcsl)

```typescript
import mkTranslations from '@/messages/mk.json';

export type Locale = 'mk';

export interface Translations {
  footer: {
    copyright: string;
    tagline: string;
    faq: string;
    terms: string;
    privacy: string;
    cookieSettings: string;
  };
  header: {
    addListing: string;
    myListings: string;
    favorites: string;
    compare: string;
    login: string;
    register: string;
    logout: string;
    // ... all translation keys
  };
  // ... all translation sections
}

const DEFAULT_LOCALE: Locale = 'mk';

export function loadTranslations(locale: Locale): Translations {
  if (locale === 'mk') {
    return mkTranslations as Translations;
  }
  // Fallback to Macedonian if an unsupported locale is requested
  return mkTranslations as Translations;
}
```

#### Create `frontend/components/I18nProvider.tsx` (React Context Provider)

```typescript
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { loadTranslations, type Locale, type Translations } from '@/lib/i18n';

interface I18nContextType {
  locale: Locale;
  translations: Translations;
}

// Load translations synchronously at module initialization
const initialTranslations = loadTranslations('mk');
const initialLocale: Locale = 'mk';

const I18nContext = createContext<I18nContextType>({
  locale: initialLocale,
  translations: initialTranslations,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  return (
    <I18nContext.Provider value={{ locale: initialLocale, translations: initialTranslations }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
```

#### Create `frontend/hooks/useTranslation.ts` (Translation Hook)

```typescript
'use client';

import { useI18n } from '@/components/I18nProvider';
import type { Translations } from '@/lib/i18n';

export function useTranslation() {
  const { translations } = useI18n();

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: unknown = translations as Translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    // Support parameter replacement: t('message', { name: 'John' })
    if (params) {
      return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey]?.toString() || match;
      });
    }

    return value;
  };

  return { t, translations: translations as Translations };
}
```

**Usage in components:**

```typescript
'use client';

import { useTranslation } from '@/hooks/useTranslation';

export function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('header.addListing')}</h1>
      <p>{t('common.loading')}</p>
      <p>{t('userListings.title', { name: 'John' })}</p>
    </div>
  );
}
```

#### Create `kupito.club/locales/mk.json`

```json
{
  "header": {
    "addListing": "Додади објава",
    "myListings": "Мои објави",
    "favorites": "Омилени",
    "compare": "Споредба",
    "login": "Најави се",
    "register": "Регистрација",
    "logout": "Одјави се",
    "profile": "Профил",
    "admin": "Админ"
  },
  "footer": {
    "copyright": "Сите права се задржани",
    "tagline": "Купете или продадете авто на Kupito! Објавете оглас бесплатно.",
    "faq": "Често поставувани прашања",
    "terms": "Услови за користење",
    "privacy": "Политика за приватност"
  },
  "common": {
    "loading": "Вчитување...",
    "error": "Грешка",
    "success": "Успешно",
    "save": "Зачувај",
    "cancel": "Откажи",
    "delete": "Избриши",
    "edit": "Уреди"
  }
}
```

### 5.2. Theme System

#### Create `frontend/lib/theme.ts` in PPCSL (ppcsl)

```typescript
export interface ThemeColors {
  primary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  dark: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  bg: {
    dark: string;
    darker: string;
    light: string;
  };
  semantic: {
    success: string;
    error: string;
    warning: string;
    info: string;
  };
}

let theme: ThemeColors | null = null;

export async function loadTheme(country: string): Promise<ThemeColors> {
  if (theme) {
    return theme;
  }

  try {
    const module = await import(`./theme/colors`);
    theme = module.default;
    return theme;
  } catch (error) {
    console.error(`Failed to load theme for ${country}:`, error);
    throw new Error(`Theme for ${country} not found`);
  }
}

export function getTheme(): ThemeColors {
  if (!theme) {
    throw new Error('Theme not loaded. Call loadTheme first.');
  }
  return theme;
}

export function loadThemeSync(country: string): ThemeColors {
  try {
    // For build time (Tailwind config)
    const themeModule = require(`./theme/colors`);
    return themeModule.default;
  } catch (error) {
    console.error(`Failed to load theme for ${country}:`, error);
    throw new Error(`Theme for ${country} not found`);
  }
}
```

#### Create `kupito.club/theme/colors.ts`

```typescript
import { ThemeColors } from '../../core/frontend/lib/theme';

const colors: ThemeColors = {
  primary: {
    50: '#f0fdf7',
    100: '#d4fae8',
    200: '#aaf5d1',
    300: '#7ef0ba',
    400: '#6eeb9c',
    500: '#6eeb9c',
    600: '#3bc973',
    700: '#2da55f',
    800: '#1f814b',
    900: '#115d37',
  },
  dark: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#0d1117',
  },
  bg: {
    dark: '#1a2e2a',
    darker: '#152520',
    light: '#233d37',
  },
  semantic: {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  },
};

export default colors;
```

### 5.3. Site Configuration

#### Create `frontend/lib/site-config.ts` in PPCSL (ppcsl)

```typescript
export interface SiteConfig {
  country: string;
  name: string;
  domain: string;
  locale: string;
  currency: string;
  countryCode: string;
  supportEmail: string;
  siteUrl: string;
}

let config: SiteConfig | null = null;

export async function loadSiteConfig(country: string): Promise<SiteConfig> {
  if (config) {
    return config;
  }

  try {
    const module = await import(`./config/site`);
    config = module.default;
    return config;
  } catch (error) {
    console.error(`Failed to load site config for ${country}:`, error);
    throw new Error(`Site config for ${country} not found`);
  }
}

export function getSiteConfig(): SiteConfig {
  if (!config) {
    throw new Error('Site config not loaded. Call loadSiteConfig first.');
  }
  return config;
}
```

#### Create `kupito.club/config/site.ts`

```typescript
import { SiteConfig } from '../../core/frontend/lib/site-config';

const config: SiteConfig = {
  country: 'mk',
  name: 'Kupito',
  domain: 'kupito.club',
  locale: 'mk_MK',
  currency: 'MKD',
  countryCode: 'MK',
  supportEmail: 'support@kupito.club',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.club',
};

export default config;
```

### 5.4. Update Components

#### Example: Update `Header.tsx`

**Before:**
```typescript
<Link href="/listings/new">
  Додади објава
</Link>
```

**After:**
```typescript
'use client';

import { useTranslation } from '@/hooks/useTranslation';

export function Header() {
  const { t } = useTranslation();
  
  return (
    <Link href="/listings/new">
      {t('header.addListing')}
    </Link>
  );
}
```

### 5.5. Update Tailwind Config

#### Update `frontend/tailwind.config.js` in PPCSL (ppcsl)

```javascript
const { loadThemeSync } = require('./lib/theme');

const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';
const theme = loadThemeSync(country);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './ui/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: theme.primary,
        dark: theme.dark,
        bg: theme.bg,
        semantic: theme.semantic,
      },
    },
  },
  plugins: [],
};
```

### 5.6. Update Layout

#### Update `frontend/app/layout.tsx`

```typescript
import { loadSiteConfig } from '@/lib/site-config';
import { loadTheme } from '@/lib/theme';

export async function generateMetadata() {
  const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';
  const siteConfig = await loadSiteConfig(country);
  
  return {
    title: {
      default: `${siteConfig.name} - Автомобили`,
      template: `%s | ${siteConfig.name}`,
    },
    // ... rest of metadata using siteConfig
  };
}
```

### 5.7. Copy Files During Build

In locale repositories, create a build script that copies locale files to core:

**kupito.club/package.json:**
```json
{
  "scripts": {
    "prepare:build": "cp -r locales core/frontend/lib/ && cp -r theme core/frontend/lib/ && cp -r config core/frontend/lib/",
    "build": "npm run prepare:build && cd core/frontend && npm run build",
    "build:backend": "cd core/backend && npm run build"
  }
}
```

---

## 6. CI/CD Configuration

### 6.1. PPCSL (ppcsl) CI/CD

**Important:** PPCSL core CI/CD does NOT include build steps. Build requires locale-specific files (translations, theme, config) that don't exist in core. Build is done in platform repositories (e.g., kupito.club) where locale files are available.

**Why no build in core:**
- Build requires locale-specific files (translations, theme, config) that don't exist in core
- Build in core would use default values, not reflecting real production builds
- Build is done in platform repositories where locale files are available
- TypeScript type checking (`tsc --noEmit`) is sufficient to verify code compiles correctly

Create `.github/workflows/ci.yml` in ppcsl:

```yaml
name: CI/CD Core

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  backend-test:
    name: Backend Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: kupito
          POSTGRES_PASSWORD: kupito123
          POSTGRES_DB: kupito_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U kupito"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: ./backend
        run: npm ci

      - name: Wait for PostgreSQL
        run: |
          sudo apt-get update
          sudo apt-get install -y postgresql-client
          until pg_isready -h localhost -p 5432 -U kupito; do
            echo "Waiting for PostgreSQL..."
            sleep 2
          done

      - name: Run linter
        working-directory: ./backend
        run: npm run lint:check

      - name: Run tests
        working-directory: ./backend
        env:
          NODE_ENV: test
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USERNAME: kupito
          DB_PASSWORD: kupito123
          DB_NAME: kupito_test
          JWT_SECRET: test-secret-key
          REDIS_HOST: localhost
          REDIS_PORT: 6379
        run: npm test

      - name: Run integration tests
        working-directory: ./backend
        env:
          NODE_ENV: test
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USERNAME: kupito
          DB_PASSWORD: kupito123
          DB_NAME: kupito_test
          JWT_SECRET: test-secret-key
          REDIS_HOST: localhost
          REDIS_PORT: 6379
        run: timeout 300 npm run test:integration

  frontend-test:
    name: Frontend Tests & Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Run linter
        working-directory: ./frontend
        run: npm run lint

      - name: Check formatting
        working-directory: ./frontend
        run: npm run format:check

      - name: Run tests
        working-directory: ./frontend
        run: npm test -- --passWithNoTests

  typecheck:
    name: TypeScript Type Check
    runs-on: ubuntu-latest
    needs: [backend-test, frontend-test]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install frontend dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Install backend dependencies
        working-directory: ./backend
        run: npm ci

      - name: TypeScript type check (frontend)
        working-directory: ./frontend
        run: npx tsc --noEmit

      - name: TypeScript type check (backend)
        working-directory: ./backend
        run: npx tsc --noEmit

  sync-to-locales:
    name: Sync to Locale Repositories
    runs-on: ubuntu-latest
    needs: [typecheck]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Update kupito.club submodule
        env:
          PAT_TOKEN: ${{ secrets.PAT_TOKEN }}
        run: |
          if [ -z "$PAT_TOKEN" ]; then
            echo "⚠️ PAT_TOKEN secret not set. Skipping submodule update."
            echo "To enable automatic submodule updates, add a Personal Access Token (PAT) with repo scope to repository secrets as PAT_TOKEN"
            exit 0
          fi
          
          # Setup git credential helper to avoid storing token in .git/config
          # Use temporary credential file that will be cleaned up
          CREDENTIAL_FILE=$(mktemp)
          echo "https://x-access-token:${PAT_TOKEN}@github.com" > "$CREDENTIAL_FILE"
          git config --global credential.helper "store --file=$CREDENTIAL_FILE"
          
          # Clone repository (token provided via credential helper, not in URL)
          git clone https://github.com/Hexj13/kupito.club.git ../kupito.club || exit 0
          cd ../kupito.club
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
          
          # Cleanup: remove credential file and unset credential helper
          rm -f "$CREDENTIAL_FILE"
          git config --global --unset credential.helper

```

### 6.2. kupito.club CI/CD

Create `.github/workflows/ci.yml` in kupito.club:

```yaml
name: CI/CD MK

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    name: Build and Deploy MK
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Copy locale files to core
        run: |
          cp -r locales core/frontend/lib/
          cp -r theme core/frontend/lib/
          cp -r config core/frontend/lib/

      - name: Install frontend dependencies
        working-directory: ./core/frontend
        run: npm ci

      - name: Install backend dependencies
        working-directory: ./core/backend
        run: npm ci

      - name: Build frontend
        working-directory: ./core/frontend
        env:
          NEXT_PUBLIC_COUNTRY: mk
          NEXT_PUBLIC_SITE_URL: https://kupito.club
          NEXT_PUBLIC_API_URL: ${{ secrets.API_URL }}
        run: npm run build

      - name: Build backend
        working-directory: ./core/backend
        run: npm run build

      - name: Deploy
        # Add your deployment steps here
        run: |
          echo "Deploy to production..."
          # Your deployment commands
```

---

## 7. Migration Process

### 7.1. Extract Translations

1. **Identify all hardcoded texts** in components:
   ```bash
   # Find all hardcoded Macedonian text
   grep -r "Додади објава" frontend/
   grep -r "Мои објави" frontend/
   # ... etc
   ```

2. **Create translation keys** for each text

3. **Replace hardcoded texts** with `t('key.path')` calls using the `useTranslation` hook

4. **Create JSON files** with all translations

### 7.2. Extract Colors

1. **Identify color usage:**
   - `tailwind.config.js`
   - `frontend/ui/design-tokens.ts`
   - `frontend/app/globals.css`

2. **Create theme files** for each locale

3. **Update Tailwind config** to use dynamic theme

### 7.3. Extract Site Configuration

1. **Find all hardcoded URLs:**
   ```bash
   grep -r "kupito.club" frontend/
   grep -r "support@kupito" frontend/
   ```

2. **Create config files** for each locale

3. **Replace hardcoded values** with config

### 7.4. Migration Checklist

**Pre-Migration (Monolith Preparation):**
- [x] Create PPCSL (ppcsl) repository (git@github.com:Hexj13/PPCSL.git)
- [x] Remove all hardcoded texts from components
- [x] Create translation system
- [x] Create theme system
- [x] Create site config system
- [x] Update all components to use translations
- [x] Update Tailwind config
- [x] Update all layout files to use site-config
- [x] Update all components to use site-config instead of hardcoded URLs
- [x] Make translation system dynamic (use site-config for locale)
- [x] Make PWA manifest dynamic (use site-config and translations)
- [x] Replace hardcoded currency values with site-config
- [x] Replace hardcoded locale values in components
- [x] Update tests to use dynamic values

**Migration (Repository Split):**
- [ ] Create kupito.club repository
- [ ] Add submodules
- [ ] Create locale files (MK)
- [ ] Create theme files (MK)
- [ ] Create config files (MK)
- [ ] Setup CI/CD in PPCSL
- [ ] Setup CI/CD in kupito.club
- [ ] Test build process
- [ ] Test deployment

---

## 11. Pre-Migration Checklist

List of tasks that need to be completed in the monolith before splitting into PPCSL and kupito.club.

### ✅ Completed

- [x] Translation system created (`frontend/lib/i18n.ts`)
- [x] Theme system created (`frontend/lib/theme.ts`)
- [x] Site configuration system created (`frontend/lib/site-config.ts`)
- [x] All components updated to use translations
- [x] Tailwind config updated for dynamic theme loading
- [x] All layout files updated to use `site-config`
- [x] All components updated to use `site-config` instead of hardcoded URLs
- [x] CI/CD section added to technical documentation (`docs/TECHNICAL.md`)
- [x] Configurable watermark (uses `WATERMARK_DOMAIN`)

### 🔄 Remaining Tasks

#### 1. Translation System (i18n)

**Problem:** Translation system hardcodes `mkTranslations` import and always returns Macedonian translations.

**What's needed:**
- [x] Implement dynamic translation loading based on `NEXT_PUBLIC_COUNTRY`
- [x] Update `loadTranslations` to use `site-config` for locale determination
- [x] Update `getServerTranslations` to use `site-config`
- [x] Update `app/not-found.tsx` to use dynamic locale

#### 2. PWA Manifest

**Problem:** `frontend/app/manifest.ts` hardcodes Macedonian text and 'mk' locale.

**What's needed:**
- [x] Use `site-config` for dynamic manifest generation
- [x] Use translations for manifest texts
- [x] Use `siteConfig.locale` instead of hardcoded 'mk'

#### 3. Currency and Localization

**Problem:** Hardcoded currency 'MKD' and locale 'mk' values in multiple places.

**What's needed:**
- [x] Use `siteConfig.currency` instead of hardcoded 'MKD'
- [x] Use `siteConfig.locale` for `localeCompare`
- [x] Update `formatPrice` to use `siteConfig.currency`
- [x] Update analytics to use `siteConfig.currency`

#### 4. Components with Hardcoded Values

**What's needed:**
- [x] Replace all `localeCompare(..., 'mk')` with `siteConfig.locale`
- [x] Ensure all components use `siteConfig.currency` instead of hardcoded values

#### 5. Tests

**Problem:** Tests may contain hardcoded 'MKD' and 'mk' values.

**What's needed:**
- [x] Update tests to use `site-config` or mocks
- [x] Ensure tests don't depend on hardcoded values

### 🎯 Readiness Criteria for Split

The monolith is ready for splitting when:

- [x] All systems (translations, themes, configuration) load dynamically
- [x] No hardcoded locale, currency, or domain values (except in tests and constants)
- [x] All components use `site-config`, `theme`, and `i18n` systems
- [x] PWA manifest is generated dynamically
- [x] All tests pass
- [x] Build succeeds (frontend and backend)
- [x] Linter passes without errors
- [x] Formatting meets standards

**Note:** See detailed pre-migration tasks above.

---

## 8. Workflow

### 8.1. Development Workflow

1. **Make changes** in `ppcsl` (PPCSL)
2. **Commit and push** to `ppcsl/main`
3. **CI/CD runs** in `ppcsl`:
   - Tests pass
   - Linters and formatters pass
   - TypeScript type checking passes
   - Submodules updated in locale repos (e.g., kupito.club)
4. **CI/CD runs** in locale repos:
   - Core submodule updated
   - Locale files copied
   - Build with locale config
   - Deploy to production

### 8.2. Adding New Locale (Future)

When adding new platforms in the future:

1. **Create new repository** for the new platform (e.g., `example.com`)

2. **Add PPCSL core as submodule:**
   ```bash
   cd example.com
   git submodule add git@github.com:Hexj13/PPCSL.git core
   ```

3. **Create locale files:**
   - `locales/{country}.json` - All translations
   - `theme/colors.ts` - Color scheme
   - `config/site.ts` - Site configuration (domain, locale, currency, etc.)

4. **Update CI/CD in PPCSL** (`.github/workflows/ci.yml`):
   Add a new step in `sync-to-locales` job:
   ```yaml
   - name: Update example.com submodule
     env:
       PAT_TOKEN: ${{ secrets.PAT_TOKEN }}
     run: |
       if [ -z "$PAT_TOKEN" ]; then
         echo "⚠️ PAT_TOKEN secret not set. Skipping submodule update."
         exit 0
       fi
       
       # Setup git credential helper to avoid storing token in .git/config
       # Use temporary credential file that will be cleaned up
       CREDENTIAL_FILE=$(mktemp)
       echo "https://x-access-token:${PAT_TOKEN}@github.com" > "$CREDENTIAL_FILE"
       git config --global credential.helper "store --file=$CREDENTIAL_FILE"
       
       # Clone repository (token provided via credential helper, not in URL)
       git clone https://github.com/Hexj13/example.com.git ../example.com || exit 0
       cd ../example.com
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
       
       # Cleanup: remove credential file and unset credential helper
       rm -f "$CREDENTIAL_FILE"
       git config --global --unset credential.helper
   ```

5. **Setup CI/CD in new locale repository:**
   Create `.github/workflows/ci.yml` in the new repository (copy from kupito.club and adjust country/locale settings)

**Result:** When you push changes to PPCSL, all platforms (kupito.club, example.com, etc.) will automatically update their submodules and trigger builds.

### 8.3. Updating Core

1. **Make changes** in `ppcsl` (PPCSL)
2. **Test locally** with kupito.club
3. **Commit and push**
4. **Automatic sync** to locale repositories

### 8.4. Updating Locale-Specific Content

1. **Make changes** in locale repository (kupito.club)
2. **Update** `locales/mk.json`, `theme/colors.ts`, or `config/site.ts`
3. **Commit and push**
4. **CI/CD builds** and deploys kupito.club platform

---

## 9. Troubleshooting

### 9.1. Submodule Issues

**Problem:** Submodule not updating

**Solution:**
```bash
cd kupito.club
git submodule update --init --recursive
git submodule update --remote --merge core
```

### 9.2. Build Fails - Translations Not Found

**Problem:** `Translations for mk not found`

**Solution:**
- Ensure locale files are copied before build
- Check file paths in build script
- Verify `NEXT_PUBLIC_COUNTRY` environment variable

### 9.3. Theme Not Loading

**Problem:** Colors not applied

**Solution:**
- Ensure theme files are copied before build
- Check Tailwind config path resolution
- Verify theme file exports default

### 9.4. CI/CD Sync Fails

**Problem:** Submodule update fails in CI/CD

**Solution:**
- Check GitHub token permissions
- Ensure token has write access to locale repositories
- Verify repository URLs in `.gitmodules`

### 9.5. Import Errors

**Problem:** `Cannot find module './locales/mk.json'`

**Solution:**
- Use dynamic imports: `await import(\`./locales/${country}.json\`)`
- Ensure files are copied to correct location
- Check file extensions in imports

---

## 10. Best Practices

1. **Always test** core changes with kupito.club before pushing
2. **Keep translations** in sync - if you add a new key, add it to all locales
3. **Version core** - use semantic versioning for major changes
4. **Document changes** - update this guide when architecture changes
5. **Monitor builds** - ensure locale builds succeed after core updates
6. **Backup** - keep backups of locale-specific files
7. **Code review** - review core changes carefully as they affect all platforms

---

## 11. Additional Resources

- [Git Submodules Documentation](https://git-scm.com/book/en/v2/Git-Tools-Submodules)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

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

The setup requires initial investment but provides long-term benefits for multi-platform applications.

