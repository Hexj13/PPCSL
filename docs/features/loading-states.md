---
title: Loading states
owner: platform
tags:
  - type/guide
  - domain/engineering
  - scope/core
  - status/active
---

# Loading states — requirements

## Overview

This document describes requirements for unifying and improving the loading state system in the application. Goal: smooth user experience without flicker, layout jumps, or conflicts between different loading indicators.

## Context and architecture principles

### Next.js App Router and sources of loading state

The project has several loading levels that can overlap:

- **Route-level loading**: segment `loading.tsx` and Suspense fallbacks
- **Page-level loading**: local `loading`/`isInitialLoading`/`showSkeleton` in pages and components
- **Component-level loading**: loaders on buttons, modals, "load more".
- **Network-level errors**: `toast.error` from Axios interceptor (`core/frontend/lib/api/api-client.ts`)

Document requirement: align behavior to consistent rules per level and avoid conflicts between levels (e.g. when route-level fallback causes layout flicker and page-level immediately rebuilds content).

### Main UX goals

- **No flicker**: indicator either does not show (too fast) or is clearly visible and readable.
- **No layout jumps/CLS**: skeletons and real content share the same geometry.
- **No "extra millisecond footers":** during loading the layout must stay stable, with no intermediate "empty page + footer" state.
- **No toasts and loaders at the same time** where it hurts UX: notification appears after the loader is gone.

## Simplicity (required)

The feature should be simple, quick to implement, and safe to change. Therefore:

- Do not introduce a heavy "global manager" layer in the first phase.
- Provide a minimal set of primitives (`useLoadingState`, `LoadingButton`, `SkeletonContainer`) and migrate key call sites.
- Any "global" layer (e.g. notification queue) is **optional follow-up** only if MVP does not suffice.

## MVP scope

### MVP-1 (required)

- `useLoadingState` (200ms delay, 1000ms min display) + a way to run an action **after hide**.
- `SkeletonContainer` with 1000ms min display and stable geometry (min-height/grid).
- `LoadingButton` for main submit buttons (login/register/reset-password/listing form/profile).
- Where toasts are used: show notification **after** the loader is hidden.

### MVP-2 (if issues remain)

- Targeted `loading.tsx`/Suspense fallbacks only where "footer flicker" is confirmed.
- Further unification of spinners/fallbacks and broader coverage.

## Current implementation issues

### 1. Flicker and layout jumps

**Problem:**

- Skeletons and loaders appear and disappear too quickly
- Footer flashes briefly before page reflows
- Content "jumps" when data loads
- Layout shift (CLS) from sudden size changes

**Examples:**

- `ListingGrid.tsx` — skeletons show as soon as `loading = true`, hide as soon as `loading = false`
- `my-listings/page.tsx` — same issue
- `ListingPageClient.tsx` — skeleton has 500ms delay but no minimum display time

### 2. Button loaders

**Problem:**

- Button loaders appear and disappear too quickly
- User cannot read the loading state
- No consistent pattern for button loaders

**Examples:**

- `ListingForm.tsx` — button text changes but no visual indicator
- `login/page.tsx` — text change only, no spinner
- `register/page.tsx`, `reset-password/page.tsx` — same

### 3. Toast vs loader conflict

**Problem:**

- Toasts show while loaders are still visible
- User sees both loader and notification
- Notifications appear before loading finishes

**Examples:**

- `ListingForm.tsx:419` — `toast.success()` runs right after `setLoading(false)` but loader may still be visible
- `my-listings/page.tsx` — toasts (including from useListingActions) show right after API call while loading may still be active
- Any place where `toast.success/error` is called in `finally` or right after `setLoading(false)`

### 4. Page reflow and footer

**Problem:**

- After load, footer flashes briefly on navigation
- Page reflows after load completes
- Layout shift between states

**Examples:**

- `ListingForm.tsx:420` — `router.push()` runs right after `toast.success()` but loader may still be active
- `verify-phone/page.tsx` — multiple redirects after load
- `login/page.tsx` — redirect after successful login

## Requirements

### 1. Generic loading state hook

**1.1** Implement `useLoadingState` with configurable params:

- `isLoading: boolean` — current loading state
- `showDelay?: number` — delay before showing (default 200ms)
- `minDisplayTime?: number` — minimum display time (default 1000ms)
- `immediate?: boolean` — show immediately (default false)

**Behavior:**

- If `isLoading = true` and `showDelay` ms passed → show loader
- If `isLoading = false` → hide loader no earlier than `minDisplayTime` ms after it was shown
- If loading ends before `showDelay` → do not show loader at all

**1.2 (required):** Robustness — handle rapid toggles; clear timers on unmount; no setState after unmount.

**1.3 (required):** Run side-effects (toast/redirect) only **after** the indicator is actually hidden (after `minDisplayTime`).

Preferred: `useLoadingState` returns `{ visible, afterHidden }` with `afterHidden(fn)` called after hide; or `{ visible, hiddenPromise }` and `await hiddenPromise` before toast/redirect.

**1.4 Preset option bundles (implemented):**

Exported from `core/frontend/hooks/useLoadingState.ts` to avoid duplicating timing at call sites:

- `SKELETON_PAGE` — `immediate: true`, `showDelay: 0`, `minDisplayTime: 1000` (page-level skeletons: my listings, favorites, listing detail, search filters loader)
- `SKELETON_DEFERRED` — `immediate: false`, `showDelay: 200`, `minDisplayTime: 500` (deferred indicators)
- `SKELETON_SHOW_DELAY_MS` (200), `SKELETON_MIN_DISPLAY_MS` (1000), `SKELETON_MIN_DISPLAY_SHORT_MS` (500) — shared constants for custom spreads (e.g. admin tabs)

**File:** `core/frontend/hooks/useLoadingState.ts`

### 2. LoadingButton component

**Requirement 2.1:** Create a unified button component with loading state support

**Params:**

- `loading?: boolean` — loading state
- `loadingText?: string` — kept for backward compatibility, not used (only spinner shown)
- `showSpinner?: boolean` — whether to show spinner (default true)
- `spinnerSize?: 'sm' | 'md' | 'lg'` — spinner size (default 'sm')
- All standard button props

**Behavior:**

- Use `useLoadingState` with `showDelay: 200ms` and `minDisplayTime: 1000ms`
- During loading show only the spinner (text hidden)
- When not loading, show only `children` (regular button text)
- The button must be disabled while loading
- The spinner must stay visible for at least 1 second

**Requirement 2.2 (required):** no layout shift inside the button

- When loading starts, the button width/height must not "jump".
- The internal content must be structured so spinner and text do not change geometry (for example `inline-flex`, fixed height, stable gap).

**File:** `core/frontend/ui/LoadingButton.tsx`

### 3. SkeletonContainer component

**Requirement 3.1:** Create a wrapper for skeletons with minimum display time

**Params:**

- `isLoading: boolean` — loading state
- `children: ReactNode` — skeleton content to show
- `minDisplayTime?: number` — minimum display time (default 1000ms)

**Behavior:**

- Use `useLoadingState` with `immediate: true`, `showDelay: 0`, `minDisplayTime: 1000ms`
- Show skeletons as soon as `isLoading = true`
- Ensure minimum display time of 1 second
- Avoid flicker on fast load

**Requirement 3.2 (required):** Skeleton preserves page geometry

- Skeletons must match the structure and size of real content.
- For pages/blocks where the footer currently "flickers", the skeleton must occupy content-equivalent height (through correct grid layout and/or `min-height`).

**File:** `core/frontend/components/SkeletonContainer.tsx`

### 4. Spinner component unification

**Requirement 4.1:** Unify spinner components

**Actions:**

- Keep only `Spinner` from `ui/Spinner.tsx`
- Remove `LoadingSpinner` from `components/LoadingSpinner.tsx`
- Add `inline?: boolean` to `Spinner` for use inside buttons
- Update all imports

**File:** `core/frontend/ui/Spinner.tsx`

### 5. Coordinating toasts and loaders

**Requirement 5.1:** Toasts must show only after the loader is done

**Rules:**

- If a loader is active, delay the toast
- Show toast only after the loader is hidden (after `minDisplayTime`)
- For buttons: show toast after the button loader's `minDisplayTime`
- For pages: show toast after the page skeleton/loader's `minDisplayTime`

**Implementation:**

- Add hook `useDelayedToast` for delayed toasts, or use callback from `useLoadingState`

**File:** `core/frontend/hooks/useDelayedToast.ts` (optional)

**Requirement 5.2 (MVP, required):** Do not show interceptor toast where there is an explicit loader

The Axios interceptor in `core/frontend/lib/api/api-client.ts` can show `toast.error()` on its own, which can conflict with an active loader/skeleton.

MVP requirements:

- For requests started from UI with a loader/skeleton and custom feedback, **disable** interceptor `toast.error` via header `X-Skip-Error-Handling: true` (already used in code).
- Handle errors/success **locally** and show **after** the loader is hidden (via `afterHidden`/`hiddenPromise` from `useLoadingState`).
- This avoids toasts and loaders at the same time without a global queue.

**Optional after MVP:** If conflicts remain (e.g. global network errors during page load), consider a central notification layer/queue. Not part of MVP.

### 6. Preventing layout shift

**Requirement 6.1:** Minimize Cumulative Layout Shift (CLS)

**Rules:**

- Skeletons must match real content size
- Footer must not show before page content is loaded
- Use `min-height` for skeleton containers
- Avoid sudden size changes when switching from skeleton to content

**Implementation:**

- Ensure all skeletons match real content dimensions
- Add `min-height` where needed
- Use `SkeletonContainer` for all skeletons

**Requirement 6.2 (required):** Suspense/`loading.tsx` and stable layout

- For pages/segments where the "empty main + footer" scenario is confirmed, implement a route-level fallback (`loading.tsx`) or a single page-level skeleton that preserves geometry.
- This is **not required** for the MVP: first fix the issue through correct skeletons/`min-height` inside the pages themselves. Add `loading.tsx` only where the artifact still remains.

### 7. Navigation after loading

**Requirement 7.1:** Navigation must happen only after the loader is done

**Rules:**

- `router.push()` must run only after the loader's `minDisplayTime` finishes
- Toast notifications should appear before navigation when applicable
- Navigation must be smooth, without jumps

**Implementation:**

- Use a callback from `useLoadingState` for navigation
- Or use `useDelayedToast` with a navigation callback

**Requirement 7.2 (required):** define the "toast vs redirect" policy

Define and implement a single standard:

- **If redirecting right after action:** show notification on the target page (e.g. via query/sessionStorage) to avoid races and lost toasts.
- **If staying on the same page:** show notification after the relevant loader is hidden (after `minDisplayTime`).

## Where to apply

### Skeletons (SkeletonContainer)

1. **ListingGrid.tsx**
   - Replace `if (loading)` with `<SkeletonContainer isLoading={loading}>`
   - Line ~620

2. **my-listings/page.tsx**
   - Replace `if (loading || !hasLoadedRef.current)` with `<SkeletonContainer isLoading={loading || !hasLoadedRef.current}>`

3. **favorites/page.tsx**
   - Replace `if (isInitialLoading || loading)` with `<SkeletonContainer isLoading={isInitialLoading || loading}>`
   - Line ~208

4. **admin/page.tsx**
   - Replace `if (loading)` with `<SkeletonContainer isLoading={loading}>` in ListingsTab
   - Line ~361

5. **ListingPageClient.tsx**
   - Use `useLoadingState` for `showSkeleton`
   - Line ~84, ~1169
  - **Add loader for full-screen image in modal** ✅
    - Show loader when loading image in modal
    - Do not show loader if image is cached/preloaded
    - Use `useLoadingState` with `showDelay: 200ms`, `minDisplayTime: 1000ms`
    - Track load via `onLoad` for `img` and Next.js `Image`
    - On image change (`modalImageIndex`), show loader if image not loaded
  - **Add loader for main image preview when switching tabs** ✅
    - Show loader when loading new image on tab/thumbnail change
    - Do not show loader if image already loaded or cached
    - Use `useLoadingState` with `showDelay: 200ms`, `minDisplayTime: 1000ms`
    - Track load via `onLoad` for images

### Buttons (LoadingButton)

1. **ListingForm.tsx**
   - Replace the submit button with `<LoadingButton>`
   - Line ~1620

2. **login/page.tsx**
   - Replace the submit button with `<LoadingButton>`
   - Line ~349

3. **register/page.tsx**
   - Replace the submit button with `<LoadingButton>`
   - Line ~1140

4. **reset-password/page.tsx**
   - Replace all submit buttons with `<LoadingButton>`
   - Lines ~714, ~496, ~410

5. **profile/page.tsx**
   - Replace the save button with `<LoadingButton>`
   - Line ~584

6. **profile/verify-phone-change/page.tsx**
   - Replace the submit button with `<LoadingButton>`
   - Line ~309

7. **verify-phone/page.tsx**
   - Replace the submit button with `<LoadingButton>`
   - Line ~520

8. **SearchFilters.tsx**
   - ✅ Replace the search button with `<LoadingButton>` (done)
   - Button is in component `SearchFormActions.tsx`

### Spinners (Spinner with useLoadingState)

1. **profile/page.tsx**
   - Use `useLoadingState` for `loadingProfile`
   - Line ~218

2. **listings/[id]/edit/page.tsx**
   - Use `useLoadingState` for `loadingListing`
   - Line ~110

### Toast coordination

1. **ListingForm.tsx**
   - Defer `toast.success()` until after the button loader finishes
   - Lines ~419, ~426, ~439, ~445

2. **my-listings/page.tsx**
   - Defer all `toast.success/error` calls until after the loader finishes (calls on the page and in `useListingActions`)

3. **All places with toast notifications after API calls**
   - Check coordination with loaders

## Examples (what to do and how)

### Example A: Grid skeletons (listing feed)

**Goal:** remove skeleton flicker and "footer flashing" while keeping stable height.

**Before (typical):**

- There is a `loading` boolean
- When `loading=true`, skeletons render immediately
- As soon as data arrives, skeletons disappear instantly

**After:**

- Wrap the skeleton in `SkeletonContainer` with `minDisplayTime=1000ms`
- The skeleton matches the geometry of the real grid:
  - same grid (`grid-cols-*`, `gap-*`)
  - comparable card height
  - enough tiles so content height stays close to the real layout
- After data arrives:
  - the skeleton does not disappear instantly and stays visible for at least 1 second if it was shown
  - then it is smoothly replaced by content if needed with a light fade

**Verification:**

- With a fast API response the skeleton either does not appear at all (for page/action loaders with delay), or if it appears it remains visible for at least 1 second (for MVP skeletons we show immediately but keep a minimum display time).
- The footer does not jump up/down during loading.

### Example B: "My listings" page skeleton

**Goal:** avoid showing an "empty page" and prevent a jump on first entry.

**After:**

- Use `SkeletonContainer` for the "no data / initial loading" condition.
- The skeleton must include elements that create page height:
  - breadcrumbs / heading
  - several control skeleton cards
- Real content after loading must occupy a similar height (similar grid / spacing).

### Example C: Submit button (login/register/reset-password/listing form)

**Goal:** the button loader is readable and does not make the button jump.

**After:**

- Replace manual logic with `LoadingButton`:
  - `loading` is driven by the same state as now (business logic unchanged)
- Inside the button:
  - during loading only the spinner appears (small, inline), text is hidden
  - when not loading only the text (`children`) is shown
  - the button is disabled during loading
- The button does not change width/height when entering loading:
  - any "jump" is considered a bug
  - the spinner is centered absolutely, while text becomes invisible to preserve size

**Important timing rule:**

- Button loader display: 200ms delay (to avoid flicker), 1000ms minimum display time (so it can actually be seen).

### Example C1: Auth submit actions

**Goal:** keep the sign page stable during email/phone and Google authentication.

**After:**

- Do not show a full-page auth transition loader from the sign page.
- Email/phone login uses the `LoadingButton` spinner in the login submit button and keeps it visible for at least 1000ms via `auth-submit-loader`.
- Google auth uses its own loading state in the Google button area. It must not turn the email/phone submit button into a spinner.
- After the backend session is issued, write the synced user into the global auth store before navigation so the next client route has current auth state.
- Use localized router replacement after successful auth; keep hard redirects only for auth exit flows that must leave protected pages immediately.

### Example D: Toast must not appear at the same time as the button loader

**Goal:** the user first sees the action finish (loader goes away), then the toast.

**After:**

- Where `toast.success/error` runs after the API call, move the notification to "after hide":
  - call `setLoading(false)`
  - wait for the hide barrier (`afterHidden` / `hiddenPromise`)
  - show the toast

**Note:** if the action ends with a redirect to another page, see example E.

### Example E: Redirect after a successful action (for example listing creation)

**Goal:** avoid "toast + router.push + loader" races and prevent losing the notification.

**After (MVP standard):**

- If the action ends with an immediate redirect:
  - do not show the toast before the redirect
  - store the toast payload (type + text/translation key) in `sessionStorage`
  - call `router.push(...)`
  - on the target page, show the toast after the UI is ready and clear `sessionStorage`

**Why:** this is simpler and more reliable than trying to synchronize the old-page loader with a toast right before navigation.

### Example F: Axios interceptor errors and local loader

**Goal:** No double toasts and no toast during loader.

**After (MVP):** For requests from UI with explicit loader/skeleton and custom error handling: add `X-Skip-Error-Handling: true` to the request; in catch show toast locally (and after loader is hidden if applicable).

### Example G: "Load more" (loading the next page)

**Goal:** do not block the whole screen with a skeleton and do not create layout jumps.

**After:**

- Do not use `SkeletonContainer` for `loadingMore` when content already exists.
- Append skeletons render in a sibling grid below `VirtualizedListingGrid` (`ListingGrid.tsx`), not inside the results grid — use `mt-6` on that block so content-to-skeleton spacing matches in-grid `gap-6` (1.5rem) in both static and virtualized modes.
- The results grid is virtualized from the first client mount: SSR and the initial hydrated paint use a static CSS grid; `VirtualizedListingGrid` measures row heights from that markup (`listing-grid-measure.ts`) and swaps to `@tanstack/react-virtual` in a layout effect coordinated via `listing-grid-virtual-swap.ts` (after `ListingGrid` applies home scroll-restore layout when needed). Load-more appends always stay inside the same virtual geometry — no mid-session static→virtual threshold switch. Returning from a listing keeps a static grid through scroll restore, then skips the post-restore virtual swap for that session so restored `scrollY` stays pixel-stable.
- In the virtualized grid, inter-row spacing uses `pb-6` on every virtual row wrapper. Keeping the old last row's measured height stable prevents a visible jump when load-more appends another page and that row stops being last.
- Show a small inline spinner/indicator at the bottom of the list.
- Do not apply `minDisplayTime=1000ms` to `loadingMore` if it makes the UI feel slower.

### Example H: Modal with the user's listings

**Goal:** avoid spinner flicker and avoid conflicts with timeout toasts.

**After:**

- Use `useLoadingState` to display a spinner in the modal:
  - delay 200ms, min display 1000ms
- If a timeout triggers and a toast is shown:
  - first hide the spinner or ensure its display completes
  - then show the toast

## Technical details

### Default values

```typescript
const DEFAULT_SHOW_DELAY = 200; // ms
const DEFAULT_MIN_DISPLAY_TIME = 1000; // ms
```

### Configuration and single source of truth

To avoid scattering `200/1000` across the codebase:

- Move the defaults into one module (for example `core/frontend/lib/loading-config.ts`) and import them from there.
- All components (`LoadingButton`, `SkeletonContainer`, spinners) use these defaults, with override support.

### Best Practices (Google, Meta, GitHub)

- **Show delay:** 200-300ms (we use 200ms)
- **Minimum display time:** 1000ms
- **Skeletons:** show immediately (`immediate: true`)
- **Button loaders:** 200ms delay, 1000ms minimum

### Animations

- Smooth transitions: 200-300ms for fade-in/out
- Use CSS transitions for smoothness

## Implementation

### Phase 1: Create base components

- [x] Create the `useLoadingState` hook (`core/frontend/hooks/useLoadingState.ts`)
- [x] Update the `Spinner` component (add the `inline` prop)
- [x] Create the `LoadingButton` component (`core/frontend/ui/LoadingButton.tsx`)
- [x] Create the `SkeletonContainer` component (`core/frontend/components/SkeletonContainer.tsx`)
- [x] Add `LoadingButton` export to `ui/index.ts`

### Phase 2: Migrate skeletons

- [x] Migrate `ListingGrid.tsx` to `SkeletonContainer`
- [x] Migrate `my-listings/page.tsx` to `SkeletonContainer`
- [x] Migrate `favorites/page.tsx` to `SkeletonContainer`
- [x] Migrate `admin/page.tsx` (ListingsTab) to `SkeletonContainer`
- [x] Migrate `ListingPageClient.tsx` to `useLoadingState` for `showSkeleton`
- [x] Add a loader for full-screen photo viewing in the modal (`ListingPageClient.tsx`)
- [x] Add a loader for the main image preview when switching tabs (`ListingPageClient.tsx`)

### Phase 3: Migrate buttons

- [x] Migrate `login/page.tsx` to `LoadingButton`
- [x] Migrate `register/page.tsx` to `LoadingButton`
- [x] Migrate `reset-password/page.tsx` to `LoadingButton`
- [x] Migrate `profile/page.tsx` to `LoadingButton`
- [x] Migrate `profile/verify-phone-change/page.tsx` to `LoadingButton`
- [x] Migrate `verify-phone/page.tsx` to `LoadingButton`
- [x] Migrate `ListingForm.tsx` to `LoadingButton` with toast coordination
- [x] Migrate the search button in `SearchFilters.tsx` to `LoadingButton`

### Phase 4: Coordinate notifications

- [x] Main coordination is implemented through `useLoadingState` and `LoadingButton`

### Phase 5: Cleanup

- [x] Remove the `LoadingSpinner` component (`core/frontend/components/LoadingSpinner.tsx`)
- [x] Find and update all `LoadingSpinner` imports if any remain
- [x] Test all migrated components (unit tests passed)

## Acceptance criteria

1. ✅ No skeleton flicker (minimum 1 second display time)
2. ✅ No button-loader flicker (minimum 1 second display time)
3. ✅ Notifications are not shown at the same time as loaders
4. ✅ No footer jumps during loading
5. ✅ No layout shift when switching from skeleton to content
6. ✅ Smooth transitions between states
7. ✅ Consistent behavior across the application

## Testing (required for implementation)

### Unit/Component tests ✅ (P0/P1 only)

- `useLoadingState` ✅ (7 tests):
  - ✅ Does not show the indicator if loading ends before `showDelay` (P1)
  - ✅ Shows the indicator after `showDelay` (P0)
  - ✅ Keeps the indicator visible for at least `minDisplayTime` (P0)
  - ✅ Hides the indicator immediately if more than `minDisplayTime` has already passed (P1)
  - ✅ Shows the indicator immediately when `immediate=true` (P0)
  - ✅ Calls the callback after the indicator hides (P0)
  - ✅ Properly clears timers on unmount (P1)

- `LoadingButton` ✅ (5 tests):
  - ✅ Renders children when not loading (P0)
  - ✅ Shows only the spinner while loading, without text (P0)
  - ✅ Does not change size when loading toggles on/off (P1)
  - ✅ Blocks repeated clicks while loading (P0)
  - ✅ Applies the `disabled` prop (P1)

- `SkeletonContainer` ✅ (3 tests):
  - ✅ Shows children immediately when `isLoading=true` (P0)
  - ✅ Hides children after `minDisplayTime` (P0)
  - ✅ Does not show children when `isLoading=false` from the start (P1)

### Integration/E2E (minimum set)

> **Note:** Integration/E2E tests require manual testing or a configured E2E framework (Playwright/Cypress). Main scenarios to verify:

- ✅ A page with a skeleton (for example the grid) does not show "footer flashing" - **verified manually**
- ✅ A fast API response does not cause indicator flicker - **verified manually**
- ✅ A toast appears after the loader completes (button/page loader) in relevant scenarios - **verified manually**

## Change safety (to keep the feature safe)

- Changes must stay localized: add new primitives and migrate call sites one by one without breaking the rest.
- Avoid changing request business logic when possible; only change state presentation.
- Where interceptor `toast.error` is disabled (`X-Skip-Error-Handling: true`), always add local error handling.

## Additional improvements (optional)

1. **Optimistic updates** — show the result immediately, roll back on error
2. **Progress indicators** — for long-running operations (> 2 sec)
3. **Adaptiveness** — account for slow networks, increase minimum display time
4. **Analytics** — track loading time for optimization

## Notes

- All timing values must be configurable through parameters
- Account for performance and avoid unnecessary re-renders
- Testing should cover different loading scenarios (fast, slow, error)
- Documentation should be updated after implementation

## Non-goals (to keep scope under control)

- Do not slow down data loading for "visual polish": we do not delay data, we only control indicator visibility.
- Do not introduce new notification systems: use `react-hot-toast` as the single mechanism while centralizing the calls.
