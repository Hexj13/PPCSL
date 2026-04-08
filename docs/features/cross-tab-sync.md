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

## Auth refresh and token rotation

- Each successful `POST /api/auth/refresh` returns a new refresh token and revokes the previous one server-side. Reusing an old refresh token yields `errors.refreshTokenRevoked` (or equivalent API error).
- The Axios response interceptor writes the current access and refresh strings to `localStorage` keys `token` and `refresh_token` after a silent refresh.
- After any `await` that can trigger that interceptor (for example `authApi.me()` or profile mutations), callers must pass the **current** access and refresh into `setAuth` from `localStorage` (with Zustand as fallback), not stale values captured from the store before the await—otherwise memory state can keep a revoked refresh while storage already holds the new pair.
- `initAuth()` follows the same rule: after `authApi.me()` succeeds, it reads `token` and `refresh_token` from storage again before calling `setAuth`.
- If a refresh attempt fails with the in-memory refresh token but `localStorage` already contains a **different** `refresh_token` (another tab refreshed first), the client retries refresh once with the stored token before clearing the session and redirecting to sign-in.

## Persistence keys

`AuthProvider` listens for `storage` on `favorites-storage`, `comparison-storage`, `auth-storage`, `token`, and `refresh_token` and calls Zustand `persist.rehydrate()` (and `initAuth()` for auth keys) so guest/local state and signed-in session match other tabs.

## Consumers

- **Favorites page:** refetches list when another tab changes favorites (cross-tab event or `favorites-storage`).
- **Compare page:** signed-in users call `loadComparisonFromApi()` on `comparison-changed`; guests rely on persist rehydrate.
- **Listing detail:** refetches listing on `listing-status-changed` for the same `listingId`.
- **My listings:** refetches current page on `listing-status-changed`.
- **Auth session:** other tabs run `persist.rehydrate()` and `initAuth()` when `auth-storage`, `token`, or `refresh_token` change. Forced session end after failed refresh (401) clears tokens and the auth persist key via `clearClientAuthLocalStorage` in `api-client` (aligned with manual logout for persisted auth).

Implementation: `core/frontend/lib/cross-tab-events.ts`, `core/frontend/lib/cross-tab-listing-detail-publish.ts`, hooks under `core/frontend/hooks/useCrossTab*.ts`; auth: `core/frontend/components/providers/AuthProvider.tsx`, `core/frontend/lib/client-auth-storage.ts`, `core/frontend/lib/api/api-client.ts`.
