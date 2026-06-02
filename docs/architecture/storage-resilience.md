---
title: Storage resilience strategy
owner: platform
tags:
  - type/architecture
  - domain/frontend
  - scope/core
  - status/active
---

# Storage resilience strategy

This document defines how the frontend should behave when `localStorage` or `sessionStorage` are unavailable, unstable, cleared aggressively, or restricted by browser privacy settings.

The goal is to avoid runtime errors and to keep the site usable in restricted environments without overengineering solutions for edge cases.

## Problem statement

Some browser environments reject access to Web Storage entirely or behave as if persistence is unavailable:

- privacy-first browsers and strict anti-tracking modes
- private or incognito sessions
- embedded webviews
- managed corporate browsers
- environments that clear site data on exit
- storage quota or device write failures

Kupito uses safe wrappers in `core/frontend/lib/browser-local-storage.ts` and `core/frontend/lib/browser-session-storage.ts` for browser storage access. The migration from direct `localStorage` / `sessionStorage` access in app, hooks, and frontend libs has been completed for this resilience track.

## Scope and limits

This strategy focuses on **practical, cost-effective improvements**. It does not aim to make every feature work identically without storage. The guiding rule is: if the fix is cheap and eliminates a class of errors, do it; if it requires a major architectural change for a narrow edge case, document it as a future direction instead.

## Design principles

1. All storage access must go through safe wrappers. No raw `localStorage` or `sessionStorage` calls outside `browser-local-storage.ts` and `browser-session-storage.ts`.
2. Storage failures must not break navigation, search, or content access.
3. Optional UX state may degrade silently when storage is unavailable.
4. Architectural changes to auth, server state, or URL models are separate projects, not part of this strategy.

## State matrix

| Domain | Storage keys | Impact without storage | Target | Effort | Action |
|--------|-------------|----------------------|--------|--------|--------|
| Auth session | `kupito_access_token`, `kupito_refresh_token` (httpOnly cookies); Zustand `auth-storage` holds `user` only | Session requires cookies + CORS credentials | Cookie session (implemented) | — | **Done.** Tokens are not in `localStorage`; see [AUTH_COOKIE_SESSION.md](../guides/AUTH_COOKIE_SESSION.md). Legacy `token` / `refresh_token` keys may still exist until users re-login. |
| Post-login: `returnUrl` | `returnUrl` in localStorage (legacy) | User redirected to home instead of intended page | URL query parameter | Low | **Done.** Auth continuation now uses `?returnUrl=` in auth flows. |
| Post-login: `pending*` keys | `pendingFavorites`, `pendingSavedFilter`, `pendingRegistration` | Guest pre-login actions lost | Server state or URL | High | **Partially done.** Safe storage access is in place; server-backed continuation remains future work. |
| Consent | `cookie_consent` | Banner re-shown, analytics state unclear | Cookie-first | Low | **Done.** `useCookieConsent` writes consent to cookie as primary source with localStorage cache. |
| Locale | `kupito-locale` | Falls back to default locale | Cookie (already partially done) | Low | **Already mostly done.** Cookie is written in `setStoredLocale`. Reads already use safe helper. |
| Search filters | `kupito_search_filters` in session+local | Overflow filter restore fails | URL-first (already mostly done) | Low | **Done for resilience scope.** Storage access now goes through safe helpers. |
| Vehicle type | `kupito_vehicle_type` | Resets to `car` | Best-effort storage | None | **Already done.** Uses safe helper. |
| Comparison (guest) | `comparison-storage`, migration buffers | Lost on reload | URL-backed compare (future feature) | Medium | **Partially done.** Safe helpers are used; URL-backed compare remains future feature. |
| Favorites (guest) | `favorites-storage`, `pendingFavorites` | Lost on reload | Best-effort storage | None | Already uses `createPersistJSONStorage` with memory fallback. |
| Cross-tab sync | `kupito_cross_tab_id`, `kupito-cross-tab-signal` | Degraded sync between tabs | `BroadcastChannel` first | Low | **Done for resilience scope.** Safe helpers are used for storage fallback path. |
| Scroll and grid | `homeScrollPosition`, `kupito_grid_state`, `scrollPreserved`, etc. | Scroll resets, grid reloads | Best-effort storage | None | **Done for resilience scope.** Remaining direct access in app logic was migrated to safe helpers. |
| Toasts and UI flags | `showProfileSaveSuccess`, `listingCreatedToast`, etc. | Toast not shown | Best-effort storage | Low | **Done for resilience scope.** Storage calls were migrated to safe helpers. |
| Admin preferences | `adminActiveTab`, `adminListingsSearchQuery` | Tab resets | Best-effort storage | Low | **Done for resilience scope.** Storage calls were migrated to safe helpers. |

## Implemented in this resilience track

### 1. Migrate raw storage calls to safe wrappers

All remaining raw `localStorage.*` / `sessionStorage.*` calls in the resilience target scope were migrated to safe helper APIs. This removes the main `SecurityError` crash vector in restricted environments.

### 2. Move `returnUrl` to URL query parameter

`returnUrl` continuation was moved from browser storage to `?returnUrl=` across login/register/verify/complete-profile auth flows. Return URL values are sanitized to internal paths to avoid open redirect behavior.

### 3. Write consent to cookie as primary source

`useCookieConsent.ts` now writes consent to cookie as primary source and keeps localStorage as best-effort cache. Hook reads from cookie first, then falls back to localStorage cache.

## Remaining follow-ups

- Keep monitoring Sentry for `SecurityError` regressions from frontend storage usage.
- Planned: access JWT invalidation after password change/reset ([auth-jwt-invalidation-followup.md](./auth-jwt-invalidation-followup.md)).
- Evaluate server-backed continuation for `pending*` post-login flows if product data justifies it.

## Future directions (separate projects)

These items are valuable but require significant effort beyond storage resilience. They should be tracked and prioritized independently.

### URL-backed guest comparison

Encoding compare IDs in URL query parameters would make guest comparison reload-safe and shareable. The 3+3 item limit makes this feasible. This is a feature enhancement rather than a resilience fix.

### Server-backed post-login continuation

Moving `pending*` keys to short-lived server state would make multi-step flows reliable without storage. This requires new backend API and session management. Worth doing only if data shows frequent user drop-off in these flows.

## Success criteria

- Zero raw `localStorage` or `sessionStorage` calls in the resilience migration scope outside safe wrappers and their tests.
- No `SecurityError` crashes reported in Sentry from storage access.
- `returnUrl` continuation works without storage.
- Consent decision survives in cookie when localStorage is blocked.
- Remaining storage-dependent UX degrades silently without breaking primary user tasks.
