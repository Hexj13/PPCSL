---
title: Local development
owner: platform
tags:
  - type/guide
  - domain/engineering
  - scope/core
  - status/active
---

# Local development

Complete guide for working locally with multi-repository architecture (PPCSL core and platform repositories).

**Works for any country:** set the platform code in `NEXT_PUBLIC_COUNTRY` (frontend) and `COUNTRY` (scripts), e.g. `md` for Moldova.

---

## Overview

There are two ways to work locally:

1. **Working in PPCSL (core)** - For developing core functionality
2. **Working in kupito.club** - For developing platform-specific features and testing with real locale files

Both approaches allow you to develop and test changes locally before pushing to remote repositories.

---

## Prerequisites

- Node.js 18+
- Docker and Docker Compose (for PostgreSQL and Redis)
- Git
- Basic understanding of Git submodules

---

## Option 1: Working in PPCSL (Core Repository)

Use this approach when:

- Developing core functionality (components, API, business logic)
- Making changes that affect all platforms
- Testing core features without platform-specific configurations

### Setup

1. **Clone PPCSL repository:**

   ```bash
   git clone git@github.com:Hexj13/PPCSL.git
   cd PPCSL
   ```

2. **Install dependencies:**

   ```bash
   npm run install:all
   ```

3. **Start Docker containers:**

   ```bash
   docker-compose up -d
   ```

4. **Setup environment variables:**

   Create `backend/.env`:

   ```env
   PORT=4000
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=ppcsl
   DB_PASSWORD=ppcsl123
   DB_NAME=ppcsl
   JWT_SECRET=your-secret-key-change-in-production
   FRONTEND_URL=http://localhost:3000
   NODE_ENV=development

   # Twilio SMS Configuration
   TWILIO_ACCOUNT_SID=your-twilio-account-sid
   TWILIO_AUTH_TOKEN=your-twilio-auth-token
   TWILIO_MESSAGING_SERVICE_SID=your-twilio-messaging-service-sid

   # Redis Configuration
   REDIS_HOST=localhost
   REDIS_PORT=6379

   # Infocar partner (optional; for signed report URL)
   # INFOCAR_SECRET_KEY=<secret-from-infocar>

   # SMTP (optional): ../operations/smtp-email-setup.md (EN) or ../operations/smtp-email-setup-ru.md (RU)
   ```

   Create `frontend/.env.local`:

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000
   NEXT_PUBLIC_COUNTRY=<country>
   ```

   Replace `<country>` with your platform's ISO 3166-1 alpha-2 code (e.g. `md` for Moldova).

5. **Run database migrations:**
   ```bash
   cd backend
   npm run build
   npm run migration:run
   ```

### Running the Project

**Option A: Run both servers together (recommended):**

```bash
npm run dev
```

**Option B: Run servers separately:**

```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**Access:**

- Frontend: http://localhost:3000
- Backend: http://localhost:4000

### Important Notes

- **No locale files**: Core repository doesn't have `locales/`, `theme/`, or `config/` files
- **Default values**: The app will use default translations, theme, and config (fallback values)
- **Console warnings**: You'll see warnings about missing locale files - this is expected
- **Testing**: Core functionality can be tested, but UI will use default values

### Workflow

1. Make changes in PPCSL
2. Test locally
3. Commit and push to PPCSL
4. CI/CD will automatically update submodules in platform repositories

---

## Option 2: Working in kupito.club (Platform Repository)

Use this approach when:

- Developing platform-specific features (translations, theme, config)
- Testing with real locale files
- Making changes that need platform-specific configurations
- Working on kupito.club-specific features

### Setup

1. **Clone kupito.club repository:**

   ```bash
   git clone git@github.com:Hexj13/kupito.club.git
   cd kupito.club
   ```

2. **Initialize and update submodules:**

   ```bash
   git submodule update --init --recursive
   ```

3. **Copy platform files to core:**

   ```bash
   # Translations are loaded directly from root, but copying provides fallback
   # Theme and config files must be copied as they are TypeScript modules
   mkdir -p core/frontend/lib/locales && cp locales/ro.json locales/ru.json locales/en.json core/frontend/lib/locales/ && cp locales/backend/*.json core/backend/src/common/i18n/  # Frontend ro/ru/en + backend locales
   cp -r theme core/frontend/lib/   # Required
   cp -r config core/frontend/lib/  # Required
   ```

4. **Install dependencies:**

   ```bash
   # Install root dependencies
   npm install

   # Install core dependencies
   cd core
   npm run install:all
   cd ..
   ```

5. **Start Docker containers:**

   ```bash
   cd core
   docker-compose up -d
   cd ..
   ```

6. **Setup environment variables:**

   Create `core/backend/.env`:

   ```env
   PORT=4000
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=ppcsl
   DB_PASSWORD=ppcsl123
   DB_NAME=ppcsl
   JWT_SECRET=your-secret-key-change-in-production
   FRONTEND_URL=http://localhost:3000
   NODE_ENV=development

   # Twilio SMS Configuration
   TWILIO_ACCOUNT_SID=your-twilio-account-sid
   TWILIO_AUTH_TOKEN=your-twilio-auth-token
   TWILIO_MESSAGING_SERVICE_SID=your-twilio-messaging-service-sid

   # Redis Configuration
   REDIS_HOST=localhost
   REDIS_PORT=6379

   # Infocar partner (optional; for signed report URL)
   # INFOCAR_SECRET_KEY=<secret-from-infocar>

   # SMTP (optional): ../operations/smtp-email-setup.md (EN) or ../operations/smtp-email-setup-ru.md (RU)
   ```

   Create `core/frontend/.env.local`:

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000
   NEXT_PUBLIC_COUNTRY=<country>
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

   Replace `<country>` with your platform's ISO 3166-1 alpha-2 code (e.g. `md` for Moldova).

7. **Run database migrations:**
   ```bash
   cd core/backend
   npm run build
   npm run migration:run
   cd ../..
   ```

### Running the Project

**Option A: Run both servers together:**

```bash
cd core
npm run dev
```

**Option B: Run servers separately:**

```bash
# Terminal 1 - Backend
cd core/backend
npm run start:dev

# Terminal 2 - Frontend
cd core/frontend
npm run dev
```

**Access:**

- Frontend: http://localhost:3000 (with real Romanian and Russian translations and theme)
- Backend: http://localhost:4000

### Important Notes

- **Locale files available**: All translations, theme, and config files are available
- **Real platform experience**: You'll see the actual kupito.club branding and translations
- **Submodule updates**: When PPCSL core is updated, you need to update the submodule:
  ```bash
  cd core
  git fetch origin
  git checkout main  # or specific commit
  cd ..
  ```

### Workflow

#### Making Changes to Core (from kupito.club)

If you need to make changes to core while working in kupito.club:

1. **Navigate to core:**

   ```bash
   cd core
   ```

2. **Create a new branch (recommended):**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**

4. **Test locally** (locale files are already copied)

5. **Commit and push to PPCSL:**

   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/your-feature-name
   ```

6. **Create PR in PPCSL repository**

7. **After merge, update submodule in kupito.club:**
   ```bash
   cd core
   git checkout main
   git pull origin main
   cd ..
   git add core
   git commit -m "chore: update core submodule"
   ```

#### Making Changes to Platform-Specific Files

1. **Edit platform files:**
   - `locales/ro.json` - Romanian translations
   - `locales/ru.json` - Russian translations
   - `locales/en.json` - English translations
   - `theme/colors.ts` - Color scheme
   - `config/site.ts` - Site configuration

2. **Copy files to core for testing:**

   ```bash
   mkdir -p core/frontend/lib/locales && cp locales/ro.json locales/ru.json locales/en.json core/frontend/lib/locales/ && cp locales/backend/*.json core/backend/src/common/i18n/  # Frontend ro/ru/en + backend locales (loaded from root)
   cp -r theme core/frontend/lib/
   cp -r config core/frontend/lib/
   ```

   **Note:** Frontend uses `locales/ro.json`, `locales/ru.json`, and `locales/en.json`; backend uses `locales/backend/*.json`. No `backend/` folder is created in `core/frontend/lib/locales/`.

3. **Test locally**

4. **Commit and push to kupito.club:**
   ```bash
   git add locales theme config
   git commit -m "feat: update translations"
   git push origin main
   ```

---

## Development Scripts

### Helper Script for kupito.club

Create a helper script to simplify the workflow:

**`scripts/dev.sh`** (in kupito.club):

```bash
#!/bin/bash

# Copy platform files to core
echo "Copying platform files to core..."
mkdir -p core/frontend/lib/locales && cp locales/ro.json locales/ru.json locales/en.json core/frontend/lib/locales/ && cp locales/backend/*.json core/backend/src/common/i18n/  # Frontend ro/ru/en + backend locales
cp -r theme core/frontend/lib/    # Required
cp -r config core/frontend/lib/   # Required

# Start development servers
cd core
npm run dev
```

Make it executable:

```bash
chmod +x scripts/dev.sh
```

Usage:

```bash
./scripts/dev.sh
```

### Update Core Submodule Script

**`scripts/update-core.sh`** (in kupito.club):

```bash
#!/bin/bash

echo "Updating core submodule..."
cd core
git fetch origin
git checkout main
git pull origin main
cd ..

echo "Copying locale files to core..."
mkdir -p core/frontend/lib/locales && cp locales/ro.json locales/ru.json locales/en.json core/frontend/lib/locales/ && cp locales/backend/*.json core/backend/src/common/i18n/
cp -r theme core/frontend/lib/
cp -r config core/frontend/lib/

echo "Done! Core updated and locale files copied."
```

---

## Syncing Changes Between Repositories

### Scenario 1: Core Changes → Platform

**When:** You make changes in PPCSL core

**Process:**

1. Commit and push to PPCSL
2. CI/CD automatically updates submodule in kupito.club
3. Or manually update in kupito.club:
   ```bash
   cd core
   git fetch origin
   git checkout main  # or specific commit
   cd ..
   ```

### Scenario 2: Platform Changes → Core

**When:** You need to add core functionality from kupito.club

**Process:**

1. Make changes in `kupito.club/core/`
2. Test locally
3. Push to PPCSL:
   ```bash
   cd core
   git remote -v  # Should show PPCSL remote
   git push origin your-branch
   ```
4. Create PR in PPCSL
5. After merge, update submodule in kupito.club

### Scenario 3: Platform-Specific Changes

**When:** You change translations, theme, or config in kupito.club

**Process:**

1. Edit files in `kupito.club/locales/`, `theme/`, or `config/`
2. Copy to core for testing:
   ```bash
   mkdir -p core/frontend/lib/locales && cp locales/ro.json locales/ru.json locales/en.json core/frontend/lib/locales/ && cp locales/backend/*.json core/backend/src/common/i18n/
   cp -r theme core/frontend/lib/
   cp -r config core/frontend/lib/
   ```
3. Test locally
4. Commit and push to kupito.club (not to core)

---

## Common Workflows

### Daily Development Workflow

**Working on core features:**

```bash
# 1. Start in PPCSL
cd PPCSL
git pull origin main

# 2. Create feature branch
git checkout -b feature/new-feature

# 3. Make changes and test
npm run dev

# 4. Commit and push
git add .
git commit -m "feat: new feature"
git push origin feature/new-feature

# 5. Create PR in PPCSL
```

**Working on platform features:**

```bash
# 1. Start in kupito.club
cd kupito.club
git pull origin main

# 2. Update core submodule (if needed)
cd core
git pull origin main
cd ..

# 3. Copy platform files
mkdir -p core/frontend/lib/locales && cp locales/ro.json locales/ru.json locales/en.json core/frontend/lib/locales/ && cp locales/backend/*.json core/backend/src/common/i18n/  # Frontend ro/ru/en + backend locales
cp -r theme core/frontend/lib/   # Required
cp -r config core/frontend/lib/   # Required

# 4. Make changes
# Edit locales/ro.json, locales/ru.json, locales/en.json, theme/colors.ts, or config/site.ts

# 5. Copy files again and test
mkdir -p core/frontend/lib/locales && cp locales/ro.json locales/ru.json locales/en.json core/frontend/lib/locales/ && cp locales/backend/*.json core/backend/src/common/i18n/
cp -r theme core/frontend/lib/
cp -r config core/frontend/lib/
cd core
npm run dev

# 6. Commit and push
cd ..
git add locales theme config
git commit -m "feat: update translations"
git push origin main
```

### Testing Core Changes with Platform Files

**When:** You want to test core changes with real platform files

1. **Make changes in PPCSL**
2. **Clone kupito.club in another directory:**
   ```bash
   cd ..
   git clone git@github.com:Hexj13/kupito.club.git kupito-test
   cd kupito-test
   ```
3. **Update core submodule to your local PPCSL (temporary):**

   ```bash
   # Option 1: Link to local PPCSL (for testing only)
   cd core
   git remote set-url origin /path/to/PPCSL
   git pull
   cd ..

   # Option 2: Use your local branch
   cd core
   git fetch /path/to/PPCSL
   git checkout feature/your-feature
   cd ..
   ```

4. **Copy platform files and test:**
   ```bash
   mkdir -p core/frontend/lib/locales && cp locales/ro.json locales/ru.json locales/en.json core/frontend/lib/locales/ && cp locales/backend/*.json core/backend/src/common/i18n/  # Frontend ro/ru/en + backend locales
   cp -r theme core/frontend/lib/    # Required
   cp -r config core/frontend/lib/   # Required
   cd core
   npm run dev
   ```

---

## Troubleshooting

### Submodule Shows as Modified

**Problem:** `git status` shows `core` as modified even though you didn't change it

**Solution:**

```bash
cd core
git status  # Check what's modified
# If it's just locale files that were copied, that's expected
# If it's actual core changes, commit them to PPCSL
```

### Locale Files Not Loading

**Problem:** Translations, theme, or config not loading

**Solution:**

1. Check that translation files exist in root `locales/` directory:

   ```bash
   ls locales/ro.json locales/ru.json
   ls locales/en.json
   ```

   Translations are copied to core at prepare:build (frontend ro/ru/en, backend from locales/backend).

2. Ensure theme and config files are copied to `core/frontend/lib/`:
   ```bash
   ls core/frontend/lib/theme/
   ls core/frontend/lib/config/
   ```
3. Check `NEXT_PUBLIC_COUNTRY` environment variable
4. Restart dev server after copying files

### Core Submodule Out of Date

**Problem:** Core submodule is pointing to old commit

**Solution:**

```bash
cd core
git fetch origin
git checkout main
git pull origin main
cd ..
```

### Cannot Push to Core from kupito.club

**Problem:** Trying to push core changes from kupito.club

**Solution:**

- Core changes should be pushed from PPCSL repository
- If you made changes in `kupito.club/core/`, navigate there and push:
  ```bash
  cd core
  git remote -v  # Should show PPCSL remote
  git push origin your-branch
  ```

### Port Already in Use

**Problem:** Port 3000 or 4000 already in use

**Solution:**

```bash
# Kill processes on ports
npm run kill-ports  # If script exists
# Or manually:
lsof -ti:3000 | xargs kill -9
lsof -ti:4000 | xargs kill -9
```

---

## Best Practices

1. **Always test locally** before pushing changes
2. **Keep core and platform repos in sync** - update submodules regularly
3. **Use feature branches** for core changes
4. **Copy platform files** after updating core submodule (translations load from root, but copying provides fallback)
5. **Commit core changes to PPCSL**, not to platform repositories
6. **Commit platform changes to platform repos**, not to core
7. **Test with real locale files** when possible (use kupito.club workflow)
8. **Keep environment variables in sync** between core and platform setups

---

## Summary

- **PPCSL (core)**: For core development, uses default values
- **kupito.club**: For platform development, uses real locale files
- **Sync changes**: Core → Platform (automatic via CI/CD or manual), Platform → Core (push from core directory)
- **Translation files**: Loaded directly from root `locales/` directory (copying to core is optional for fallback)
- **Theme/Config files**: Must be copied to core as they are TypeScript modules
- **Test locally** before pushing to remote repositories
