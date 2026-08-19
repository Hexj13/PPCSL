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
- Service worker (`public/sw.js`): cache-first for static assets (CSS/JS/images/fonts); stale-while-revalidate with 1h TTL only for same-origin small catalog paths (`/api/brands`, `/api/cities`, brand models) when those requests hit the app origin
- Does **not** cache navigations, RSC/HTML payloads, or other same-origin document-like responses (avoids cross-session leakage on shared devices)
- On logout the client posts `CLEAR_USER_CACHE` to clear data/runtime caches
- Precache on install: `/offline` only (home is not precached)
- Offline navigate fallback: `/offline` when the network fails
- Installation prompts for iOS/Android and installed app detection (`standalone`, `fullscreen`, TWA referrer)
- Update banner reloads the page only after the user taps update (`ServiceWorkerRegistration`)
- Known debt: CSP is `Content-Security-Policy-Report-Only` without a reporting endpoint and with `script-src 'unsafe-inline'`; enforcing needs a report collector, nonces for Next/GTM, then a switch to `Content-Security-Policy`

### SEO & Metadata
- Open Graph tags on all pages
- Twitter Cards (`summary_large_image`)
- Proper H1 tags (semantic HTML)
- Canonical URLs (absolute)
- Meta descriptions (110-160 chars)
- Root `app/not-found.tsx` takes locale from `x-url-pathname` (set in `proxy.ts` from `nextUrl.pathname`). Prefixed unknown paths (`/ru/...`, `/en/...`) render that locale’s copy and `html lang`.

## 📦 Key Components

**Structure:** Components are grouped under `components/` by domain: `layout/`, `listing/`, `search/` (incl. `search-filters/`), `modals/`, `analytics/`, `providers/`, `pwa/`, `common/`. Root-level components (e.g. `SkeletonContainer`, `HomeHero`) remain in `components/`.

**Layout & Navigation:**
- `layout/Breadcrumbs` - Navigation breadcrumbs
- `pwa/PWAInstallButtonGray` - PWA install prompt

**Listings:**
- `listing/ListingGrid` - Search results fetch + load-more; renders via `VirtualizedListingGrid` (`@tanstack/react-virtual`)
- `listing/buildVirtualRows`, `listing/listing-grid-measure.ts`, `listing/listing-grid-virtual-swap.ts`, `hooks/useGridColumns` - Row model, static→virtual swap, and responsive column count for the virtualizer
- `lib/home-scroll-restore` - Home scroll restore after reload or back from listing detail (exact `scrollY` + grid min-height placeholder)
- `listing/ListingManagementCard` - Status management
- `search/SavedFiltersList` - Saved filters with caching
- Perf audit: `npm run perf:list-grid` (Playwright; writes `.perf-audit/list-perf.json`)

**Loading States:**
- `LoadingButton` - Button with loading state
- `SkeletonContainer` - Skeleton with min display time
- `useLoadingState` - Universal loading hook (`SKELETON_PAGE`, `SKELETON_DEFERRED` presets)

## 📚 General Documentation

For core documentation (this repo):
- **[Core docs](../../docs/README.md)** — Main documentation entry point
- **[Architecture](../../docs/architecture/)** — System architecture
- **[Deployment](../../docs/guides/DEPLOYMENT.md)** — Deployment guides

---

**Stack:** Next.js 16, React 19, TailwindCSS, Zustand, PWA
