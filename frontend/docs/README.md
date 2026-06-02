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
- **[STORYBOOK.md](./STORYBOOK.md)** - Storybook setup guide
- **[e2e-playwright.md](./e2e-playwright.md)** - Playwright end-to-end testing guide
- **[linting.md](../../docs/engineering/linting.md)** - ESLint configuration and rules

## 🏗️ Key Architecture

### State Management
- **Zustand stores** with persist middleware:
  - `useAuthStore` - Authentication
  - `useFavoritesStore` - Favorites (auth + guest support)
  - `useComparisonStore` - Vehicle and tire comparison (up to 3 listings per category)

### Phone (SMS flows)
- **`lib/phone/`** — shared `libphonenumber-js` validation aligned with backend `@IsPhone()`; sanitization, blur commit via `finalizePhoneFromRawInput` (uses the input’s live value on blur), E.164 compaction, and Axios error mapping for register, change-phone, and reset-password. The sign-in **email or phone** field uses `normalizeLoginFieldInput` / `isLoginFieldPhoneLike` so phone entry matches register sanitization without stripping letters before `@`.
- **Listing detail:** seller numbers are loaded with `listingsApi.getListingPhones` only after the user reveals them (`components/ListingPage/ListingPageSeller.tsx`), matching backend rate limits. Optional Viber/WhatsApp/Telegram links (`ListingPageSellerMessengers.tsx`) render only when the seller enabled a channel and a dialable number is available (for guests, after reveal).

### Data Fetching
- **Client hooks:** See [frontend-data-fetching.md](../../docs/guides/frontend-data-fetching.md) for list/pagination patterns (no React Query in runtime).
- **API errors:** [frontend-api-error-handling.md](../../docs/guides/frontend-api-error-handling.md) (`X-Skip-Error-Handling`, `useApiErrorToast`).
- **React Compiler:** opt-in via `REACT_COMPILER=true`; evaluation steps in [react-compiler-evaluation.md](../../docs/guides/react-compiler-evaluation.md).
- **Server Components:** Initial data loaded on server (SEO)
- **Server API:** `lib/api/server-api.ts` - Server-side fetching
- **Client API:** `lib/api/` - Client-side Axios client; import via `@/lib/api`. Entry point is `api.ts` (barrel); implementation is split into `api-types.ts` (shared types), `api-client.ts` (Axios instance), and domain modules (`api-listings.ts`, `api-auth.ts`, `api-board.ts`, `api-upload.ts`, `api-favorites.ts`, `api-brands.ts`, `api-cities.ts`, `api-saved-filters.ts`, `api-admin.ts`).
- **Hybrid approach:** Server + Client for optimal UX

### URL Parameters & SEO
- **Slug-based URLs:** `?brand=toyota&model=yaris`
- **Utility functions:** `createSlug()`, `slugToName()`
- **Filter conversion:** IDs ↔ slugs for SEO

### PWA Support
- Service worker (`public/sw.js`) with 1h TTL for selected navigations and small catalog API responses
- Precache on install: `/offline` only (home is not precached)
- Offline fallback for favorites, profile, my-listings, and listing detail when network fails
- Installation prompts for iOS/Android and installed app detection (`standalone`, `fullscreen`, TWA referrer)
- Update banner reloads the page only after the user taps update (`ServiceWorkerRegistration`)

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
- **[Deployment](../../docs/guides/DEPLOYMENT.md)** — Deployment guides

---

**Stack:** Next.js 16, React 19, TailwindCSS, Zustand, PWA
