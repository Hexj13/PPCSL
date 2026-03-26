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
- **Badge counts** (Active / Paused / Closed and promoted count on the filter row): separate bulk fetch `getMy(1, 1000, …)` with **no** `status` and **no** `promoted`, only the current **search** query. Same dataset drives `statusCounts` and `promotedCount` in UI so toggling “Promoted” on the list does not change other badges.
- **Top actions** (e.g. refresh listing dates button): availability uses **`hasActiveListingsOverall`** — whether the user has any **Active** listing in the account (`getMy(1, 1, 'Active')`), not the filtered list.

## Filters vs listing actions

- Filters and search affect **listing feed only**.
- Card actions (publish / pause / close / promote) use shared hooks; optimistic patches update both the visible list and the badge bulk dataset when the listing is present there.

## Loading UX

- **First visit**: full-page skeleton while initial list load runs (`useLoadingState` + empty `listings`).
- **Filter / search / promoted toggle after data exists**: no list skeleton; list stays mounted with `listingsRefreshing` (dim + `pointer-events-none`) until the replace-fetch completes.

## Limits

- Badge aggregation loads up to **1000** rows for the current search. Users with more matches may see approximate badge totals until a dedicated counts API exists.
