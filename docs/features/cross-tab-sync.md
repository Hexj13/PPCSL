---
title: Cross-tab sync (favorites, comparison, listings, auth)
owner: platform
tags:
  - type/feature
  - domain/frontend
  - scope/core
  - status/active
---

# Cross-tab synchronization

How open tabs stay consistent for marketplace UI state and session.

## Channel and signals

- **Wire format:** `core/frontend/lib/cross-tab-events.ts` defines `CrossTabEvent` types (`favorites-changed`, `comparison-changed`, `listing-status-changed`) and `publishCrossTabEvent` / `subscribeToCrossTabEvents`.
- **Transport:** `BroadcastChannel` when available, plus a **`storage`-based fallback** (same payload written under a dedicated key so other tabs receive `storage` events).
- **Origin tab:** events carry `sourceTabId`; subscribers ignore messages from the same tab.

## Favorites

- Authenticated flows publish `favorites-changed` when favorites mutate.
- The favorites list hook (`useFavoritesListings`) subscribes to cross-tab events and to **`storage` on the persist key** for the favorites store so a refetch runs when another tab changes data.

## Comparison

- Same pattern: `comparison-changed` events keep compare UI and stored IDs aligned across tabs (signed-in server-backed compare; guests rely on persist rehydrate).

## Listing status and my listings

- `listing-status-changed` notifies other tabs when a listing moves between Active / Paused / Closed where the UI subscribes (e.g. my listings refetch hooks).

## Auth refresh and token rotation

- After `POST /api/auth/refresh`, the Axios layer persists the new access/refresh pair (see cookie + JSON session notes in [AUTH_COOKIE_SESSION.md](../guides/AUTH_COOKIE_SESSION.md)).
- **Zustand** auth state must match `localStorage` after any await that can trigger silent refresh; other tabs rely on **`storage` listeners** on auth persistence keys (see `AuthProvider` / auth store init) so a tab that refreshed tokens does not leave peers stale.
- **`initAuth`** deduplicates overlapping calls (e.g. mount plus a cross-tab `storage` event). Silent refresh uses `refreshAuthSession()` so parallel tabs or interceptor retries do not fan out multiple refresh requests.

## E2E

- Cross-tab favorites coverage: `core/frontend/e2e/specs/sync-favorites-cross-tab.spec.ts` (serial Chromium project; see [e2e-playwright-standards.md](../guides/e2e-playwright-standards.md)).
