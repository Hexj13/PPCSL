---
title: Frontend documentation
owner: platform
tags:
  - type/readme
  - domain/engineering
  - scope/core
  - status/active
---

# Frontend Documentation

Frontend-specific documentation for PPCSL Next.js application.

## 📄 Available Documentation

- **[design-system.md](./design-system.md)** - Design system and UI components
- **[storybook.md](./storybook.md)** - Storybook setup guide
- **[linting.md](../../docs/linting.md)** - ESLint configuration and rules

## 🏗️ Key Architecture

### State Management
- **Zustand stores** with persist middleware:
  - `useAuthStore` - Authentication
  - `useFavoritesStore` - Favorites (auth + guest support)
  - `useComparisonStore` - Car comparison (up to 3 cars)

### Data Fetching
- **Server Components:** Initial data loaded on server (SEO)
- **Server API:** `lib/api/server-api.ts` - Server-side fetching
- **Client API:** `lib/api/` - Client-side Axios client; import via `@/lib/api`. Entry point is `api.ts` (barrel); implementation is split into `api-types.ts` (shared types), `api-client.ts` (Axios instance), and domain modules (`api-listings.ts`, `api-auth.ts`, `api-board.ts`, `api-upload.ts`, `api-favorites.ts`, `api-brands.ts`, `api-cities.ts`, `api-saved-filters.ts`, `api-admin.ts`).
- **Hybrid approach:** Server + Client for optimal UX

### URL Parameters & SEO
- **Slug-based URLs:** `?brand=toyota&model=yaris`
- **Utility functions:** `createSlug()`, `slugToName()`
- **Filter conversion:** IDs ↔ slugs for SEO

### PWA Support
- Service worker with 1h cache TTL
- Offline support with cached content
- Installation prompts for iOS/Android
- Auto-update notifications

### SEO & Metadata
- Open Graph tags on all pages
- Twitter Cards (`summary_large_image`)
- Proper H1 tags (semantic HTML)
- Canonical URLs (absolute)
- Meta descriptions (110-160 chars)

## 📦 Key Components

**Structure:** Components are grouped under `components/` by domain: `layout/`, `listing/`, `search/` (incl. `search-filters/`), `modals/`, `analytics/`, `providers/`, `pwa/`, `common/`. Root-level components (e.g. `SkeletonContainer`, `HomeHero`) remain in `components/`.

**Layout & Navigation:**
- `layout/Breadcrumbs` - Navigation breadcrumbs
- `pwa/PWAInstallButtonGray` - PWA install prompt

**Listings:**
- `listing/ListingGrid` - Infinite scroll grid
- `listing/ListingManagementCard` - Status management
- `search/SavedFiltersList` - Saved filters with caching

**Loading States:**
- `LoadingButton` - Button with loading state
- `SkeletonContainer` - Skeleton with min display time
- `useLoadingState` - Universal loading hook

## 📚 General Documentation

For core documentation (this repo):
- **[Core docs](../../docs/README.md)** — Main documentation entry point
- **[Architecture](../../docs/architecture/)** — System architecture
- **[Deployment](../../docs/guides/deployment.md)** — Deployment guides

---

**Stack:** Next.js 15, React 19, TailwindCSS, Zustand, PWA
