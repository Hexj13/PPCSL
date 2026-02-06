# Frontend Documentation

Frontend-specific documentation for PPCSL Next.js application.

## 📄 Available Documentation

- **[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)** - Design system and UI components
- **[STORYBOOK.md](./STORYBOOK.md)** - Storybook setup guide
- **[LINTING.md](./LINTING.md)** - ESLint configuration and rules

## 🏗️ Key Architecture

### State Management
- **Zustand stores** with persist middleware:
  - `useAuthStore` - Authentication
  - `useFavoritesStore` - Favorites (auth + guest support)
  - `useComparisonStore` - Car comparison (up to 3 cars)

### Data Fetching
- **Server Components:** Initial data loaded on server (SEO)
- **Server API:** `lib/api/server-api.ts` - Server-side fetching
- **Client API:** `lib/api/api.ts` (import via `@/lib/api`) - Client-side Axios client
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

For general project documentation:
- **[Project Overview](../../docs/README.md)** - Main documentation
- **[Architecture](../../docs/architecture/)** - System architecture
- **[Deployment](../../docs/guides/DEPLOYMENT.md)** - Deployment guides

---

**Stack:** Next.js 15, React 19, TailwindCSS, Zustand, PWA
