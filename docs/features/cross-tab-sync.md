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

Auth does not use `BroadcastChannel` for tokens: access and refresh tokens are **httpOnly cookies** set by the API. Cross-tab auth sync uses the persisted Zustand slice in `localStorage` key `auth-storage` (hydrated user profile) and the browser `storage` event so other tabs rehydrate and run `initAuth()` (which calls `/api/auth/me` and `/api/auth/refresh` with credentials).

## Auth refresh and token rotation

- Each successful `POST /api/auth/refresh` returns new tokens in the JSON body **and** updates `Set-Cookie` headers for `kupito_access_token` and `kupito_refresh_token`. The Axios interceptor does not write tokens to `localStorage`.
- Silent refresh retries queued requests after a cookie-based refresh; if refresh fails, the client clears persisted auth keys and redirects to sign-in.
- Legacy keys `token` and `refresh_token` in `localStorage` are cleared on hydration and login paths.

## Persistence keys

`AuthProvider` listens for `storage` on `favorites-storage`, `comparison-storage`, and `auth-storage`, and calls Zustand `persist.rehydrate()` (and `initAuth()` when `auth-storage` changes) so guest/local state and signed-in profile match other tabs.

## Consumers

- **Favorites page:** refetches list when another tab changes favorites (cross-tab event or `favorites-storage`).
- **Compare page:** signed-in users call `loadComparisonFromApi()` on `comparison-changed`; guests rely on persist rehydrate.
- **Listing detail:** refetches listing on `listing-status-changed` for the same `listingId`.
- **My listings:** refetches current page on `listing-status-changed`.
- **Auth session:** other tabs run `persist.rehydrate()` and `initAuth()` when `auth-storage` changes. Forced session end after failed refresh (401) clears persisted auth via `clearClientAuthLocalStorage` in `api-client` (aligned with manual logout).

Implementation: `core/frontend/lib/cross-tab-events.ts`, `core/frontend/lib/cross-tab-listing-detail-publish.ts`, hooks under `core/frontend/hooks/useCrossTab*.ts`; auth: `core/frontend/components/providers/AuthProvider.tsx`, `core/frontend/lib/client-auth-storage.ts`, `core/frontend/lib/api/api-client.ts`.
