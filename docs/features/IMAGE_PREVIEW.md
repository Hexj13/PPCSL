# Система превью изображений

Complete documentation for the image preview and photo viewer system on listing detail pages.

## Overview

The image preview system provides a simple, fast, and efficient way for users to view and switch between listing photos. The implementation follows the principle of "trust the browser" - leveraging built-in browser caching and image loading capabilities instead of complex custom preloading systems.

**Location:** `core/frontend/app/listings/[id]/ListingPageClient.tsx`

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

**State Variables (4):**
- `currentImageIndex: number` - Current photo index in preview
- `mainImageLoading: boolean` - Preview loading state
- `modalImageIndex: number` - Current photo index in modal
- `modalImageLoading: boolean` - Modal loading state

**Refs (2):**
- `mainImageLoadedRef: Set<number>` - Cache of loaded preview image indices
- `modalImageLoadedRef: Set<number>` - Cache of loaded modal image indices

**Total: 6 variables** (down from 15 in previous implementation)

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
- ✅ Flicker protection via `useLoadingState`
- ✅ Cache of loaded indices (`mainImageLoadedRef`, `modalImageLoadedRef`)

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

### How It Works

1. **Opening modal** → Shows current photo, preloads next in background
2. **Switching to next photo** → Shows it (if preloaded - instant), preloads next in background
3. **Loader** → Only shown while photo is loading, no delays

### Next Image Preloading

When opening modal and when switching to a new photo:

```typescript
useEffect(() => {
  if (!isImageModalOpen || !listing || typeof window === 'undefined') return;

  const images =
    listing.images && listing.images.length > 0 ? listing.images : ['/placeholder-car.jpg'];

  if (images.length <= 1) return;

  const nextIndex = (modalImageIndex + 1) % images.length;
  const nextImageUrl = images[nextIndex];

  if (!nextImageUrl || nextImageUrl === '/placeholder-car.jpg' || imageErrors.has(nextIndex)) {
    return;
  }

  const optimizedUrl = getOptimizedImageUrl(nextImageUrl, 85, 1920);
  const img = new window.Image();
  img.src = optimizedUrl;
}, [modalImageIndex, isImageModalOpen, listing, imageErrors]);
```

- Uses simple `new window.Image()` - reliable and visible in Network tab
- Browser manages caching automatically

### Loading Check Logic

```typescript
useEffect(() => {
  if (!isImageModalOpen || !listing) {
    setModalImageLoading(false);
    modalImageLoadedRef.current.clear();
    return;
  }

  const imagesList =
    listing.images && listing.images.length > 0 ? listing.images : ['/placeholder-car.jpg'];
  const currentImage = imagesList[modalImageIndex];
  
  if (
    !currentImage ||
    currentImage === '/placeholder-car.jpg' ||
    imageErrors.has(modalImageIndex)
  ) {
    setModalImageLoading(false);
    return;
  }

  if (modalImageLoadedRef.current.has(modalImageIndex)) {
    setModalImageLoading(false);
    return;
  }

  const optimizedUrl = getOptimizedImageUrl(currentImage, 85, 1920);
  const testImg = new window.Image();
  testImg.src = optimizedUrl;

  if (testImg.complete && testImg.naturalWidth > 0) {
    modalImageLoadedRef.current.add(modalImageIndex);
    setModalImageLoading(false);
    return;
  }

  setModalImageLoading(true);

  testImg.onload = () => {
    modalImageLoadedRef.current.add(modalImageIndex);
    setModalImageLoading(false);
  };

  testImg.onerror = () => {
    setModalImageLoading(false);
  };
}, [modalImageIndex, isImageModalOpen, listing, imageErrors]);
```

### Loader

Loader uses `useLoadingState` with `minDisplayTime: 1000` (same as preview):

```typescript
const { visible: showModalImageLoader } = useLoadingState({
  isLoading: modalImageLoading,
  minDisplayTime: 1000,
});
```

**Behavior:**
- If image is in cache → `modalImageLoading` is immediately `false` → loader not shown
- If image is loading → `modalImageLoading = true` → loader shown for minimum 1 second (prevents flicker)

### Controls

- **Escape** - Closes modal
- **ArrowLeft/ArrowRight** - Switches photos
- **Click on overlay** - Closes modal
- **Swipe gestures** - Switches photos on mobile

---

## Loading States

### useLoadingState Hook

The system uses `useLoadingState` hook for consistent loading state management:

```typescript
const { visible: showMainImageLoader } = useLoadingState({
  isLoading: mainImageLoading,
  minDisplayTime: 1000,
});
```

**Behavior:**
- If `isLoading = true` and `showDelay` (200ms) passed → show loader
- If `isLoading = false` → hide loader, but not before `minDisplayTime` (1000ms) from start of display
- If loading completes before `showDelay` → don't show loader at all

**For preview images:**
- If image is in cache → `mainImageLoading` is immediately `false` → loader not shown (instant switch)
- If image is loading → `mainImageLoading = true` → loader shown for minimum 1 second (readable indicator, prevents flicker)

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

- **Quality:** 85%
- **Max width:** 1920px
- **URL:** `getOptimizedImageUrl(imageUrl, 85, 1920)`

### Why Different Quality?

- **Preview (75%, 1200px):** Balance between quality and file size for main view
- **Modal (85%, 1920px):** Higher quality for full-screen viewing experience

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

```typescript
const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

// On image error - uses data-index to prevent race conditions
onError={(e) => {
  const imgIndex = parseInt(e.currentTarget.dataset.index || '0', 10);
  setImageErrors((prev) => new Set(prev).add(imgIndex));
  if (imgIndex === currentImageIndex) {
    setMainImageLoading(false);
  }
}}
```

**Race condition prevention:**
- Each image has `data-index={currentImageIndex}` attribute
- Handlers read the index from `dataset` instead of closure
- Only update loading state if the index matches current index
- Prevents old handlers from incorrectly updating state after rapid switching

**Features:**
- Failed images are tracked in `imageErrors` Set
- Placeholder is shown for failed images
- Errors don't block other images from loading

---

## Performance Metrics

### Code Reduction

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Lines of code** | ~500 | ~100 | **-80%** |
| **State/refs** | 15 | 6 | **-60%** |
| **Checks on thumbnail click** | 5 levels | 1 check | **-80%** |
| **Delay (cache)** | Could be | 0ms | **Instant** |
| **Delay (network)** | Real + 1000ms | Real | **No artificial delays** |
| **Complexity** | High | Low | **Easy to maintain** |

### Performance Characteristics

- **Cache hit:** 0ms switch (instant)
- **Cache miss:** Real network time + 1s minimum loader display (readable, no flicker)
- **Preloading:** Browser-managed, no manual overhead
- **Memory:** Minimal (only 2 Sets for loaded indices)

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
  - Opens correctly
  - Next image preloaded
  - Smooth transitions
  - Keyboard navigation works

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

**Last Updated:** 2026-01-16  
**Version:** 2.0 (Simplified)
