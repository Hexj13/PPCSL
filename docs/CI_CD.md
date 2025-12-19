# CI/CD Configuration Guide

Complete guide for setting up Continuous Integration and Continuous Deployment (CI/CD) for PPCSL core and platform-specific repositories.

## Table of Contents

1. [Overview](#1-overview)
2. [PPCSL Core CI/CD](#2-ppcsl-core-cicd)
3. [Platform-Specific CI/CD (kupito.club)](#3-platform-specific-cicd-kupitoclub)
4. [Workflow Overview](#4-workflow-overview)
5. [Environment Variables](#5-environment-variables)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Overview

The CI/CD system is designed to:
- **Automatically test** code changes in PPCSL core
- **Build and verify** core functionality
- **Update submodules** in platform repositories when core changes
- **Build and deploy** platform-specific applications independently
- **Maintain separation** between core and platform-specific code

### Architecture

```
PPCSL (Core Repository)
    │
    ├─── On push to main:
    │    ├── Run tests (frontend + backend)
    │    ├── Run linters and formatters
    │    ├── Build frontend and backend
    │    └── Update submodules in platform repos
    │
    └─── Platform Repositories (e.g., kupito.club)
         │
         ├─── On submodule update or push:
         │    ├── Copy locale files to core
         │    ├── Copy theme files to core
         │    ├── Copy config files to core
         │    ├── Install dependencies
         │    ├── Build frontend and backend
         │    └── Deploy to production
```

---

## 2. PPCSL Core CI/CD

### 2.1. Workflow File

Create `.github/workflows/ci.yml` in PPCSL repository:

```yaml
name: CI/CD Core

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    name: Test and Lint
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install root dependencies
        run: npm ci

      - name: Install frontend dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Install backend dependencies
        working-directory: ./backend
        run: npm ci

      - name: Run frontend linter
        working-directory: ./frontend
        run: npm run lint

      - name: Run frontend formatter check
        working-directory: ./frontend
        run: npm run format:check

      - name: Run backend linter
        working-directory: ./backend
        run: npm run lint

      - name: Run frontend tests
        working-directory: ./frontend
        run: npm test

      - name: Run backend tests
        working-directory: ./backend
        run: npm test

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install root dependencies
        run: npm ci

      - name: Install frontend dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Install backend dependencies
        working-directory: ./backend
        run: npm ci

      - name: Build frontend
        working-directory: ./frontend
        env:
          NEXT_PUBLIC_COUNTRY: mk
          NEXT_PUBLIC_SITE_URL: https://kupito.club
          NEXT_PUBLIC_API_URL: http://localhost:4000
        run: npm run build

      - name: Build backend
        working-directory: ./backend
        run: npm run build

  update-platforms:
    name: Update Platform Submodules
    runs-on: ubuntu-latest
    needs: [test, build]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Update kupito.club submodule
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          git clone https://github.com/your-org/kupito.club.git ../kupito.club
          cd ../kupito.club
          git submodule update --init --recursive
          cd core
          git fetch origin
          git checkout ${{ github.sha }}
          cd ..
          git add core
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git commit -m "chore: update PPCSL core to ${{ github.sha }}" || exit 0
          git push origin main
```

### 2.2. Required Secrets

No additional secrets required for PPCSL core CI/CD. The workflow uses `GITHUB_TOKEN` which is automatically provided by GitHub Actions.

### 2.3. Workflow Steps

1. **Test Job:**
   - Installs dependencies
   - Runs linters (ESLint, Prettier)
   - Runs tests (Jest)
   - Validates code quality

2. **Build Job:**
   - Builds frontend (Next.js)
   - Builds backend (NestJS)
   - Verifies production builds succeed

3. **Update Platforms Job:**
   - Only runs on push to `main` branch
   - Clones platform repositories
   - Updates submodule reference to latest commit
   - Commits and pushes changes

---

## 3. Platform-Specific CI/CD (kupito.club)

### 3.1. Workflow File

Create `.github/workflows/ci.yml` in kupito.club repository:

```yaml
name: CI/CD kupito.club

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    name: Build and Deploy
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Copy locale files to core
        run: |
          cp -r locales core/frontend/lib/
          mkdir -p core/frontend/lib/messages
          cp locales/mk.json core/frontend/lib/messages/mk.json

      - name: Copy theme files to core
        run: |
          mkdir -p core/frontend/lib/theme
          cp theme/colors.ts core/frontend/lib/theme/colors.ts

      - name: Copy config files to core
        run: |
          mkdir -p core/frontend/lib/config
          cp config/site.ts core/frontend/lib/config/site.ts

      - name: Install frontend dependencies
        working-directory: ./core/frontend
        run: npm ci

      - name: Install backend dependencies
        working-directory: ./core/backend
        run: npm ci

      - name: Run frontend linter
        working-directory: ./core/frontend
        run: npm run lint

      - name: Run frontend formatter check
        working-directory: ./core/frontend
        run: npm run format:check

      - name: Run backend linter
        working-directory: ./core/backend
        run: npm run lint

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

      - name: Deploy to production
        # Add your deployment steps here
        # Examples:
        # - SSH deployment
        # - Docker build and push
        # - Cloud platform deployment (Render, Vercel, etc.)
        run: |
          echo "Deploy to production..."
          # Your deployment commands
```

### 3.2. Required Secrets

Configure the following secrets in GitHub repository settings:

- `API_URL` - Backend API URL for production builds

### 3.3. Workflow Steps

1. **Checkout with submodules:**
   - Clones repository with PPCSL core submodule
   - Initializes and updates submodules recursively

2. **Copy platform-specific files:**
   - Copies `locales/mk.json` to `core/frontend/lib/messages/mk.json`
   - Copies `theme/colors.ts` to `core/frontend/lib/theme/colors.ts`
   - Copies `config/site.ts` to `core/frontend/lib/config/site.ts`

3. **Install dependencies:**
   - Installs frontend and backend dependencies

4. **Run linters:**
   - Validates code quality

5. **Build:**
   - Builds frontend with platform-specific configuration
   - Builds backend

6. **Deploy:**
   - Deploys to production environment

---

## 4. Workflow Overview

### 4.1. Development Workflow

```
Developer
    │
    ├─── Makes changes in PPCSL core
    │    │
    │    └─── Commits and pushes to PPCSL/main
    │         │
    │         └─── PPCSL CI/CD triggers
    │              ├─── Tests pass
    │              ├─── Build succeeds
    │              └─── Updates kupito.club submodule
    │                   │
    │                   └─── kupito.club CI/CD triggers
    │                        ├─── Copies locale/theme/config files
    │                        ├─── Builds with platform config
    │                        └─── Deploys to production
```

### 4.2. Platform-Specific Changes

```
Developer
    │
    ├─── Makes changes in kupito.club
    │    │
    │    └─── Updates locales/theme/config files
    │         │
    │         └─── Commits and pushes to kupito.club/main
    │              │
    │              └─── kupito.club CI/CD triggers
    │                   ├─── Copies files to core
    │                   ├─── Builds with new config
    │                   └─── Deploys to production
```

### 4.3. Submodule Update Flow

When PPCSL core is updated:

1. **PPCSL CI/CD** runs tests and builds
2. **On success**, updates submodule in kupito.club:
   ```bash
   cd kupito.club
   git submodule update --remote --merge core
   git add core
   git commit -m "chore: update PPCSL core to <commit-sha>"
   git push origin main
   ```
3. **kupito.club CI/CD** triggers automatically
4. **Build and deploy** with updated core

---

## 5. Environment Variables

### 5.1. PPCSL Core

No environment variables required for core CI/CD (uses defaults for testing).

### 5.2. kupito.club Platform

**GitHub Secrets:**
- `API_URL` - Backend API URL (e.g., `https://api.kupito.club`)

**Build-time Environment Variables:**
- `NEXT_PUBLIC_COUNTRY=mk` - Country code for locale configuration
- `NEXT_PUBLIC_SITE_URL=https://kupito.club` - Frontend URL
- `NEXT_PUBLIC_API_URL` - Backend API URL (from secrets)

---

## 6. Troubleshooting

### 6.1. Submodule Update Fails

**Problem:** Submodule update job fails with permission errors.

**Solution:**
- Ensure `GITHUB_TOKEN` has write permissions
- Check repository settings → Actions → General → Workflow permissions
- Set to "Read and write permissions"

### 6.2. Build Fails After Submodule Update

**Problem:** Build fails because locale/theme/config files are missing.

**Solution:**
- Verify copy commands in workflow are correct
- Check file paths match repository structure
- Ensure files exist in platform repository

### 6.3. Tests Fail in Platform CI/CD

**Problem:** Tests fail because they expect core structure.

**Solution:**
- Tests should run in PPCSL core CI/CD
- Platform CI/CD should only run linters and build
- Remove test steps from platform workflow if needed

### 6.4. Deployment Fails

**Problem:** Deployment step fails.

**Solution:**
- Check deployment credentials/secrets
- Verify deployment commands are correct
- Check deployment target is accessible
- Review deployment logs for specific errors

### 6.5. Submodule Not Updating

**Problem:** Submodule reference doesn't update automatically.

**Solution:**
- Verify `update-platforms` job runs only on push to `main`
- Check `if` condition in workflow
- Ensure `GITHUB_TOKEN` has correct permissions
- Manually trigger workflow if needed

---

## 7. Best Practices

1. **Always test** core changes locally before pushing
2. **Monitor builds** - ensure all platform builds succeed after core updates
3. **Use semantic versioning** for major core changes
4. **Document breaking changes** in core that affect platforms
5. **Keep secrets secure** - never commit secrets to repository
6. **Use environment-specific configurations** for different deployment targets
7. **Set up notifications** for build failures
8. **Review deployment logs** regularly
9. **Test submodule updates** in staging before production
10. **Backup** platform-specific files before major core updates

---

## 8. Advanced Configuration

### 8.1. Multiple Deployment Environments

For staging and production environments:

```yaml
- name: Deploy to staging
  if: github.ref == 'refs/heads/develop'
  run: |
    # Staging deployment commands

- name: Deploy to production
  if: github.ref == 'refs/heads/main'
  run: |
    # Production deployment commands
```

### 8.2. Docker Builds

For containerized deployments:

```yaml
- name: Build Docker image
  run: |
    docker build -t kupito-club:latest .
    docker tag kupito-club:latest registry.example.com/kupito-club:${{ github.sha }}

- name: Push Docker image
  run: |
    docker push registry.example.com/kupito-club:${{ github.sha }}
```

### 8.3. Caching Dependencies

Optimize build times with caching:

```yaml
- name: Cache node modules
  uses: actions/cache@v3
  with:
    path: |
      core/frontend/node_modules
      core/backend/node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

---

## Summary

This CI/CD setup provides:

✅ **Automated testing** - All code changes are tested automatically  
✅ **Automated builds** - Production builds are verified  
✅ **Automated submodule updates** - Platform repos stay in sync with core  
✅ **Independent deployments** - Each platform deploys independently  
✅ **Quality assurance** - Linters and formatters ensure code quality  
✅ **Scalability** - Easy to add new platforms with same workflow  

For implementation details, see [Multi-Repository Architecture Guide](./MULTI_REPOSITORY_ARCHITECTURE.md).
