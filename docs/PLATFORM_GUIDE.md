# Platform Setup and Development Guide

Complete guide for creating new platforms and understanding where to make code changes.

---

## Table of Contents

1. [Where to Make Changes](#1-where-to-make-changes)
2. [Creating a New Platform](#2-creating-a-new-platform)
3. [Development Workflows](#3-development-workflows)
4. [File Structure Reference](#4-file-structure-reference)
5. [Troubleshooting](#5-troubleshooting)

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

**Important:** Copy all translation keys from `core/frontend/lib/messages/mk.json` (or another existing platform) and translate them to your language.

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

      - name: Copy locale files
        run: |
          cp -r locales core/frontend/lib/
          cp -r theme core/frontend/lib/
          cp -r config core/frontend/lib/

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
# Copy platform files to core
cp -r locales core/frontend/lib/
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
   cp -r locales core/frontend/lib/
   cp -r theme core/frontend/lib/
   cp -r config core/frontend/lib/
   ```

4. **Make changes:**
   - Edit `locales/{country}.json` for translations
   - Edit `theme/colors.ts` for colors
   - Edit `config/site.ts` for site configuration

5. **Copy files again and test:**
   ```bash
   cp -r locales core/frontend/lib/
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
   cp -r locales core/frontend/lib/
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

| Type of Change | Repository | Location |
|---------------|------------|----------|
| New feature | PPCSL | `frontend/` or `backend/` |
| Bug fix | PPCSL | `frontend/` or `backend/` |
| Translation | Platform | `locales/{country}.json` |
| Colors | Platform | `theme/colors.ts` |
| Site config | Platform | `config/site.ts` |
| New translation key | PPCSL (usage) + Platform (text) | Component + `locales/` |

### Common Commands

```bash
# Update core submodule
cd your-platform
cd core
git pull origin main
cd ..

# Copy platform files for testing
cp -r locales core/frontend/lib/
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

**Related Documentation:**
- [MULTI_REPOSITORY_ARCHITECTURE.md](./MULTI_REPOSITORY_ARCHITECTURE.md) - Architecture overview
- [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) - Local development guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment instructions
- [TECHNICAL.md](./TECHNICAL.md#13-cicd-configuration) - CI/CD configuration
