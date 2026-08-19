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

- **Stack + history:** `core/frontend/lib/overlay-history.ts` keeps a LIFO stack of open overlays. Each open overlay calls `history.pushState` with a `ppcslOverlay` marker (URL unchanged). `popstate` closes the top overlay; programmatic close calls `history.back()` with suppression so the stack is not double-popped.
- **Hook:** `core/frontend/hooks/useHistoryBackClose.ts` registers/unregisters one overlay id (React `useId()`).
- **Consumers:**
  - `components/modals/Modal.tsx` — standard dialogs
  - `components/common/BottomSheet.tsx` — mobile filter/select sheets, header catalog search, and PWA update prompt (`mobileOnly={false}` when needed on desktop)
  - `components/modals/BottomSheet.tsx` — legacy sheet primitive (prefer `components/common/BottomSheet.tsx` for new work)
  - `components/ListingPage/useListingPageImageModal.ts` — listing photo viewer

Nested overlays (e.g. modal over a sheet) each push one history entry; Back closes the topmost first.

## Scroll lock

Most overlays (`Modal`, `modals/BottomSheet`, the mobile menu drawer, the listing photo viewer) use `useScrollLock` (reference-counted; sets `overflow: hidden` on `document.documentElement` and `document.body`). Scroll position is restored after unlock using a double `requestAnimationFrame` pass so iOS Safari keeps the previous `scrollY` stable when dynamic browser chrome changes.

`components/common/BottomSheet.tsx` intentionally does **not** use `useScrollLock`: setting `overflow: hidden` on `body` re-anchors the `position: sticky` page header to the document top, so it scrolls out of view when a sheet opens on a scrolled page. Instead it blocks background scroll with `useBlockBackgroundScroll` (capture-phase `wheel`/`touchmove` `preventDefault`, allowing scroll only inside `[data-bottom-sheet-scrollable]`), which keeps the page position fixed without touching `body`/`html` styles or the sticky header. Overlay history stays active until the sheet portal unmounts after the exit animation, so programmatic close (for example **OK**) does not pop history mid-transition. Header catalog search calls `detachTopOverlayHistory()` before `replace`/`push` so that delayed overlay `history.back()` does not undo the new search URL.

## Home scroll after Back from listing

Home scroll restoration is coordinated by a state machine in `lib/home-scroll-restore.ts` (`idle → pending → scrolled → correcting → done/cancelled`). `ScrollReset.tsx` reads the restore target on `/` and calls `beginHomeScrollRestore`, which performs one instant `scrollTo` in `useLayoutEffect` before paint. While restore is active, `ListingGrid` reserves the saved grid height as `minHeight` on the results container (persisted with `scrollY` as `homeReloadGridHeight`/`homeReloadViewportW`, applied only when the viewport width matches), so the footer stays in place and no skeleton flash occurs.

After the grid reports readiness (`reportGridReady` + `reportBannerDecided` from `useListingGridScrollEffects`), the coordinator runs a short correction window (max 3s, up to 12s when many listings are loaded): reload/back-forward and return from a listing detail both re-apply the exact saved `scrollY`. On listing click from home, `preserveHomeScrollPosition(listingId)` stores the pixel offset and `persistHomeReloadScrollState()` stores grid height for the min-height placeholder (SPA navigation does not fire `pagehide`). Any user interaction (wheel/touch/key/pointer) cancels the restore immediately.

## Related

- [image-preview.md](./image-preview.md) — photo viewer controls
- [search-filters.md](./search-filters.md) — mobile bottom sheets for filters
- [header-catalog-search.md](./header-catalog-search.md) — header catalog suggest sheet
