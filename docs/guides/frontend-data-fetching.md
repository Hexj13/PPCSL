# Frontend data fetching conventions

Server state (listings, search results, admin tables) is loaded with dedicated hooks:

- `hooks/usePaginatedData.ts` for paginated admin and tab views
- `components/listing/ListingGrid.tsx` for marketplace search pagination (load-more append; results grid virtualizes at client mount via `VirtualizedListingGrid.tsx` + `listing-grid-measure.ts`; scroll restore uses `lib/home-scroll-restore.ts`)
- `hooks/useListingData.ts` and page hooks (`useMyListingsPage`, `useListingPageClient`) for detail and account flows

React Query is intentionally not used in the root layout. New list or detail fetching should extend the existing hook patterns above until a dedicated migration introduces a single cache layer with e2e coverage.
