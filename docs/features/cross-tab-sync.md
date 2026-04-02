---
title: Cross-tab UI sync
owner: platform
tags:
  - type/feature
  - domain/frontend
  - scope/core
  - status/active
---

# Cross-tab UI sync

Favorites, comparison, listing status, and auth session changes sync across browser tabs without a full page reload.

## Transport

- Primary: `BroadcastChannel` (`kupito-cross-tab`).
- Fallback: `localStorage` key `kupito-cross-tab-signal` (fires `storage` in other documents).
- Same-tab publishes are ignored via per-tab `sourceTabId` in `sessionStorage` (`kupito_cross_tab_id`).

## Events

| Type | When |
|------|------|
| `favorites-changed` | After successful favorite add/remove (authenticated flows). |
| `comparison-changed` | After comparison add/remove (card, listing detail, compare page). |
| `listing-status-changed` | After publish/pause/close from My listings. |

Auth does not use `BroadcastChannel`; it relies on `localStorage` (`auth-storage`, `token`, `refresh_token`) and the browser `storage` event so other tabs rehydrate Zustand and run `initAuth()`.

## Persistence keys

`AuthProvider` listens for `storage` on `favorites-storage`, `comparison-storage`, `auth-storage`, `token`, and `refresh_token` and calls Zustand `persist.rehydrate()` (and `initAuth()` for auth keys) so guest/local state and signed-in session match other tabs.

## Consumers

- **Favorites page:** refetches list when another tab changes favorites (cross-tab event or `favorites-storage`).
- **Compare page:** signed-in users call `loadComparisonFromApi()` on `comparison-changed`; guests rely on persist rehydrate.
- **Listing detail:** refetches listing on `listing-status-changed` for the same `listingId`.
- **My listings:** refetches current page on `listing-status-changed`.
- **Auth session:** other tabs run `persist.rehydrate()` and `initAuth()` when `auth-storage`, `token`, or `refresh_token` change. Forced session end after failed refresh (401) clears tokens and the auth persist key via `clearClientAuthLocalStorage` in `api-client` (aligned with manual logout for persisted auth).

Implementation: `core/frontend/lib/cross-tab-events.ts`, `core/frontend/lib/cross-tab-listing-detail-publish.ts`, hooks under `core/frontend/hooks/useCrossTab*.ts`; auth: `core/frontend/components/providers/AuthProvider.tsx`, `core/frontend/lib/client-auth-storage.ts`, `core/frontend/lib/api/api-client.ts`.
