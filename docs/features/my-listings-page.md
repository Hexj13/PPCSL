---
title: My listings page
owner: platform
tags:
  - type/guide
  - domain/frontend
  - scope/core
  - status/active
---

# My listings page (`/my-listings`)

## Data sources

- **Visible list + pagination**: `GET /api/listings/my` with `status`, optional `promoted`, `search`, `page`, `limit`. Implemented in `useMyListingsPage` → `fetchListings`.
- **Badge counts** (Active / Paused / Closed and promoted count on the filter row): `GET /api/listings/my/status-counts` with optional current `search`. It returns `Active`, `Paused`, `Closed`, and `Promoted`; status and promoted filters on the visible list do not change badge counts.
- **Top actions** (e.g. refresh listing dates button): availability uses **`hasActiveListingsOverall`** — whether the user has any **Active** listing in the account (`getMy(1, 1, 'Active')`), not the filtered list.

## Filters vs listing actions

- Filters and search affect **listing feed only**.
- Card actions (publish / pause / close / promote) use shared hooks; optimistic patches update the visible list and refetch status counts after listing state changes.

## Loading UX

- **First visit**: full-page skeleton while initial list load runs (`useLoadingState` + empty `listings`).
- **Filter / search / promoted toggle after data exists**: no list skeleton; list stays mounted with `listingsRefreshing` (dim + `pointer-events-none`) until the replace-fetch completes.

## Limits

- Badge counts are exact for the current search because aggregation is server-side and no longer limited to the first 1000 listings.
