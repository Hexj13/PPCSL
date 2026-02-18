# Система превью изображений

Complete documentation for the image preview and photo viewer system on listing detail pages.

## Overview

The image preview system provides a simple, fast, and efficient way for users to view and switch between listing photos. The implementation follows the principle of "trust the browser" - leveraging built-in browser caching and image loading capabilities instead of complex custom preloading systems.

**Locations:**

- Page state and thumbnail logic: `core/frontend/app/listings/[id]/useListingPageClient.ts`, `ListingPageClient.tsx`
- Thumbnail block and preload: `core/frontend/components/ListingPage/ListingPageImages.tsx`, `core/frontend/hooks/useListingImages.ts`
- Photo viewer modal: `core/frontend/components/ListingPage/ListingPageImageModal.tsx`

---

## Table of Contents

1. [Architecture](#architecture)
2. [Thumbnail Preview Switching](#thumbnail-preview-switching)
3. [Photo Viewer Modal](#photo-viewer-modal)
4. [Loading States](#loading-states)
5. [Image Optimization](#image-optimization)
6. [Implementation Details](#implementation-details)
7. [Performance Metrics](#performance-metrics)

---

## Architecture

### Core Principles

1. **Trust the Browser** - Browser already handles caching, priority management, and network optimization
2. **Simplicity** - Less code = fewer bugs, easier to maintain
3. **Performance** - Instant switching from cache, loader only when needed
4. **UX** - No flickering, smooth transitions, readable loaders

### State Management

**Page / thumbnail state (in page hook and `useListingImages`):**

- `currentImageIndex`, `mainImageLoading` — preview
- `modalImageIndex`, `isImageModalOpen` — which photo the modal is on and whether it is open
- `imageErrors: Set<number>` — failed indices (shared; modal updates via `onImageError`)

**Modal component state (inside `ListingPageImageModal`):**

- `visibleIndex` — last successfully shown image (confirmed layer); may lag behind `currentIndex` while pending loads
- `modalImageLoading`, `showSpinner` — loading and delayed spinner
- `targetImageWidth`, `imageQuality`, `isMobileViewport` — from viewport/network

**Refs:**

- `mainImageLoadedRef: Set<number>` — cache of loaded preview image indices (`useListingImages`)
- `modalImageLoadedRef: Set<string>` — cache of loaded modal image URLs (URL-keyed for correct cache hits when width/quality change)

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
- ✅ Next image preloading (browser manages it)
- ✅ Preview: flicker protection via `useLoadingState` (thumbnail block)
- ✅ Modal: two-layer rendering (confirmed + pending), spinner after 300ms delay, no duplicate handlers/preload in page hook
- ✅ Cache: indices for preview (`mainImageLoadedRef`), URL-keyed for modal (`modalImageLoadedRef`)

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

### Next Image Preloading

When switching to a new photo, the next image is preloaded in the background:

```typescript
useEffect(() => {
  if (!listing || typeof window === 'undefined' || images.length <= 1) return;

  const nextIndex = (currentImageIndex + 1) % images.length;
  const nextImageUrl = images[nextIndex];

  if (!nextImageUrl || nextImageUrl === '/placeholder-car.jpg' || imageErrors.has(nextIndex)) {
    return;
  }

  const optimizedUrl = getOptimizedImageUrl(nextImageUrl, 75, 1200);
  const img = new window.Image();
  img.src = optimizedUrl; // Browser manages caching
}, [currentImageIndex, listing, imageErrors]);
```

- Uses simple `new window.Image()` - reliable and browser manages cache
- No complex queues, priorities, or manual management

### Loading Check Logic

```typescript
useEffect(() => {
  if (!listing) {
    setMainImageLoading(false);
    mainImageLoadedRef.current.clear();
    return;
  }

  const imagesList =
    listing.images && listing.images.length > 0 ? listing.images : ['/placeholder-car.jpg'];
  const currentImage = imagesList[currentImageIndex];

  if (
    !currentImage ||
    currentImage === '/placeholder-car.jpg' ||
    imageErrors.has(currentImageIndex)
  ) {
    setMainImageLoading(false);
    return;
  }

  if (mainImageLoadedRef.current.has(currentImageIndex)) {
    setMainImageLoading(false);
    return;
  }

  const optimizedUrl = getOptimizedImageUrl(currentImage, 75, 1200);
  const testImg = new window.Image();
  testImg.src = optimizedUrl;
  const imgIndex = currentImageIndex; // Capture for closure

  if (testImg.complete && testImg.naturalWidth > 0) {
    // In cache - instant
    mainImageLoadedRef.current.add(imgIndex);
    setMainImageLoading(false);
    return;
  }

  // Loading - show loader
  setMainImageLoading(true);

  testImg.onload = () => {
    mainImageLoadedRef.current.add(imgIndex);
    // Only update state if this is still the current image
    if (imgIndex === currentImageIndex) {
      setMainImageLoading(false);
    }
  };

  testImg.onerror = () => {
    // Only update state if this is still the current image
    if (imgIndex === currentImageIndex) {
      setMainImageLoading(false);
    }
  };

  // Cleanup: cancel callbacks when index changes
  return () => {
    testImg.onload = null;
    testImg.onerror = null;
  };
}, [currentImageIndex, listing, imageErrors]);
```

**Key points:**

- Simple check via `new window.Image()` and `testImg.complete`
- If in cache → `setMainImageLoading(false)` immediately
- If loading → `setMainImageLoading(true)` and wait for `onload`
- **Race condition prevention:**
  - Captures `imgIndex` before async operations
  - Callbacks only update state if `imgIndex === currentImageIndex`
  - Cleanup function nullifies callbacks when effect reruns

### Loader with Flicker Protection

Loader uses `useLoadingState` with `minDisplayTime: 1000`:

```typescript
const { visible: showMainImageLoader } = useLoadingState({
  isLoading: mainImageLoading,
  minDisplayTime: 1000,
});
```

**Rule:**

- **If image is in cache** → `mainImageLoading` is immediately `false` → loader not shown
- **If image is loading** → `mainImageLoading = true` → loader shown for minimum 1 second (prevents flicker)

### Controls

- **Click on thumbnail** - Switches preview
- **ArrowLeft/ArrowRight** - Switches photos (when focus is not in modal)

---

## Photo Viewer Modal

**Component:** `core/frontend/components/ListingPage/ListingPageImageModal.tsx`. All modal behaviour (keyboard, scroll lock, preload, two-layer rendering) lives here; the page hook only holds `isImageModalOpen`, `modalImageIndex`, `setModalImageIndex`, and passes `onImageError` to sync failed indices.

### How It Works

1. **Two-layer rendering** — "Confirmed" layer shows the last successfully loaded image; "Pending" layer loads the target image with `opacity-0` until `onLoad`. No blank frame when swiping.
2. **Preloading** — Next, previous, and (on mobile) second-next images are preloaded inside the modal with the same adaptive width/quality used for display. No preload in `useListingPageClient`.
3. **Spinner** — Shown only after 300ms of loading; previous image stays visible until the new one is ready or the spinner appears.
4. **Scroll lock** — On open, `window.scrollY` is saved and `body` gets `top: -scrollY` so the page does not jump; on close, scroll position is restored (fixes iOS Safari).

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
- **ArrowLeft / ArrowRight** — Previous/next photo (handled only in the modal; no duplicate handler in the page hook).
- **Click on overlay** — Close modal.
- **Swipe** — Next/previous on touch.
- **Scroll** — Locked while modal is open; position restored on close.

---

## Loading States

### Preview (thumbnail block)

The **preview** uses `useLoadingState` in `useListingImages`:

```typescript
const { visible: showMainImageLoader } = useLoadingState({
  isLoading: mainImageLoading,
  minDisplayTime: 1000,
});
```

- If image is in cache → loader not shown (instant switch).
- If image is loading → loader shown for minimum 1 second (readable indicator, prevents flicker).

### Modal

The **modal** does not use `useLoadingState`. It uses a simple delay:

- `showSpinner` becomes true 300ms after `modalImageLoading` becomes true, and is cleared when loading ends.
- The confirmed image stays visible until the new image is ready or the spinner appears, so there is no black gap.

### Why minDisplayTime: 1000ms?

From `LOADING_STATES.md`:

> "Loader shown for minimum 1 second (prevents flicker)"

**Important distinction:**

- **Page skeleton:** User waits for load → minimum 1s prevents flicker ✅
- **Image switching:** Image IN CACHE → showing loader for 1s = artificial delay ❌

**Solution:** For preview, if image is in cache, `mainImageLoading` is immediately `false`, so loader never shows. If loading, loader shows for minimum 1 second.

---

## Image Optimization

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

---

## Implementation Details

### Image Loading Flow

1. **User clicks thumbnail:**
   - `setCurrentImageIndex(index)` is called
   - `useEffect` triggers with new `currentImageIndex`
   - Check `mainImageLoadedRef` - already loaded?
   - Create `new window.Image()` with same URL
   - If `testImg.complete` → image in cache → `setMainImageLoading(false)` → **instant display**
   - If not → `setMainImageLoading(true)` → show loader → wait for `onload`

2. **Loader with flicker protection:**
   - If loading < 200ms → loader not shown (via `useLoadingState`)
   - If loading > 200ms → loader shown for minimum 1 second (readable indicator)

3. **Preloading:**
   - Simple `new window.Image()` for next photo
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

**Preview:** `useListingImages` exposes `handleImageError(index)`; the parent passes `onImageError` so that failed indices are added to the shared `imageErrors` Set. Placeholder is shown for failed images.

**Modal:** The modal receives `onImageError: (index: number) => void` and calls it from both the confirmed and pending `<Image>` `onError` handlers (with the correct index). The parent updates `imageErrors`; the modal does not call `onIndexChange` on error (that would retry the same broken index). Failed images show the placeholder and do not block others.

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

- **Preview:** Cache hit → 0ms switch; cache miss → real network time + up to 1s loader. Preloading via `useListingImages` (next image only).
- **Modal:** Two layers (confirmed + pending), max 2 decoded images. Spinner after 300ms if still loading. Preload next/prev/second-next with same URL as display. No duplicate preload or keydown logic in the page hook.
- **Memory:** Preview: one Set (indices). Modal: one Set (URLs). Minimal refs and state.

### Browser Compatibility

- Uses standard `window.Image()` constructor (all modern browsers)
- `testImg.complete` check (all modern browsers)
- `onload`/`onerror` handlers (all modern browsers)
- No experimental APIs or browser-specific features

---

## Testing Checklist

### Functional Testing

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
  - Doesn't flicker (either not shown, or visible for minimum 1s)
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

- [`LOADING_STATES.md`](./LOADING_STATES.md) - General loading states system
- [`TECHNICAL.md`](../architecture/TECHNICAL.md#11-performance-optimizations) - Performance optimizations section

---

**Last Updated:** 2026-02-18  
**Version:** 3.0 (Modal: two-layer rendering, URL cache, adaptive params, no duplicate handlers)
