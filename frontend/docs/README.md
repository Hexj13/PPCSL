# Frontend Documentation

This directory contains frontend-specific documentation.

## Available Documentation

- **[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)** - Design system and UI components documentation
- **[STORYBOOK.md](./STORYBOOK.md)** - Storybook setup guide (alternative documentation tool)

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

## General Documentation

For general project documentation, see the main [`docs/`](../../docs/) folder:
- **[README.md](../../docs/README.md)** - Project overview
- **[TECHNICAL.md](../../docs/TECHNICAL.md)** - Technical documentation
- **[DEPLOYMENT.md](../../docs/DEPLOYMENT.md)** - Deployment guides
- **[RENDER.md](../../docs/RENDER.md)** - Render.com deployment guide

