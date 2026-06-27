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
  - `components/common/BottomSheet.tsx` — mobile filter/select sheets and PWA update prompt (`mobileOnly={false}` when needed on desktop)
  - `components/modals/BottomSheet.tsx` — legacy sheet primitive (prefer `components/common/BottomSheet.tsx` for new work)
  - `components/ListingPage/useListingPageImageModal.ts` — listing photo viewer

Nested overlays (e.g. modal over a sheet) each push one history entry; Back closes the topmost first.

## Scroll lock

Most overlays (`Modal`, `modals/BottomSheet`, the mobile menu drawer, the listing photo viewer) use `useScrollLock` (reference-counted; sets `overflow: hidden` on `document.documentElement` and `document.body`). Scroll position is restored after unlock using a double `requestAnimationFrame` pass so iOS Safari keeps the previous `scrollY` stable when dynamic browser chrome changes.

`components/common/BottomSheet.tsx` uses `useIosKeyboardScrollLock` on mobile (`overflow: hidden` on `document.documentElement` and `document.body`, plus `focusin` scroll-into-view for inputs inside the sheet) together with `useBlockBackgroundScroll` (capture-phase `wheel`/`touchmove` `preventDefault`, allowing scroll only inside `[data-bottom-sheet-scrollable]`). The sheet portal mounts on `document.body` so `position: fixed` overlay/panel anchoring stays correct on iOS Safari. Overlay history stays active until the sheet portal unmounts after the exit animation, so programmatic close (for example **OK**) does not pop history mid-transition.

## Home scroll after Back from listing

Home scroll restoration is coordinated by a state machine in `lib/home-scroll-restore.ts` (`idle → pending → scrolled → correcting → done/cancelled`). `ScrollReset.tsx` reads the restore target on `/` and calls `beginHomeScrollRestore`, which performs one instant `scrollTo` in `useLayoutEffect` before paint. While restore is active, `ListingGrid` reserves the saved grid height as `minHeight` on the results container (persisted with `scrollY` as `homeReloadGridHeight`/`homeReloadViewportW`, applied only when the viewport width matches), so the footer stays in place and no skeleton flash occurs.

After the grid reports readiness (`reportGridReady` + `reportBannerDecided` from `useListingGridScrollEffects`), the coordinator runs a short correction window (max 3s, up to 12s when many listings are loaded): reload/back-forward and return from a listing detail both re-apply the exact saved `scrollY`. On listing click from home, `preserveHomeScrollPosition(listingId)` stores the pixel offset and `persistHomeReloadScrollState()` stores grid height for the min-height placeholder (SPA navigation does not fire `pagehide`). Any user interaction (wheel/touch/key/pointer) cancels the restore immediately.

## Related

- [image-preview.md](./image-preview.md) — photo viewer controls
- [search-filters.md](./search-filters.md) — mobile bottom sheets for filters
