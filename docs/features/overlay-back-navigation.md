---
title: Overlay back navigation (Android / browser)
owner: platform
tags:
  - type/guide
  - domain/engineering
  - scope/core
  - status/active
---

# Overlay back navigation

Mobile browsers and installed PWAs/TWA expose a system **Back** control. Overlays (modals, bottom sheets, full-screen photo viewer) must consume that action before the app navigates away.

## Implementation

- **Stack + history:** `core/frontend/lib/overlay-history.ts` keeps a LIFO stack of open overlays. Each open overlay calls `history.pushState` with a `kupitoOverlay` marker (URL unchanged). `popstate` closes the top overlay; programmatic close calls `history.back()` with suppression so the stack is not double-popped.
- **Hook:** `core/frontend/hooks/useHistoryBackClose.ts` registers/unregisters one overlay id (React `useId()`).
- **Consumers:**
  - `components/modals/Modal.tsx` — standard dialogs
  - `components/common/BottomSheet.tsx` — mobile filter/select sheets (`beginClose` for exit animation)
  - `components/modals/BottomSheet.tsx` — e.g. service-worker update prompt
  - `components/ListingPage/useListingPageImageModal.ts` — listing photo viewer

Nested overlays (e.g. modal over a sheet) each push one history entry; Back closes the topmost first.

## Scroll lock

Overlays use `useScrollLock` (reference-counted `position: fixed` on `document.body`). The listing image modal no longer duplicates body scroll lock logic.

## Home scroll after Back from listing

Returning from a listing detail page to `/` restores the saved feed scroll position in `useLayoutEffect` before paint (`lib/home-scroll-restore.ts`, wired from `ScrollReset.tsx`). A brief `position: fixed` offset on `document.body` avoids a one-frame flash at scroll top before `scrollTo` commits.

## Related

- [image-preview.md](./image-preview.md) — photo viewer controls
- [search-filters.md](./search-filters.md) — mobile bottom sheets for filters
