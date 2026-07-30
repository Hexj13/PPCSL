---
title: GA4 events
owner: platform
tags:
  - type/reference
  - domain/analytics
  - scope/core
  - status/active
---

# Google Analytics 4 — events and architecture

## Overview

This document describes the current state of Google Analytics 4 integration. GA4 loads via direct `gtag.js` using `NEXT_PUBLIC_GA_ID` (`GoogleAnalytics.tsx`). GTM container `GTM-K527X5WK` is also loaded on the page but must not duplicate GA4 page_view tags while `gtag('config')` is active. Consent is shared through `lib/cookie-consent.ts` (cookie-first, localStorage fallback): `analytics.ts` `checkConsent()` and `useCookieConsent` both use `readConsentPreferences()` / `isAnalyticsConsentGranted()`.

**Related documents:**

- **[SENTRY.md](../guides/SENTRY.md)** — setup and monitoring
- **[platform-guide.md](../guides/platform-guide.md#6-analytics-and-monitoring-configuration-ga-gtm-sentry)** — GA, GTM, Sentry configuration

## Implemented events

### Business events (E-commerce)

#### view_item

**Description:** View of listing detail page  
**Method:** `analytics.viewItem(listingId, listing)`  
**Used in:** `useListingData.ts` (listing page)  
**Parameters:**

- `currency` — from config
- `value` — listing price
- `items[]` — array with `item_id`, `item_name`, `price`, `item_brand`, `item_category: 'Vehicle'`

#### view_item_list

**Description:** View of listing list  
**Method:** `analytics.viewItemList(items)`  
**Used in:** `ListingGrid.tsx` — on search results load and for `initialData` on home  
**Parameters:**

- `item_list_id` — `'search_results'`
- `item_list_name` — `'Search Results'`
- `items[]` — array with `item_id`, `item_name`, `price`, `item_category: 'Vehicle'`

#### add_to_wishlist / remove_from_wishlist

**Description:** Add/remove from favorites  
**Methods:** `analytics.addToWishlist(listingId, listing)`, `analytics.removeFromWishlist(listingId)`  
**Used in:** `ListingCard.tsx`, `ListingPageClient.tsx` (listing page)

#### add_to_comparison / remove_from_comparison

**Description:** Add/remove from comparison  
**Methods:** `analytics.addToComparison(listingId, listing)`, `analytics.removeFromComparison(listingId)`  
**Used in:** `ListingPageClient.tsx` (listing page)

#### contact_seller

**Description:** Contact seller  
**Method:** `analytics.contactSeller(listingId, method, listing?)`  
**Used in:** `ListingPageSeller.tsx`  
**Contact methods:** `phone`, `viber`, `whatsapp`, `telegram`

#### create_listing

**Description:** Create listing  
**Method:** `analytics.createListing(listingId, listing)`  
**Used in:** `ListingForm.tsx` (on successful publish)

### Search and filters

#### search

**Description:** Search/filter execution  
**Method:** `analytics.search(searchTerm?, filters?)`  
**Used in:** `SearchFilters.tsx`  
**Parameters:** `search_term`, plus filter fields from `filters` (brand, model, city, etc.)

#### save_filter

**Description:** Save search filter  
**Method:** `analytics.saveFilter(filterName, filters?)`  
**Used in:** `SaveFilterModal.tsx`

#### select_content

**Description:** Track content selection (filters, categories, vehicle type)  
**Methods:**

- `analytics.selectContent(contentType, contentId, category?)` — selection from categories and filters
- `analytics.selectVehicleType(vehicleType)` — vehicle type switch

**Used in:**

- `SearchFilters.tsx` / `PopularFilters.tsx` — vehicle type switch, popular brands/models/body types, and filter selection from categories
- Tracks brand, model, city selection from "Popular"/"Other" categories
- Sends category info when selecting from a category

**Content types:** `brand`, `model`, `city`, `body_type`, `transmission`, `vehicle_type`, `popular_body_type`, and related popular filter ids

### Authentication

#### login

**Description:** Sign in  
**Method:** `analytics.login(method)`  
**Methods:** `email`, `phone`, `google`, `telegram`  
**Used in:** `useLoginPage.ts` (email/phone), `useTelegramAuth.ts`, `useGoogleAuth.ts`

#### sign_up

**Description:** Registration  
**Method:** `analytics.signUp(method)`  
**Methods:** `email`, `phone`, `google`, `telegram`  
**Used in:** `useVerifyPhonePage.ts`, `useTelegramAuth.ts` (`isNewUser`), `useGoogleAuth.ts` (`isNewUser`)

### Conversions

#### conversion_event_page_view

**Description:** View of home or catalog page (conversion)  
**Implementation:** component `ConversionEvent` → `ConversionEventTrigger`; event sent via `gtag('event', 'conversion_event_page_view')` when consent is granted  
**Used in:** `app/page.tsx` (home), `app/listings/page.tsx` (catalog)  
**Note:** no method in `analytics.ts`; `ConversionEventTrigger` calls `gtag` directly after `useCookieConsent` check

### Similar listings block

#### similar_block_impression

**Description:** Impression of similar listings block  
**Method:** `analytics.similarBlockImpression(listingId, similarCount)`  
**Used in:** `SimilarListings.tsx`  
**Parameters:**

- `listing_id` — ID of listing on whose page the block is shown
- `similar_count` — number of cards in block

#### similar_card_click

**Description:** Click on a card in similar block  
**Method:** `analytics.similarCardClick(listingId, clickedListingId, position)`  
**Used in:** `SimilarListings.tsx`

#### similar_favorite_toggle

**Description:** Toggle favorite in similar block  
**Method:** `analytics.similarFavoriteToggle(listingId, targetListingId, action)`  
**Used in:** `SimilarListings.tsx`  
**Parameters:** `action` — `'add'` | `'remove'`

### Automatic GA4 events

#### page_view

**Description:** Sent on route change via `gtag('config', gaId, { page_path: pathname })` in `GoogleAnalytics.tsx`; only when `consent === 'granted'`, in production, after deferred idle (~2.5s), and after `gtag.js` has loaded.

### Base GA4 events

#### scroll

**Description:** Page scroll depth tracking  
**Method:** `analytics.pageScroll(percent)`  
**Used in:**

- Hook `usePageScroll.ts` with thresholds 25%, 50%, 75%, 90%
- Component `PageScrollTracker.tsx` integrated in `app/layout.tsx`
- Uses `requestAnimationFrame` for optimization

**Parameters:**

- `percent_scrolled` — percent of page scrolled

#### form_start

**Description:** Form fill start  
**Method:** `analytics.formStart(formName)`  
**Used in:**

- `complete-profile/page.tsx` — on first focus on any field
- `ListingForm.tsx` — on first focus on year field
- `register/page.tsx` — on first focus on phone field
- `login/page.tsx` — on first focus on login field

**Parameters:**

- `form_name` — form name (`complete_profile`, `create_listing`, `edit_listing`, `register`, `login`)

#### form_submit

**Description:** Form submit  
**Method:** `analytics.formSubmit(formName, success, fields?)`  
**Used in:** All forms on submit (success/error)

**Parameters:**

- `form_name` — form name
- `success` — submit success (true/false)
- `filled_fields` — comma-separated list of filled fields
- `fields_count` — number of filled fields

**Forms:**

- `complete_profile` — for individuals: firstName, lastName, email; for business: companyWebsiteUrl, additionalPhone, email, emailNotifications
- `create_listing` / `edit_listing` — brand, model, year, price, city, description, images
- `register` — phone, password, type, messengers, companyName (for Business)
- `login` — login, password

#### complete_profile_skip

**Description:** Skip complete-profile form (custom event)  
**Method:** `analytics.completeProfileSkip(filledFields?)`  
**Used in:** `complete-profile/page.tsx` — when skipping the form

**Parameters:**

- `filled_fields` — list of filled fields before skip
- `fields_count` — number of filled fields
- `had_partial_data` — whether there was partial data

#### click

**Description:** Track clicks on external links  
**Method:** `analytics.click(url, linkText?)`  
**Used in:**

- Component `ExternalLinkTracker.tsx` integrated in `app/layout.tsx`
- Tracks clicks on links with different hostname

**Parameters:**

- `link_url` — link URL
- `link_text` — link text (optional)

#### click_infocar_check

**Description:** Click on "Order report" in History and report section on listing page (redirect to Infocar.md).  
**Method:** `analytics.infocarCheck(listingId, hasVin, brand?, model?, year?)`  
**Used in:** `ListingPageHistorySection.tsx` — on "Order report" link click

**Parameters:**

- `listing_id` — listing ID
- `has_vin` — whether listing has VIN (true/false)
- `brand` — brand name (optional)
- `model` — model name (optional)
- `year` — year (optional)

#### click_infocar_sample

**Description:** Click on "Sample report" in History and report section on listing page (navigate to Infocar demo).  
**Method:** `analytics.infocarSampleClick(listingId)`  
**Used in:** `ListingPageHistorySection.tsx` — on "Sample report" link click

**Parameters:**

- `listing_id` — listing ID

## Not implemented events

### file_download

**Description:** Track file downloads  
**Status:** Not implemented (waiting for download feature)

### share

**Description:** Track content sharing  
**Status:** Not implemented (waiting for share feature)

## System structure

### Components

#### GoogleAnalyticsConsent.tsx

**Location:** `core/frontend/components/analytics/GoogleAnalyticsConsent.tsx`  
**Role:** Initialize `dataLayer` and stub `gtag` in production; sets default Consent Mode `analytics_storage: 'denied'`, `ad_storage: 'denied'`  
**Load:** `strategy="afterInteractive"`; skipped on localhost / private IPs  
**Important:** must be included in `layout.tsx` **before** `GoogleAnalytics` so Consent Mode defaults apply before events

#### GoogleAnalytics.tsx

**Location:** `core/frontend/components/analytics/GoogleAnalytics.tsx`  
**Role:** Load `gtag.js` from `NEXT_PUBLIC_GA_ID`; send SPA `page_view` via `gtag('config')` on `pathname` change; update Consent Mode via `gtag('consent', 'update', { analytics_storage, ad_storage })` when the user choice is known  
**Conditions:** `NEXT_PUBLIC_GA_ID` set, production hostname, deferred idle (~2.5s), script loaded, `useCookieConsent` returns `granted` for config  
**Uses:** hook `useCookieConsent`, `invokeGtag`

#### GoogleTagManager.tsx

**Location:** `core/frontend/components/analytics/GoogleTagManager.tsx`  
**Role:** Load GTM container in production after deferred idle (~2.5s); `GoogleTagManagerNoscript` — iframe for noscript  
**Config:** `GTM_ID` (`GTM-K527X5WK`) hardcoded in component. Do not add a GA4 Configuration tag with automatic page_view in GTM while the app loads `gtag.js` via `NEXT_PUBLIC_GA_ID`, or page views will be double-counted.

#### ConversionEvent.tsx / ConversionEventTrigger.tsx

**Location:** `core/frontend/components/analytics/ConversionEvent.tsx`, `ConversionEventTrigger.tsx`  
**Role:** `ConversionEvent` — wrapper with `conversion_event_page_view`; `ConversionEventTrigger` — generic conversion trigger: calls `gtag('event', eventName)` once when `consent === 'granted'` and `gtag` ready  
**Uses:** `useCookieConsent`, `invokeGtag` from `analytics.ts`

#### analytics.ts

**Location:** `core/frontend/lib/analytics.ts`  
**Role:** Central utility for sending events  
**Methods:** All event tracking methods; `trackEvent` and `trackEventDeferred` route calls through `invokeGtag` after consent  
**`invokeGtag`:** Wraps `gtag` invocations so missing `gtag`, synchronous throws, or promise-like return values do not break the app (no-op when `gtag` is absent; errors swallowed; optional `then` chained with empty handlers).

#### cookie-consent.ts

**Location:** `core/frontend/lib/cookie-consent.ts`  
**Role:** Shared consent read/write helpers — cookie-first `readConsentPreferences()`, `isAnalyticsConsentGranted()`, parse/expiry, cookie helpers  
**Used by:** `analytics.ts` (`checkConsent`), `useCookieConsent`

#### PageScrollTracker.tsx

**Location:** `core/frontend/components/PageScrollTracker.tsx`  
**Role:** Page scroll tracking  
**Uses:** Hook `usePageScroll.ts`

#### ExternalLinkTracker.tsx

**Location:** `core/frontend/components/analytics/ExternalLinkTracker.tsx`  
**Role:** Track clicks on external links

### Hooks

#### useCookieConsent.ts

**Location:** `core/frontend/hooks/useCookieConsent.ts`  
**Role:** React wrapper over `lib/cookie-consent.ts`; reads via `readConsentPreferences()`; on `updateConsent` writes cookie + localStorage, uses `invokeGtag` for `gtag('consent', 'update', …)`, and pushes `consent_update` to `dataLayer`  
**Returns:** `consent`, `isLoading`, `hasConsent`, `grantConsent`, `denyConsent`

#### usePageScroll.ts

**Location:** `core/frontend/hooks/usePageScroll.ts`  
**Role:** Scroll tracking with thresholds 25%, 50%, 75%, 90%  
**Optimization:** Uses `requestAnimationFrame` for throttling

## Implementation details

### Consent check

- **Shared helper (`lib/cookie-consent.ts`):** `readConsentPreferences()` reads `cookie_consent` cookie first, then localStorage; expired/invalid values are treated as absent.
- **analytics.ts:** before each `trackEvent`, `checkConsent()` caches `isAnalyticsConsentGranted()` (same cookie-first source as the UI).
- **GoogleAnalyticsConsent:** in production sets stub `gtag` and `gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied' })` so Consent Mode blocks storage until user choice.
- **useCookieConsent:** on choice change writes consent cookie (primary) and localStorage mirror, then calls `invokeGtag(() => gtag('consent', 'update', { analytics_storage, ad_storage }))` and pushes `consent_update`; `CookieConsent` uses this hook for UI.
- **Order in layout.tsx:** `GoogleTagManager` → `GoogleTagManagerNoscript` → `GoogleAnalyticsConsent` → `GoogleAnalytics` (Consent stub before gtag.js / SPA page_view).

### Event structure

- Standard GA4 event names used where possible
- Custom parameters added for context
- In e-commerce: `currency` and `value` in `view_item`, `add_to_wishlist`, `contact_seller`, `create_listing`; `view_item_list` sends only `item_list_id`, `item_list_name`, `items[]`
- `items[]` structure used for product events

### Performance

- Page scroll uses `requestAnimationFrame` for optimization
- Events do not block main thread
- Throttling used for scroll events

### Form tracking

- `form_start` sent only once on first field focus (uses `useRef`)
- `form_submit` sent on success/failure with filled fields info
- Custom event `complete_profile_skip` for complete-profile form

## Search and filters specifics

### Category structure

#### Brands

- "Popular" category — popular brands
- "Other" category — remaining brands
- Each brand has `category` field with category name

#### Models

- Grouped by brand
- Each brand is category for its models
- Models have `category` field with brand name

#### Cities

- "Popular" category — popular cities
- "Other" category — remaining cities
- Each city has `category` field with category name

### Selection tracking

When selecting from a category, `select_content` is sent with `item_category`, allowing analysis of "Popular" vs "Other" usage.

### Vehicle types

Vehicle type switch (`car`, `truck`, `moto`) tracked via `select_content` with `content_type: 'vehicle_type'`.

## Complete-profile form specifics

### Description

Form `/complete-profile` is shown after phone verification via SMS and asks for extra data (can skip or fill later in profile).

**For individuals:**

- First name (firstName) — optional
- Last name (lastName) — optional
- Email (email) — optional

**For business:**

- Seller website URL (companyWebsiteUrl) — optional
- Additional contact phone (additionalPhone) — optional
- Email (email) — optional
- Email notifications checkbox (emailNotifications)

### Events

1. **form_start** — on first focus on any field
2. **form_submit** — on save (success/error) with filled fields info
3. **complete_profile_skip** — on form skip with partial fill info

### Metrics for analysis

- Form conversion: `form_submit` / `form_start`
- Skip rate: `complete_profile_skip` / `form_start`
- Field popularity: which fields are filled most
- Skip behavior: how many users fill partially before skip

## Notes

1. `page_view` is sent on route change via `gtag('config')` in `GoogleAnalytics.tsx` (with consent, production, deferred idle, and loaded `gtag.js`)
2. All custom events check user consent via shared cookie-first helpers before calling `gtag`
3. Event structure follows GA4 E-commerce standards
4. Error tracking (Exception events) is in a separate document (Sentry). Sentry provides more detailed error info than GA4 exception events
5. GA4, GTM, Sentry configuration for platforms — [platform-guide.md](../guides/platform-guide.md#6-analytics-and-monitoring-configuration-ga-gtm-sentry)
6. Require `NEXT_PUBLIC_GA_ID` on the frontend service; without it `GoogleAnalytics` returns null and no hits reach GA4
