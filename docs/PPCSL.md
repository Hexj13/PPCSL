# PPCSL - Platform for Posting Car Sale Listings

Core platform for creating car marketplace platforms in different countries.

## Overview

**PPCSL** (Platform for Posting Car Sale Listings) is a core application framework designed to create unified car marketplace platforms for different countries. It provides all the essential functionality for listing, searching, and managing car sales, while allowing each country-specific platform to have its own branding, translations, colors, and domain.

## Core Concept

PPCSL serves as the **foundation** for building car marketplace platforms. Instead of maintaining separate codebases for each country, PPCSL provides a single, well-tested core that can be customized for each market through configuration files.

### Architecture

```
PPCSL (Core)
    │
    ├─── kupito.club (Macedonia)
    │    └── core/ (Git Submodule → PPCSL)
    │    └── locales/mk.json
    │    └── theme/colors.ts
    │    └── config/site.ts
    │
    └─── [Future Platform] (Other Country)
         └── core/ (Git Submodule → PPCSL)
         └── locales/{country}.json
         └── theme/colors.ts
         └── config/site.ts
```

## What's in PPCSL Core

### Frontend Core

- **Application Logic**
  - All React components (Header, Footer, ListingCard, ListingForm, etc.)
  - Pages and routes (home, listings, profile, admin, etc.)
  - API client and server-side API functions
  - State management (Zustand stores)
  - Hooks and utilities
  - Design system components (Button, Input, Card, etc.)

- **Systems (Framework)**
  - Translation system interface (`lib/i18n.ts`)
  - Theme system interface (`lib/theme.ts`)
  - Site configuration interface (`lib/site-config.ts`)
  - TypeScript types and interfaces

- **Backend Core**
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

## What's in Platform-Specific Repositories

Each platform (e.g., kupito.club) contains only:

1. **Translations** (`locales/mk.json`)
   - All user-facing text in the local language
   - Error messages, form labels, button text, etc.

2. **Theme** (`theme/colors.ts`)
   - Color scheme specific to the platform
   - Primary colors, background colors, semantic colors

3. **Site Configuration** (`config/site.ts`)
   - Domain name
   - Site name
   - Locale settings
   - Currency
   - Support email
   - Country code

4. **Build Configuration**
   - CI/CD workflows
   - Deployment scripts
   - Environment-specific settings

## Benefits of This Architecture

### 1. Single Source of Truth

✅ **All core functionality** is maintained in one place (PPCSL)  
✅ **Bug fixes** automatically benefit all platforms  
✅ **New features** can be added once and deployed everywhere  
✅ **Code quality** improvements apply to all platforms simultaneously

### 2. Independent Platform Development

✅ **Each platform** can be developed and deployed independently  
✅ **Customization** is limited to translations, colors, and config  
✅ **No code conflicts** between platforms  
✅ **Separate version control** history for each platform

### 3. Easy Scaling

✅ **Add new country** by creating a new repository with:
   - Translations file
   - Theme file
   - Config file
   - Submodule to PPCSL

✅ **No code duplication** - all logic stays in PPCSL  
✅ **Consistent functionality** across all platforms  
✅ **Fast time-to-market** for new countries

### 4. Maintenance Efficiency

✅ **One codebase to maintain** instead of multiple  
✅ **Single testing suite** covers all platforms  
✅ **Unified documentation** for core functionality  
✅ **Easier onboarding** - developers learn one codebase

### 5. Marketing and Branding Flexibility

✅ **Each platform** can have its own:
   - Domain name (kupito.club, etc.)
   - Brand name and logo
   - Color scheme
   - Marketing strategy

✅ **Independent SEO** - each platform can be optimized separately  
✅ **Local market focus** - each platform targets its specific country  
✅ **Separate analytics** and tracking

### 6. Risk Management

✅ **Isolated deployments** - issues in one platform don't affect others  
✅ **Independent rollbacks** if needed  
✅ **A/B testing** possible per platform  
✅ **Gradual rollout** of new features

## Development Workflow

### Core Development (PPCSL)

1. Developer makes changes in PPCSL repository
2. Changes are tested and reviewed
3. Once merged, CI/CD automatically:
   - Runs all tests
   - Builds the application
   - Updates submodules in platform repositories (e.g., kupito.club)
4. Platform repositories automatically rebuild and deploy

### Platform-Specific Changes

1. Developer makes changes in platform repository (e.g., kupito.club)
2. Updates translations, theme, or config
3. Commits and pushes
4. Platform-specific CI/CD builds and deploys only that platform

## Example: Adding a New Country

To create a platform for a new country (e.g., Serbia):

1. **Create repository** `kupito.rs` (or any name)
2. **Add PPCSL as submodule:**
   ```bash
   git submodule add git@github.com:Hexj13/PPCSL.git core
   ```
3. **Create locale files:**
   - `locales/rs.json` - Serbian translations
   - `theme/colors.ts` - Serbian color scheme
   - `config/site.ts` - Serbian site configuration
4. **Setup CI/CD** for the new platform
5. **Deploy** independently

**Result:** Fully functional car marketplace for Serbia with:
- All features from PPCSL
- Serbian language
- Custom branding
- Independent domain and deployment

## Why This Approach Works

### Technical Benefits

- **DRY Principle** - Don't Repeat Yourself
  - Core logic written once, used everywhere
  - No duplicate code to maintain

- **Separation of Concerns**
  - Core = functionality
  - Platform = presentation and configuration

- **Version Control**
  - Clear history of core changes
  - Platform-specific history separate

### Business Benefits

- **Faster Market Entry**
  - New country platform can be ready in days, not months
  - Only need translations and branding

- **Cost Efficiency**
  - One development team maintains core
  - Lower maintenance costs
  - Shared infrastructure knowledge

- **Quality Assurance**
  - Core is thoroughly tested
  - Bugs fixed once benefit all platforms
  - Consistent user experience

- **Scalability**
  - Easy to add new countries
  - No technical debt accumulation
  - Clean architecture for growth

## Current Status

**Core Repository:**
- **PPCSL** - `git@github.com:Hexj13/PPCSL.git`
- Contains all core functionality
- Ready for use by platform repositories

**Active Platform:**
- **kupito.club** - Platform for Macedonia
- Uses PPCSL core via Git submodule
- Has Macedonian translations, theme, and configuration

## Future Platforms

When creating new platforms in the future:
- Each will have its own repository
- Each will use PPCSL as a submodule
- Each will have its own branding and domain
- All will share the same core functionality

This architecture allows for **unlimited scaling** while maintaining **code quality** and **development efficiency**.

---

For technical implementation details, see [Multi-Repository Architecture Guide](./MULTI_REPOSITORY_ARCHITECTURE.md).
