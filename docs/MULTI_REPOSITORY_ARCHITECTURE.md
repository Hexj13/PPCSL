# Multi-Repository Architecture Guide

Complete guide for implementing multi-repository architecture with core project and locale-specific projects.

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

This architecture separates the core application code from locale-specific configurations (translations, colors, site configs) using three separate repositories:

- **kupito-core** - Core application code (shared across all locales)
- **kupito-mk** - Macedonia-specific project (core + MK translations + MK colors)
- **kupito-al** - Albania-specific project (core + AL translations + AL colors)

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
kupito-core (GitHub)
    │
    ├─── kupito-mk (GitHub)
    │    └── core/ (Git Submodule → kupito-core)
    │    └── locales/mk.json
    │    └── theme/colors.ts
    │    └── config/site.ts
    │
    └─── kupito-al (GitHub)
         └── core/ (Git Submodule → kupito-core)
         └── locales/al.json
         └── theme/colors.ts
         └── config/site.ts
```

### Dependency Flow

1. **Development** happens in `kupito-core`
2. **CI/CD** in `kupito-core` tests and builds
3. **On success**, updates are pushed to locale repositories
4. **Locale repositories** build with their specific configurations
5. **Deployment** happens independently for each locale

---

## 3. Repository Structure

### 3.1. kupito-core Repository

```
kupito-core/
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

### 3.2. kupito-mk Repository

```
kupito-mk/
├── .gitmodules                 # Git submodule configuration
├── core/                       # Git submodule (kupito-core)
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

### 3.3. kupito-al Repository

```
kupito-al/
├── .gitmodules                 # Git submodule configuration
├── core/                       # Git submodule (kupito-core)
│   ├── frontend/
│   └── backend/
├── locales/
│   └── al.json                 # All Albanian translations
├── theme/
│   └── colors.ts              # Albanian color scheme
├── config/
│   └── site.ts                # Site configuration (domain, email, etc.)
├── .github/
│   └── workflows/
│       └── ci.yml             # Build and deploy for AL
├── package.json
└── README.md
```

---

## 4. Implementation Steps

### Step 1: Create kupito-core Repository

1. **Create new GitHub repository** `kupito-core`
2. **Initialize repository:**
   ```bash
   mkdir kupito-core
   cd kupito-core
   git init
   ```

3. **Copy core files** (excluding locale-specific content):
   ```bash
   # From current project
   cp -r frontend/ kupito-core/
   cp -r backend/ kupito-core/
   cp package.json kupito-core/
   cp .gitignore kupito-core/
   ```

4. **Remove locale-specific hardcoded content** (see [Code Adaptation](#5-code-adaptation))

5. **Initial commit:**
   ```bash
   git add .
   git commit -m "Initial core repository"
   git remote add origin https://github.com/your-org/kupito-core.git
   git push -u origin main
   ```

### Step 2: Create kupito-mk Repository

1. **Create new GitHub repository** `kupito-mk`

2. **Initialize repository:**
   ```bash
   mkdir kupito-mk
   cd kupito-mk
   git init
   ```

3. **Add core as submodule:**
   ```bash
   git submodule add https://github.com/your-org/kupito-core.git core
   ```

4. **Create locale structure:**
   ```bash
   mkdir -p locales theme config
   ```

5. **Create `.gitmodules`:**
   ```ini
   [submodule "core"]
       path = core
       url = https://github.com/your-org/kupito-core.git
   ```

6. **Initial commit:**
   ```bash
   git add .
   git commit -m "Initial MK repository with core submodule"
   git remote add origin https://github.com/your-org/kupito-mk.git
   git push -u origin main
   ```

### Step 3: Create kupito-al Repository

Repeat Step 2 for Albania:

```bash
mkdir kupito-al
cd kupito-al
git init
git submodule add https://github.com/your-org/kupito-core.git core
mkdir -p locales theme config
# ... create files (see below)
git add .
git commit -m "Initial AL repository with core submodule"
git remote add origin https://github.com/your-org/kupito-al.git
git push -u origin main
```

---

## 5. Code Adaptation

### 5.1. Translation System

#### Create `frontend/lib/i18n.ts` in kupito-core

```typescript
export interface Translations {
  header: {
    addListing: string;
    myListings: string;
    favorites: string;
    compare: string;
    login: string;
    register: string;
    logout: string;
    profile: string;
    admin: string;
  };
  footer: {
    copyright: string;
    tagline: string;
    faq: string;
    terms: string;
    privacy: string;
  };
  common: {
    loading: string;
    error: string;
    success: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    // ... add all common texts
  };
  // ... add all translation keys
}

let translations: Translations | null = null;

export async function loadTranslations(country: string): Promise<Translations> {
  if (translations) {
    return translations;
  }

  try {
    const module = await import(`./locales/${country}.json`);
    translations = module.default;
    return translations;
  } catch (error) {
    console.error(`Failed to load translations for ${country}:`, error);
    throw new Error(`Translations for ${country} not found`);
  }
}

export function getTranslations(): Translations {
  if (!translations) {
    throw new Error('Translations not loaded. Call loadTranslations first.');
  }
  return translations;
}

export function useTranslations(): Translations {
  const [t, setT] = useState<Translations | null>(null);
  const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';

  useEffect(() => {
    loadTranslations(country).then(setT);
  }, [country]);

  if (!t) {
    return {} as Translations; // Return empty object during loading
  }

  return t;
}
```

#### Create `frontend/lib/i18n-hook.tsx` (React Hook)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { loadTranslations, Translations } from './i18n';

export function useTranslations(): Translations {
  const [translations, setTranslations] = useState<Translations | null>(null);
  const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';

  useEffect(() => {
    loadTranslations(country)
      .then(setTranslations)
      .catch((error) => {
        console.error('Failed to load translations:', error);
      });
  }, [country]);

  if (!translations) {
    return {} as Translations;
  }

  return translations;
}
```

#### Create `kupito-mk/locales/mk.json`

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

#### Create `kupito-al/locales/al.json`

```json
{
  "header": {
    "addListing": "Shto njoftim",
    "myListings": "Njoftimet e mia",
    "favorites": "Të preferuarat",
    "compare": "Krahasimi",
    "login": "Hyr",
    "register": "Regjistrohu",
    "logout": "Dil",
    "profile": "Profili",
    "admin": "Admin"
  },
  "footer": {
    "copyright": "Të gjitha të drejtat e rezervuara",
    "tagline": "Bli ose shisni makinë në Kupito!",
    "faq": "Pyetjet e shpeshta",
    "terms": "Kushtet e përdorimit",
    "privacy": "Politika e privatësisë"
  },
  "common": {
    "loading": "Duke u ngarkuar...",
    "error": "Gabim",
    "success": "Sukses",
    "save": "Ruaj",
    "cancel": "Anulo",
    "delete": "Fshi",
    "edit": "Redakto"
  }
}
```

### 5.2. Theme System

#### Create `frontend/lib/theme.ts` in kupito-core

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

#### Create `kupito-mk/theme/colors.ts`

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

#### Create `kupito-al/theme/colors.ts`

```typescript
import { ThemeColors } from '../../core/frontend/lib/theme';

const colors: ThemeColors = {
  primary: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',  // Red (Albanian flag color)
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
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
    dark: '#1a0a0a',  // Dark red tones
    darker: '#0f0505',
    light: '#2d1515',
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

#### Create `frontend/lib/site-config.ts` in kupito-core

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

#### Create `kupito-mk/config/site.ts`

```typescript
import { SiteConfig } from '../../core/frontend/lib/site-config';

const config: SiteConfig = {
  country: 'mk',
  name: 'Kupito',
  domain: 'kupito.mk',
  locale: 'mk_MK',
  currency: 'MKD',
  countryCode: 'MK',
  supportEmail: 'support@kupito.club',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.mk',
};

export default config;
```

#### Create `kupito-al/config/site.ts`

```typescript
import { SiteConfig } from '../../core/frontend/lib/site-config';

const config: SiteConfig = {
  country: 'al',
  name: 'Kupito Albania',
  domain: 'kupito.al',
  locale: 'sq_AL',
  currency: 'ALL',
  countryCode: 'AL',
  supportEmail: 'support@kupito.al',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.al',
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

import { useTranslations } from '@/lib/i18n-hook';

export function Header() {
  const t = useTranslations();
  
  return (
    <Link href="/listings/new">
      {t.header.addListing}
    </Link>
  );
}
```

### 5.5. Update Tailwind Config

#### Update `frontend/tailwind.config.js` in kupito-core

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

**kupito-mk/package.json:**
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

### 6.1. kupito-core CI/CD

Create `.github/workflows/ci.yml` in kupito-core:

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

  frontend-build:
    name: Frontend Build
    runs-on: ubuntu-latest
    needs: [backend-test, frontend-test]
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

      - name: Build (test with default locale)
        working-directory: ./frontend
        env:
          NEXT_PUBLIC_API_URL: http://localhost:4000
          NEXT_PUBLIC_COUNTRY: mk
        run: npm run build

  backend-build:
    name: Backend Build
    runs-on: ubuntu-latest
    needs: [backend-test, frontend-test]
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

      - name: Build
        working-directory: ./backend
        run: npm run build

  sync-to-locales:
    name: Sync to Locale Repositories
    runs-on: ubuntu-latest
    needs: [frontend-build, backend-build]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Update kupito-mk submodule
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          git clone https://github.com/your-org/kupito-mk.git ../kupito-mk
          cd ../kupito-mk
          git submodule update --init --recursive
          cd core
          git fetch origin
          git checkout ${{ github.sha }}
          cd ..
          git add core
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git commit -m "chore: update core to ${{ github.sha }}" || exit 0
          git push origin main

      - name: Update kupito-al submodule
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          git clone https://github.com/your-org/kupito-al.git ../kupito-al
          cd ../kupito-al
          git submodule update --init --recursive
          cd core
          git fetch origin
          git checkout ${{ github.sha }}
          cd ..
          git add core
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git commit -m "chore: update core to ${{ github.sha }}" || exit 0
          git push origin main
```

### 6.2. kupito-mk CI/CD

Create `.github/workflows/ci.yml` in kupito-mk:

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
          NEXT_PUBLIC_SITE_URL: https://kupito.mk
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

### 6.3. kupito-al CI/CD

Create `.github/workflows/ci.yml` in kupito-al (similar to MK, but with `al` locale):

```yaml
name: CI/CD AL

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    name: Build and Deploy AL
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
          NEXT_PUBLIC_COUNTRY: al
          NEXT_PUBLIC_SITE_URL: https://kupito.al
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

3. **Replace hardcoded texts** with `t.key` calls

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
   grep -r "kupito.mk" frontend/
   grep -r "support@kupito" frontend/
   ```

2. **Create config files** for each locale

3. **Replace hardcoded values** with config

### 7.4. Migration Checklist

- [ ] Create kupito-core repository
- [ ] Remove all hardcoded texts from components
- [ ] Create translation system
- [ ] Create theme system
- [ ] Create site config system
- [ ] Update all components to use translations
- [ ] Update Tailwind config
- [ ] Create kupito-mk repository
- [ ] Create kupito-al repository
- [ ] Add submodules
- [ ] Create locale files (MK)
- [ ] Create locale files (AL)
- [ ] Create theme files (MK)
- [ ] Create theme files (AL)
- [ ] Create config files (MK)
- [ ] Create config files (AL)
- [ ] Setup CI/CD in core
- [ ] Setup CI/CD in MK
- [ ] Setup CI/CD in AL
- [ ] Test build process
- [ ] Test deployment

---

## 8. Workflow

### 8.1. Development Workflow

1. **Make changes** in `kupito-core`
2. **Commit and push** to `kupito-core/main`
3. **CI/CD runs** in `kupito-core`:
   - Tests pass
   - Build succeeds
   - Submodules updated in locale repos
4. **CI/CD runs** in locale repos:
   - Core submodule updated
   - Locale files copied
   - Build with locale config
   - Deploy to production

### 8.2. Adding New Locale

1. **Create new repository** `kupito-{country}`
2. **Add core as submodule**
3. **Create locale files:**
   - `locales/{country}.json`
   - `theme/colors.ts`
   - `config/site.ts`
4. **Update CI/CD** in `kupito-core` to include new locale
5. **Setup CI/CD** in new locale repository

### 8.3. Updating Core

1. **Make changes** in `kupito-core`
2. **Test locally** with both locales
3. **Commit and push**
4. **Automatic sync** to locale repositories

### 8.4. Updating Locale-Specific Content

1. **Make changes** in locale repository (e.g., `kupito-mk`)
2. **Update** `locales/mk.json`, `theme/colors.ts`, or `config/site.ts`
3. **Commit and push**
4. **CI/CD builds** and deploys only that locale

---

## 9. Troubleshooting

### 9.1. Submodule Issues

**Problem:** Submodule not updating

**Solution:**
```bash
cd kupito-mk
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

1. **Always test** core changes with both locales before pushing
2. **Keep translations** in sync - if you add a new key, add it to all locales
3. **Version core** - use semantic versioning for major changes
4. **Document changes** - update this guide when architecture changes
5. **Monitor builds** - ensure all locale builds succeed after core updates
6. **Backup** - keep backups of locale-specific files
7. **Code review** - review core changes carefully as they affect all locales

---

## 11. Additional Resources

- [Git Submodules Documentation](https://git-scm.com/book/en/v2/Git-Tools-Submodules)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

---

## Summary

This architecture provides:

✅ **Separation of concerns** - Core code separate from locale-specific content  
✅ **Independent deployments** - Each locale can be deployed separately  
✅ **Easy scaling** - Add new countries by creating new repository  
✅ **Maintainability** - Core changes automatically sync to all locales  
✅ **Flexibility** - Each locale can have custom configurations  

The setup requires initial investment but provides long-term benefits for multi-locale applications.

