---
title: Image preview system
owner: platform
tags:
  - type/guide
  - domain/listings
  - scope/core
  - status/active
---

# Image preview system

Documentation for the image preview and photo viewer: listing cards on the homepage, listing detail page preview block, and full-screen modal.

## Overview

The image preview system provides a simple, fast, and efficient way for users to view and switch between listing photos. The implementation follows the principle of "trust the browser" — leveraging built-in browser caching and image loading capabilities instead of complex custom preloading systems.

**Locations:**

- **Listing card (homepage):** `core/frontend/components/listing/ListingCard.tsx` — 2-layer photo carousel (`ListingCardImageCarousel` in `ListingCardParts.tsx`); prev/next UI is `ListingPhotoCarouselNavButtons` (`variant="card"`). Adjacent photos preloaded with responsive `srcset`/`sizes` matching `next/image` (`listing-card-image.ts`); desktop hover also preloads the next photo; reset-to-first: on desktop on hover leave, on mobile/tablet when card leaves viewport (see below)
- **Listing page:** Page state and thumbnail logic: `core/frontend/app/listings/[id]/useListingPageClient.ts`, `ListingPageClient.tsx`
- **Listing page preview block:** `ListingPageImages.tsx` (`PreviewState`: confirmed/pending hero slots, navigation, imperative handle), `ListingPageImagesLayout.tsx` (markup; hero prev/next: `ListingPhotoCarouselNavButtons` with `variant="preview"`; **mobile** `<640px`: 3 thumbnail columns, first 3 images only—no hidden fourth tile in DOM), `ListingPageImagesPreview.tsx` (two persistent hero layers, thumbnail tiles, timing constants), `core/frontend/hooks/useListingImages.ts` — swipe, reset-to-first; hero uses **two fixed slots** (`primary` / `secondary`): pending slot loads the target in the DOM under the confirmed layer; after `next/image` `onLoad` on that layer, state promotes the pending slot to confirmed (no CSS `translate` slide—reduces iOS Safari compositor flicker). **Separate readiness:** thumbnail `onLoad` marks URL preload only; hero `onLoad` marks the index as hero-ready (`heroImageLoadedRef`). **blurhash** on first hero paint and thumbnails as before. Paths: `core/frontend/components/ListingPage/`.
- **Photo viewer modal:** `core/frontend/components/ListingPage/ListingPageImageModal.tsx` — full-screen viewer; multi-image prev/next uses `ListingPhotoCarouselNavButtons` with `variant="modal"` (desktop-only visible arrows; labels from `listings.previousPhoto` / `listings.nextPhoto`).
- **Shared carousel controls:** `core/frontend/components/listing/ListingPhotoCarouselNavButtons.tsx` — `card` | `preview` | `modal` styling for the same interaction pattern.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Listing card photo carousel (homepage)](#listing-card-photo-carousel-homepage)
3. [Thumbnail Preview Switching](#thumbnail-preview-switching)
4. [Photo Viewer Modal](#photo-viewer-modal)
5. [Loading States](#loading-states)
6. [Image Optimization](#image-optimization)
7. [Implementation Details](#implementation-details)
8. [Performance Metrics](#performance-metrics)

---

## Architecture

### Core Principles

1. **Trust the Browser** - Browser already handles caching, priority management, and network optimization
2. **Simplicity** - Less code = fewer bugs, easier to maintain
3. **Performance** - Instant switching from cache, loader only when needed
4. **UX** - No flickering, smooth transitions, readable loaders

### State Management

**Page / thumbnail state (in page hook and `useListingImages`):**

- `currentImageIndex` (page), `PreviewState` + `visibleIndex` (confirmed slot index in `ListingPageImages`), `mainImageLoading` — preview
- `modalImageIndex`, `isImageModalOpen` — which photo the modal is on and whether it is open
- `imageErrors: Set<number>` — failed indices (shared; modal updates via `onImageError`)

**Modal component state (inside `ListingPageImageModal`):**

- `visibleIndex` — last successfully shown image (confirmed layer); may lag behind `currentIndex` while pending loads
- `modalImageLoading`, `showSpinner` — loading and delayed spinner
- `targetImageWidth`, `imageQuality`, `isMobileViewport` — from viewport/network

**Refs:**

- `mainImageLoadedRef: Set<number>` — indices whose preview URL finished preload (`useListingImages`); `heroImageLoadedRef: Set<number>` — indices whose **hero** `next/image` has fired `onLoad` (used to skip redundant waits when swapping layers)
- `modalImageLoadedRef: Set<string>` — cache of loaded modal image URLs (URL-keyed for correct cache hits when width/quality change)
- `imagesCacheRef: HTMLImageElement[]` — (card carousel, preview hook, modal) keeps references to preloaded `new Image()` instances so the browser does not GC them and evict decoded data; when the image set changes, handlers are cleared (`onload`/`onerror = null`) and the array is reset to avoid leaks

### Key Simplifications

**Removed:**

- ❌ `<link rel="preload">` system with manual management (~200 lines)
- ❌ Preload queues with priorities
- ❌ Limits and counters for active preloads
- ❌ Complex 5-level loading checks
- ❌ Excessive refs (`preloadLinksRef`, `preloadQueueRef`, etc.)
- ❌ `preloadImageOnHover` function with timeouts

**Kept:**

- ✅ Simple check via `new window.Image()` and `testImg.complete`
- ✅ Preview and modal both preload adjacent images via browser-managed `new window.Image()`
- ✅ Preview: flicker protection via `useLoadingState` (thumbnail block)
- ✅ Modal: two-layer rendering (confirmed + pending), spinner after 300ms delay, no duplicate handlers/preload in page hook
- ✅ Cache: indices for preview (`mainImageLoadedRef`), URL-keyed for modal (`modalImageLoadedRef`)

---

## Listing card photo carousel (homepage)

**Components:** `core/frontend/components/listing/ListingCard.tsx` (parent), `core/frontend/components/listing/ListingCardParts.tsx` (`ListingCardImageCarousel`), `core/frontend/components/listing/listing-card-image.ts` (shared quality, `sizes`, and responsive preload srcset), `core/frontend/components/listing/useListingCardCarouselPreload.ts`.

On the homepage, each listing card can show multiple photos in a carousel when the listing has more than one image.

### Behaviour

- **Carousel:** When `listing.images.length > 1`, photos use a **two-slot layer model** (`primary` / `secondary`): the **confirmed** layer stays visible while the **pending** layer loads the target via `TrackedNextImage`. After `onLoad` (and `decode()` when available), the pending slot is promoted to confirmed. No horizontal CSS slide; blur placeholders are not shown on the pending target (avoids flicker). If the target is already in `loadedRef`, promotion runs on the next animation frame.
- **Prev/Next buttons:** Two round buttons at the bottom of the image area (`bottom-3 left-3` and `bottom-3 right-3`). Shown only when there are multiple photos. **Disabled** (native `disabled`, not only opacity) while the carousel is busy (`pendingSlot !== null`, reported via `onBusyChange`) or during automatic rewind (`isAutoRewinding`). Additional clicks are ignored until idle.
- **Button visibility:** Mobile: buttons always visible with `opacity-60`; desktop (lg+): hidden by default, appear on card hover, full opacity when hovering the button.
- **Reset to first photo (desktop, lg+):** When the user leaves the card (mouse leave), a 10-second timer starts. If it expires and the current photo is not the first, the card calls `carouselRef.current?.goPrev()` on an interval (every 400ms) until `onIndexChange(0)` is received, then clears the interval. Re-entering the card or clicking prev/next clears the timer and interval.
- **Reset to first photo (mobile/tablet, max-width 1024px):** The only trigger for the 10-second rewind is the card **leaving the viewport** (via `IntersectionObserver`). When the card goes out of view, the timer starts; when it expires, the rewind animation runs (same interval of `goPrev()` until index 0). Returning the card into view does **not** reset the timer. If the user taps prev/next while the timer is running (before rewind starts), the timer and any rewind are cancelled. Once the rewind animation has started, the prev/next buttons are disabled until the rewind finishes.
- **Single photo:** When there is only one image (or none), the card shows a single image and no prev/next buttons; no carousel is rendered.

### Architecture: dual-slot carousel

The carousel owns transition state; the parent does not pass `currentImageIndex`.

- **State (`ListingCardImageCarousel`):** `confirmedSlot`, `pendingSlot`, `slotIndices`. While `pendingSlot !== null`, navigation is ignored. Imperative handle: `goNext()`, `goPrev()`, `isBusy()`, `getIndex()`.
- **Parent–carousel contract:** Parent passes `images`, `imageErrors`, `onImageError`, `onBusyChange`, `onIndexChange`, `imageAltTitle`, `priority`, blur hashes, `t`. Parent holds a ref and calls `goNext()` / `goPrev()` for button clicks and rewind. Parent keeps `carouselIndex` from `onIndexChange` (badges, navigation blur cache).
- **Flow:** `navigateTo(targetIndex)` assigns the target to the idle slot as `pendingSlot`. Placeholder/error indices promote immediately. Otherwise the pending layer loads; `onLoad` calls `promotePendingSlot`. If `loadedRef` already has the index, an effect promotes on the next frame.
- **Preloading:** `useListingCardCarouselPreload` preloads next and previous indices on each confirmed index change. Uses `applyListingCardResponsivePreload` so preload hits the same CDN URL the browser selects from `next/image` srcset (not a fixed width). Desktop card hover also preloads the next photo responsively. Preloaded `Image` objects are kept in `imagesCacheRef`; handlers cleared when the image set changes.
- **Card image params:** Quality `75` (`CARD_IMAGE_QUALITY`), `sizes` `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 360px`, device widths `[640, 750, 828, 1080, 1200]` via `listing-card-image.ts` and the CDN loader (`GET /api/upload/image` persistent `/uploads/optimized/` cache).
- **Constants:** `RESET_TO_FIRST_DELAY_MS = 10000`, `REWIND_STEP_MS = 400` (in `ListingCard.tsx`).

---

## Thumbnail Preview Switching

### How It Works

1. **Thumbnails and preview use the same URL** → Single browser cache
2. **Click on thumbnail** → If image is in cache (it is, since thumbnail is already loaded) → Instant switch
3. **Loader** → Only shown if image is actually loading (not in cache)

### Image Quality Unification

All images (thumbnails and preview) use the same parameters:

```typescript
const IMAGE_QUALITY = 75;
const IMAGE_WIDTH = 1200;

const optimizedUrl = getOptimizedImageUrl(imageUrl, IMAGE_QUALITY, IMAGE_WIDTH);
```

**Why this matters:**

- One URL = one server request
- Browser caches the image once
- Click on thumbnail → preview displays instantly from cache

### Adjacent Image Preloading (listing page preview)

`useListingImages` runs a `useEffect` on `currentImageIndex` (the **confirmed** preview index). It preloads with the same display URL (`getOptimizedImageUrl`, quality `75`, width `1200`) and merges duplicate jobs by minimum delay:

- Next index: delay `0`
- Second-ahead (if `images.length > 2`): `40ms`
- Third-ahead (if `images.length > 3`): `120ms`
- Previous index: `180ms`

Constants: `PRELOAD_SECOND_AHEAD_DELAY_MS`, `PRELOAD_THIRD_AHEAD_DELAY_MS`, `PRELOAD_PREV_DELAY_MS` in `useListingImages.ts`.

- Preloaded `Image` instances are pushed to `imagesCacheRef`; cleaned when the image **set** changes (`imagesSignature`).
- **Unlike the listing card**, the preview hook does **not** bulk-preload every remaining photo on first navigation; rely on adjacent preloads + `preloadTarget()` during navigation and on horizontal swipe intent (`ListingPageImages`).

### Readiness and navigation (`ListingPageImages` + `useListingImages`)

- **`isTargetReady(index)`** — `mainImageLoadedRef` (preload `Image` finished or was already complete).
- **`isHeroReady(index)`** — `heroImageLoadedRef` (hero `next/image` `onLoad` for that index). Thumbnail `onLoad` alone does **not** set hero readiness.
- **`navigateTo(toIndex)`** assigns the target to the **pending** hero slot, then: if `isHeroReady` → promote on next frame; else if `isTargetReady` → wait for hero `onLoad`; else `setMainImageLoading(true)` and `preloadTarget(toIndex)` until ready.
- **Spinner:** layout receives `showMainImageLoader && pendingSlot !== null` — full-area spinner only while a pending navigation waits on load, not over the confirmed image.

### Loader with flicker protection

`useLoadingState` in `useListingImages`:

- `showDelay: 120` (`LOADING_INDICATOR_DELAY_MS`)
- `minDisplayTime: 120`

**Rule:** Cached / instant-ready paths clear `mainImageLoading` quickly; the delayed show avoids a flash when load finishes immediately. The large spinner is still gated by `pendingSlot` in the layout (see above).

### Preview block: navigation and hero layers

The listing page preview (`ListingPageImages` + `ListingPageImagesPreview`) matches the **listing card carousel** in spirit: no horizontal slide between photos. The hero uses two **fixed** DOM layers that swap **opacity / visibility** after the pending layer’s `next/image` reports `onLoad` (promotion scheduled with `requestAnimationFrame`). The card shows a single visible layer and swaps index instantly after preload (small overlay spinner while the off-screen `Image` loads).

- **Prev/Next buttons:** Same placement and hover rules as documented for the card (vertically centered on the preview block).
- **Swipe:** Same thresholds as before (min distance `50px`, horizontal intent ~`18px`, `|dx| > |dy| * 1.1`, `preventDefault` only when horizontal). While swiping, the predicted next index may call `preloadTarget` early.
- **Hero layers:** `renderPreviewSlides` draws `primary` and `secondary` slots; the **confirmed** slot is visible; the **pending** slot (if any) holds the incoming image underneath until load completes, then slots swap and the old confirmed slot is cleared. Both slots use `next/image` (no separate native `<img>` path in the hero).
- **Loaders:** Full-area `Spinner` only when `pendingSlot !== null` and `useLoadingState` exposes visibility—confirmed image stays visible underneath; there is no separate small overlay spinner on the hero (card carousel still uses its own overlay while preloading).
- **Thumbnails:** On narrow viewports (`window.innerWidth < 640`), only **three** thumbnails are rendered (`slice(0, 3)`), matching a 3-column grid; desktop uses four. This avoids a hidden fourth lazy thumbnail on mobile WebKit.
- **Reset to first photo:** Mouse leave starts `RESET_TO_FIRST_DELAY_MS` (`10000`); rewind steps use `REWIND_STEP_MS` (`220`) from `ListingPageImagesPreview.tsx`. Re-entering or interacting cancels.

### Preview anti-flicker contract

The inline preview on the listing page is expected to behave as follows:

1. **Initial load:** the hero preview may show a blur placeholder on first paint; visible thumbnails may also use blur placeholders where blurhash data exists.
2. **After first paint:** inline preview navigation no longer relies on blur placeholders. On swipe, button click, or thumbnail click, the current frame stays visible until the target frame is confirmed ready.
3. **No gray interstitial:** a pending target must not expose the preview block background as the main view. While loading, the **confirmed** hero layer stays visible; a full-area spinner may appear only when `pendingSlot` is set and the load is slow enough to pass `useLoadingState` delays.
4. **Second-pass stability:** once a frame has been preloaded or already shown, going back and forth over the same images should not re-enter a visible gray/loading path.
5. **Shared preview cache:** thumbnails and inline preview use the same optimized URL (`75`, `1200`) so clicking a visible thumbnail can switch instantly from browser cache.
6. **Gesture safety:** horizontal swipe should not fight vertical page scrolling, and a completed horizontal swipe must not trigger a follow-up accidental preview click.

### Controls

- **Prev/Next buttons** — Switch to previous/next photo (when multiple images); cancel reset-to-first timer
- **Swipe** — Previous/next on touch (when multiple images)
- **Click on thumbnail** — Switches preview
- **`+N` on last visible thumbnail** — Selects the **same** photo as that thumbnail (the one under the mask) and opens the modal on it; the overlay only indicates that more photos exist beyond the row
- **ArrowLeft/ArrowRight** — Switches photos (when focus is not in modal)

---

## Photo Viewer Modal

**Component:** `core/frontend/components/ListingPage/ListingPageImageModal.tsx`. All modal behaviour (keyboard, scroll lock, preload, two-layer rendering) lives here; the page hook only holds `isImageModalOpen`, `modalImageIndex`, `setModalImageIndex`, and passes `onImageError` to sync failed indices.

### How It Works

1. **Two-layer rendering** — "Confirmed" layer shows the last successfully loaded image; "Pending" layer loads the target image with `opacity-0` until `onLoad`. No blank frame when swiping.
2. **Preloading** — Next, previous, and (on mobile) second-next images are preloaded inside the modal with the same adaptive width/quality used for display. No preload in `useListingPageClient`.
3. **Spinner** — Shown only after 300ms of loading; previous image stays visible until the new one is ready or the spinner appears.
4. **Scroll lock** — On open, `window.scrollY` is saved and `body` gets `top: -scrollY` so the page does not jump; on close, scroll position is restored (fixes iOS Safari).
5. **Adaptive quality contract** — The modal may request a different, higher-quality URL than the inline preview. This is expected. The UX requirement is not "no request at all", but "no empty frame while the higher-quality frame is loading"; an already available preview-quality frame may be used as the immediate visual fallback before the adaptive modal URL is confirmed.

### Rendering

- **Confirmed layer:** `<Image>` with `visibleIndex`, always visible (`opacity-100`). `onLoad` adds URL to cache and clears loading.
- **Pending layer:** `<Image>` with `currentIndex`, `opacity-0`, only when `pendingUrl !== confirmedUrl`. `onLoad` adds URL to cache, sets `visibleIndex = currentIndex`, clears loading. `key={`pending-${currentIndex}`}` so rapid swipes unmount the previous pending image.
- **Errors:** `onImageError(index)` is called from both layers; parent updates `imageErrors` so the broken index is not retried.

### Loading Check and Cache

- Loading is driven by an effect that checks the current image URL (adaptive `targetImageWidth` and `imageQuality` from viewport and network hints). Cache is URL-keyed (`modalImageLoadedRef: Set<string>`).
- If URL is already in cache → `setModalImageLoading(false)` and `setVisibleIndex(currentIndex)`.
- Otherwise a `new window.Image()` is used to load; `onload`/`onerror` update cache and state. Stale callbacks are cleared when the effect re-runs.

### Preloading (inside modal)

- Next image: preload immediately.
- Previous image: preload after 120ms.
- On mobile, for the first couple of navigations, second-next is also preloaded (after 40ms).
- All use `getOptimizedImageUrl(..., imageQuality, targetImageWidth)` so preload and display share the same URL and benefit from browser cache.

### Loader

- `showSpinner` is set to `true` after 300ms while `modalImageLoading` is true, and cleared when loading finishes. No `useLoadingState` in the modal.
- Spinner is rendered above both image layers (`z-20`).

### Viewport and network

- On open/resize, `targetImageWidth` and `imageQuality` are computed from viewport and (where available) `navigator.connection`. Width changes smaller than 50px are ignored to avoid churn from mobile address bar.
- iOS Safari does not support `navigator.connection`; those users get the default (faster) profile.

### Controls

- **Escape / Enter / Space** — Close modal.
- **System Back (Android / PWA)** — Closes the modal via shared overlay history (`overlay-back-navigation.md`); does not leave the listing page.
- **ArrowLeft / ArrowRight** — Previous/next photo (handled only in the modal; no duplicate handler in the page hook).
- **Click on overlay** — Close modal.
- **Swipe** — Next/previous on touch.
- **Scroll** — Locked while modal is open (`useScrollLock`); position restored on close.

---

## Image load failure monitoring (Sentry)

When `useImageRetry` finishes all three scheduled retries without a successful load, the client calls `reportImageLoadFailure` in `core/frontend/lib/image-failure-monitor.ts`, which emits a Sentry warning `image_load_failed`.

**Flow:** `onError` on listing card / listing page / modal images triggers retries only; the Sentry report runs on final exhaustion, not on the first failure.

**Diagnostics:** The monitor calls `GET /api/diagnostics/image-status?url=...` on the API (`core/backend/src/diagnostics/`) so the server performs an allowlisted `HEAD` to the image URL (avoids broken browser CORS probes to `cdn.kupito.club`).

**Tags / extra:** `retriesExhausted`, `imageUrlKind` (`origin` vs `optimized`), `imageHost`, `imageStatus` from the HEAD response, plus `inflightImages` (global counter from `TrackedNextImage` / `core/frontend/lib/image-inflight-tracker.ts`), `navigationCount` (`NavigationTelemetry` + `core/frontend/lib/navigation-count.ts`), `attemptsMade`, and connection metadata.

**Listing detail:** `ListingPageClient.tsx` sets a ref on each `onImageError` so the final report uses `listing_page` vs `listing_modal` correctly.

---

## Loading States

### Preview (thumbnail block)

The **preview** uses `useLoadingState` in `useListingImages`:

```typescript
const { visible: showMainImageLoader } = useLoadingState({
  isLoading: mainImageLoading,
  showDelay: 120,
  minDisplayTime: 120,
});
```

- `ListingPageImagesLayout` passes `showMainImageLoader && pendingSlot !== null` so the large spinner only appears during an in-flight hero navigation, not on the initial idle paint.
- `minDisplayTime: 120` avoids sub-frame flicker when hiding the spinner.

### Modal

The **modal** does not use `useLoadingState`. It uses a simple delay:

- `showSpinner` becomes true 300ms after `modalImageLoading` becomes true, and is cleared when loading ends.
- The confirmed image stays visible until the new image is ready or the spinner appears, so there is no black gap.

### Preview loader timing

- **`showDelay: 120`** — avoids flashing the spinner on loads that complete within one frame.
- **`minDisplayTime: 120`** — once visible, the spinner stays at least 120ms so hide/show does not flicker on fast loads.
- If the target is already ready, `mainImageLoading` may never stay true long enough for the spinner to show; combined with `pendingSlot` gating, the confirmed image stays visible.

---

## Image Optimization

### Card grid images

- **Quality:** 75% (`CARD_IMAGE_QUALITY` in `listing-card-image.ts`)
- **Responsive widths:** `next/image` + custom CDN loader; `sizes` `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 360px`; browser srcset comes from global `deviceSizes` in `next.config.js` (card requests typically land on 640–1200px widths)
- **Delivery warm-up:** On each upload (`UploadService.saveFile`), the backend pre-generates persistent `/uploads/optimized/{uuid}_{width}_75.webp` variants for widths **640, 750, 828, 1080, 1200** in the background so listing-card cover requests avoid on-the-fly `sharp` resize. Constants: `DELIVERY_WARM_WIDTHS` / `DELIVERY_WARM_QUALITY` in `core/backend/src/upload/optimized-delivery-cache.utils.ts`. Legacy listings: `npm run warm:card-variants:cover` (see `core/backend/docs/scripts.md`).
- **Preload:** Adjacent card photos and load-more append use the same srcset/sizes as slides so browser cache hits on navigation (`prewarmListingCardCoverImages` in `listing-card-image.ts`)

### Preview Images

- **Quality:** 75%
- **Max width:** 1200px
- **URL:** `getOptimizedImageUrl(imageUrl, 75, 1200)`
- **Thumbnails and preview use the same URL**

### Modal Images

- **Adaptive:** Quality and max width depend on viewport and network (e.g. mobile + slow network → lower quality and width; desktop → up to 85%, 1920px). Computed in the modal on open and on resize (with a 50px width threshold to avoid address-bar churn).
- **URL:** `getOptimizedImageUrl(imageUrl, imageQuality, targetImageWidth)` with the same params used for preload so the browser cache is shared.

### Why Different Quality?

- **Preview (75%, 1200px):** Balance between quality and file size for main view; same URL for thumbnails and main preview.
- **Modal (adaptive):** Full-screen viewer optimised for mobile (lighter on slow networks) and desktop (higher quality when possible).

### Blur placeholders (blurhash)

- **Search / listing cards:** `cover_blur_hash` on the listing; `ListingCard` decodes with `blurhashToDataURL` (`core/frontend/lib/utils/blurhash.ts`).
- **Management cards:** `ListingManagementCard` (my listings, admin, board) decodes `cover_blur_hash` → `placeholder="blur"` on the cover `Image`.
- **Comparison table:** `comparisonFields.tsx` photo cell uses `cover_blur_hash` → `placeholder="blur"` on both external and internal `Image` variants.
- **Listing detail:** API returns `image_blur_hashes` (jsonb, same order as `images`, nullable slots) and `cover_blur_hash`. UI uses per-index hash when present; index `0` falls back to `cover_blur_hash` if the array slot is empty (legacy rows).
- **Navigation blur cache:** On SPA navigation from a card to the listing detail page, `loading.tsx` (route-level Suspense fallback) can show a blur placeholder in the hero area instead of a gray skeleton. `ListingCard` and `ListingManagementCard` save `cover_blur_hash` to an in-memory LRU cache (`core/frontend/lib/blur-navigation-cache.ts`, max 50 entries) on click; `loading.tsx` (`'use client'`) reads the cache via `useParams()` and renders the decoded blur as a CSS `background-image`. When no cached blur exists (direct navigation, SEO, shared links), the fallback is the original gray pulse skeleton.
- **Create/update:** Form sends `image_blur_hashes` in parallel with `images` (length must match). Upload response includes `blurhash` per file.
- **Partner imports:** The import pipeline (CipAuto, 999.md) collects `blurhash` from each upload response and includes `image_blur_hashes` in the create-listing payload, so imported listings have blur placeholders immediately.
- **Backfill (legacy data):** `npm run backfill:blurhash:cover` (cover only) and `npm run backfill:blurhash:all` (full array) from `core/backend`; requires DB + S3 access. Only needed for listings created before blurhash was integrated into the import pipeline. See `core/backend/docs/scripts.md`.

### Local development vs production

Blur placeholders are **not** turned off by `NODE_ENV` or a separate dev-only flag. The UI only renders them when the listing payload includes non-empty `cover_blur_hash` / `image_blur_hashes` (decoded to `blurDataURL` for `next/image`). If your **local** database has `NULL` for those fields—common with seeds, manual inserts, or dumps without blur data—you will see **no** blur placeholder while **production** may show one for the same logical listing after create/update or a backfill. To see placeholders locally: create or edit a listing through the app (payload includes hashes when photos are processed), or run the blurhash backfill against the same DB and S3 your backend uses. CSS `backdrop-blur` on layout components (e.g. footer) does not depend on listing blurhash fields.

---

## Implementation Details

### Image Loading Flow

1. **User triggers preview navigation:**
   - Assign target index to the **pending** hero slot (`preparePendingPreviewState`)
   - If `isHeroReady` → schedule promotion (`requestAnimationFrame`)
   - Else if preload already done (`isTargetReady`) → wait for hero `onLoad` on the pending layer
   - Else → `preloadTarget` + `mainImageLoading`; on ready, hero `onLoad` triggers promotion

2. **Loader:** `useLoadingState` with `showDelay: 120` and `minDisplayTime: 120`; UI shows the large spinner only when `pendingSlot` is set (confirmed layer stays visible).

3. **Preloading:**
   - Simple `new window.Image()` for adjacent photos
   - Browser decides when and how to load
   - No manual queue management

### Why This Works Better

1. **Browser already knows how to:**
   - Cache images
   - Manage loading priorities
   - Preload on hover
   - Optimize network requests

2. **One URL = one request:**
   - Thumbnail loads → image in cache
   - Click on thumbnail → preview taken from cache → **0ms**

3. **Simplicity = reliability:**
   - No complex queues
   - Proper cleanup prevents memory leaks
   - Race conditions prevented through index checking
   - No ref synchronization → no desynchronization

4. **Race condition prevention:**
   - Captures index at start of async operation
   - Callbacks check if captured index matches current index
   - Cleanup function cancels old callbacks
   - Both `testImg` (async check) and DOM `onLoad` (render check) protected

### Error Handling

**Preview:** `useListingImages` exposes `handleHeroImageLoad` and `handleThumbnailImageLoad`; the page passes `onImageError` so failed indices land in the shared `imageErrors` Set (from `<Image>` `onError`). Placeholder is shown for failed images.

**Modal:** The modal receives `onImageError: (index: number) => void` and calls it from both the confirmed and pending `<Image>` `onError` handlers (with the correct index). The parent updates `imageErrors`; the modal does not call `onIndexChange` on error (that would retry the same broken index). Failed images show the placeholder and do not block others.

**Retry:** When an image fails to load, the UI shows a placeholder and automatic retries run in the background via `useImageRetry` (see `core/frontend/hooks/useImageRetry.ts`). Up to 3 retries with delays 3s, 8s, 15s; on success the index is removed from `imageErrors` and the image is shown. Used on the listing card (via `useListingCardImageError`) and on the listing page (preview and modal).

**Failure reporting (Sentry):** When the placeholder is shown for a failed image, `reportImageLoadFailure` (from `core/frontend/lib/image-failure-monitor.ts`) sends a non-exception event to Sentry with scope (`listing_card`, `listing_page`, or `listing_modal`), listingId, imageUrl, index, pathname, userAgent, viewport, and network info (effectiveType, downlink, rtt, saveData). Events are deduplicated and rate-limited. This helps diagnose issues such as rate limiting or network failures on mobile.

---

## Performance Metrics

### Code Reduction

| Metric                        | Before        | After   | Improvement              |
| ----------------------------- | ------------- | ------- | ------------------------ |
| **Lines of code**             | ~500          | ~100    | **-80%**                 |
| **State/refs**                | 15            | 6       | **-60%**                 |
| **Checks on thumbnail click** | 5 levels      | 1 check | **-80%**                 |
| **Delay (cache)**             | Could be      | 0ms     | **Instant**              |
| **Delay (network)**           | Real + 1000ms | Real    | **No artificial delays** |
| **Complexity**                | High          | Low     | **Easy to maintain**     |

### Performance Characteristics

- **Listing card (homepage):** At most **two hero-style layers** per card (`primary` / `secondary`); confirmed stays visible until pending loads, then slots swap (no translate animation). Adjacent indices preloaded with responsive srcset matching slides. Buttons disabled while `pendingSlot` is set or during auto-rewind. Preloaded `Image` objects kept in `imagesCacheRef`; cache cleared when the image set changes.
- **Preview (listing page):** At most **two hero layers** in the DOM (`primary` / `secondary`); the confirmed layer stays visible until the pending layer’s image loads, then slots swap (no translate animation). `useListingImages` preloads adjacent indices with staggered delays (next `0`, second-ahead `40ms`, third-ahead `120ms`, previous `180ms`). No bulk “preload all remaining” pass on first navigation (card carousel still does). Preloaded images are tracked in `imagesCacheRef` and cleaned up when the listing changes.
- **Modal:** Two layers (confirmed + pending), max 2 decoded images. Spinner after 300ms if still loading. Preload next/prev/second-next with same URL as display. Preloaded `Image` objects kept in `imagesCacheRef` and cleared when the image set changes. No duplicate preload or keydown logic in the page hook.
- **Memory:** Card, preview, and modal each keep a ref to preloaded `Image` instances (`imagesCacheRef`) so decoded data stays in memory; when the image set changes, `onload`/`onerror` are set to `null` and the cache array is reset to avoid leaks. URL/index sets (`mainImageLoadedRef`, `modalImageLoadedRef`, `loadedRef`) track which images are ready.

### Browser Compatibility

- Uses standard `window.Image()` constructor (all modern browsers)
- `testImg.complete` check (all modern browsers)
- `onload`/`onerror` handlers (all modern browsers)
- No experimental APIs or browser-specific features

---

## Testing Checklist

### Functional Testing

- ✅ **Listing card (homepage):**
  - Multiple photos: prev/next buttons at bottom of image; on desktop buttons appear on card hover only
  - Two persistent layers: pending image loads under confirmed; swap after `onLoad` (no horizontal slide)
  - Current photo stays visible until target is ready; no blur flash on pending layer
  - While `pendingSlot` is set or auto-rewind runs, carousel reports busy via `onBusyChange` and buttons are disabled (native `disabled`); rapid clicks ignored until idle
  - Desktop: mouse leave starts 10s timer; after 10s parent runs interval calling `goPrev()` until index 0. Mobile/tablet: card leaving viewport starts timer; return to view does not cancel; tapping prev/next cancels; during rewind buttons disabled
  - Adjacent photos preloaded with responsive srcset/sizes matching `next/image`

- ✅ **Listing page preview:**
  - Multiple photos: prev/next buttons (vertically centered); same visibility rules as card
  - Swipe left/right switches photo and cancels reset timer
  - Two persistent hero layers: pending image loads under confirmed; swap after `onLoad` (no horizontal slide)
  - Current frame stays visible until the target frame is ready; no gray block between photos
  - Mobile: only three thumbnails in DOM; desktop: four
  - Mouse leave: after 10s rewinds to first photo; re-entering or buttons/swipe/thumbnail cancels

- ✅ **Click on thumbnail:**
  - First click → may show loader (if not in cache)
  - Repeat click → instant switch (from cache)

- ✅ **Switch back and forth:**
  - No delays
  - Smooth transitions

- ✅ **Network tab:**
  - Each image loads only once
  - Repeat clicks don't create new requests

- ✅ **Loader:**
  - Doesn't flicker (either not shown, or visible only briefly with `minDisplayTime: 120`)
  - Only shown when actually loading

- ✅ **Page refresh:**
  - No infinite loader
  - Image loads correctly

- ✅ **Modal:**
  - Opens correctly; scroll position preserved on close (including iOS Safari)
  - One arrow keypress moves exactly one photo (no double handler)
  - Next/prev (and on mobile, second-next) preloaded with same URL as display
  - No black frame or blink on first-pass swipe; two-layer rendering
  - Broken image shows placeholder and calls `onImageError` (no infinite retry)
  - Keyboard and swipe work; spinner only after ~300ms when loading

### Edge Cases

- ✅ **Single image:** No preloading, no errors
- ✅ **No images:** Placeholder shown
- ✅ **Image load error:** Error handled, placeholder shown
- ✅ **Rapid clicking:** No race conditions, smooth behavior
- ✅ **Slow network:** Loader shown appropriately

---

## Migration Notes

### What Was Removed

The previous implementation included:

- Complex `<link rel="preload">` system (~200 lines)
- Preload queues with priorities
- Limits and counters for active preloads
- Complex 5-level loading checks
- Excessive refs and callbacks

### Why It Was Removed

1. **Browser already handles it:** Modern browsers have sophisticated caching and preloading
2. **Added complexity without benefit:** Manual management didn't improve performance measurably
3. **Harder to maintain:** More code = more bugs, harder to debug
4. **Race conditions:** Complex synchronization led to edge cases

### Current Approach Benefits

1. **Simplicity:** Easy to understand and maintain
2. **Performance:** Instant switching from cache
3. **Reliability:** Fewer edge cases, browser handles edge cases
4. **Maintainability:** Less code, clearer logic

---

## Best Practices

### For Developers

1. **Trust the browser:** Don't reinvent caching/preloading
2. **Keep it simple:** Less code is better code
3. **Test cache behavior:** Verify instant switching works
4. **Monitor performance:** Check Network tab for duplicate requests

### For Future Enhancements

If you need to add features:

1. **Keep the simple approach:** Use `new window.Image()` for preloading
2. **Don't add complex queues:** Browser manages priorities better
3. **Test thoroughly:** Especially cache behavior
4. **Document changes:** Update this document

---

## Related Documentation

- [`loading-states.md`](./loading-states.md) - General loading states system
- [`technical.md`](../architecture/technical.md#11-performance-optimizations) - Performance optimizations section

---

**Last Updated:** 2026-06-10  
**Version:** 3.17 (Upload-time delivery warm-up for card widths 640–1200/q75; legacy `warm:card-variants` script; in-flight dedupe in `getOptimizedImage`)
