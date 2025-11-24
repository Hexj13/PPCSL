# Frontend Documentation

This directory contains frontend-specific documentation.

## Available Documentation

- **[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)** - Design system and UI components documentation
- **[STORYBOOK.md](./STORYBOOK.md)** - Storybook setup guide (alternative documentation tool)
- **[TEST_REVIEW.md](./TEST_REVIEW.md)** - Test coverage review and recommendations
- **[OPTIMIZATION_PROMPTS.md](./OPTIMIZATION_PROMPTS.md)** - Frontend optimization tasks and prompts

## Key Features

### State Management
- **Zustand stores** with persist middleware for:
  - Authentication (`useAuthStore`)
  - Favorites (`useFavoritesStore`) - supports both authenticated users and guests
  - Car comparison (`useComparisonStore`) - up to 3 cars, stored in localStorage

### Pages
- **Favorites page** (`/favorites`) - Tabbed interface with counters for listings and saved filters
- **My Listings page** (`/my-listings`) - Status filters with counters (All, Active, Paused, Closed)
- **Comparison page** (`/compare`) - Side-by-side comparison table for up to 3 cars
- **Breadcrumbs** - Navigation breadcrumbs on favorites, my listings, and comparison pages

### Components
- **SavedFiltersList** - Displays saved filters with caching to prevent skeleton flickering
- **Breadcrumbs** - Navigation component with dynamic items
- **ListingManagementCard** - Card component for managing listings with status actions
- **ListingGrid** - Listings grid component with server-side initial data loading and client-side infinite scroll

### Data Fetching Architecture
- **Server Components:** Homepage (`app/page.tsx`) fetches initial listings data on the server
- **Server API:** `lib/server-api.ts` provides server-side data fetching functions using native `fetch` with Next.js Data Cache
- **Client API:** `lib/api.ts` provides client-side API client (Axios) for subsequent data loads and user interactions
- **Hybrid Approach:** Initial data loaded on server for SEO, subsequent loads handled on client for interactivity

### SEO & Metadata
- **Open Graph tags** - Full OG meta tags on all pages:
  - Homepage: Static OG tags with platform description
  - Listing pages: Dynamic OG tags generated from listing data (brand + model + year for title, listing description, main image)
  - Auth pages: Page-specific OG tags (`/login`, `/register`, `/reset-password`)
  - Legal pages: Content-specific OG tags (`/terms`, `/privacy`, `/faq`)
- **Twitter Cards** - `summary_large_image` cards on all pages
- **Meta descriptions** - Optimized to 110-160 characters (Open Graph recommendation)
- **H1 tags** - Proper semantic H1 tags on all pages:
  - Listing pages: Dynamic H1 from vehicle info with fallback
  - Skeleton components: Use semantic H1 tags during loading
- **Canonical URLs** - Absolute canonical URLs for all pages
- **Layout files** - Each page has its own `layout.tsx` with metadata configuration

## General Documentation

For general project documentation, see the main [`docs/`](../../docs/) folder:
- **[README.md](../../docs/README.md)** - Project overview
- **[TECHNICAL.md](../../docs/TECHNICAL.md)** - Technical documentation
- **[DEPLOYMENT.md](../../docs/DEPLOYMENT.md)** - Deployment guides
- **[RENDER.md](../../docs/RENDER.md)** - Render.com deployment guide

