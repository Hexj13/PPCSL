---
title: Infocar history and report section
owner: platform
tags:
  - type/guide
  - domain/listings
  - scope/core
  - status/active
---

# History and Report section (Infocar integration)

## Overview

The "History and Report" section is displayed on the listing detail page. It has two sub-sections: in-site history (previous listings for the same VIN) and external report CTAs (Infocar.md).

**Location**: Listing detail page, main column below "Condition and registration", above the seller block.

**Purpose**: Build trust and add value by surfacing vehicle history on the site and by redirecting users to partners for paid reports; the platform uses the referral parameter `from=kupito`. Report links depend on the user’s selected language: **RO** → `https://infocar.md`, **RU** → `https://ru.infocar.md`.

**Effect of VIN (presence or absence):** VIN only affects (1) whether the VIN field is shown in the listing characteristics block; (2) whether the "History on site" sub-section shows the table of previous listings (with VIN) or the "VIN not provided" message (without VIN); (3) whether the partner link is full (URL with encrypted VIN, param `vin`) or fallback (`from=kupito` only). The Report sub-section (Order report, Sample report) is always shown for active listings regardless of VIN.

## Section structure

- **Main title**: `listingDetail.historyAndReport` — e.g. (ru), (ro), (en) locale strings.

### Sub-section 1: Site history

- **Sub-heading**: `listingDetail.vehicleHistory` — e.g. (ru) locale string.
- **Hint** (when VIN is present): `listingDetail.historyHint` — tooltip next to the sub-heading explaining that previous listings for the same VIN are shown.
- **Content**:
  - No VIN: `InfoBlock` with `listingDetail.vinNotProvided` and `listingDetail.vinNotProvidedDescription`.
  - VIN present, loading: spinner.
  - VIN present, has data: table of previous listings (title, mileage, closed date, link).
  - VIN present, no previous listings: `InfoBlock` with `listingDetail.noPreviousListings` (e.g. no-previous-listings message per locale).

### Sub-section 2: Report (for Active listings)

- **Sub-heading**: `listingDetail.externalReports` — e.g. (locale) external report heading.
- **Hint**: `listingDetail.externalReportsHint` — tooltip next to the sub-heading: users are redirected to partners who compile the report from various sources; details and terms are on the partner’s site.
- **Two buttons** (same card style, with icons):
  1. **Order report** — `listingDetail.orderReport` (e.g. order-report label per locale). Icon: `CoinsIcon`. Implemented as a direct link `<a href="…/report-redirect?locale={locale}">` (no `window.open`) for iOS Safari compatibility. Link points to `GET /api/listings/:id/report-redirect?locale=ro|ru`, which returns 302 to Infocar URL for the given locale (or fallback). Fires `analytics.infocarCheck(...)` on click.
  2. **Sample report** — `listingDetail.sampleReport` (e.g. sample-report label per locale). Icon: `EyeIcon`. Direct link from `getInfocarDemoUrl(locale)`: RO → `https://infocar.md/demo?from=kupito`, RU → `https://ru.infocar.md/demo?from=kupito`. Fires `analytics.infocarSampleClick(listingId)` on click.

Visibility: the whole "Report" sub-section (both "Order report" and "Sample report" buttons) is rendered for all active listings (`shouldShowInfocarSection(listing)` = `listing.status === 'Active'`), regardless of whether VIN is provided. If the user clicks "Order report" without VIN, the API returns an error and the frontend opens the fallback Infocar URL.

## URLs and helpers

- **Order report**: Frontend uses direct link to `GET /api/listings/:id/report-redirect?locale={locale}` (302 to Infocar or fallback). Locale `ro` → infocar.md, `ru` → ru.infocar.md. No JavaScript open; compatible with iOS Safari. Backend `GET /api/listings/:id/report-url?locale=ro|ru` returns `{ url: string }` for other consumers.
- **Sample report URL**: `getInfocarDemoUrl(locale)` — RO → `https://infocar.md/demo?from=kupito`, RU → `https://ru.infocar.md/demo?from=kupito`.
- **Section visibility**: `shouldShowInfocarSection(listing)` returns `listing.status === 'Active'`. Both buttons are always shown in the section.
- **Helpers** in `listingPageInfocar.ts`: `getInfocarBaseUrl(locale)`, `getInfocarDemoUrl(locale)`, `getInfocarUrl(listing, locale)` (default locale `ro`) — build URLs with optional `&vin=` when VIN is present and not masked.

All links open in a new tab (`target="_blank"`, `rel="noopener noreferrer"`). Button styling reuses the existing CTA link style (border, rounded-lg, theme colours).

## VIN field hint (create/edit listing)

The VIN field on the listing form (create and edit) uses `listings.vinHint`. The text states that the field is optional, that VIN is used to build history on the site, and that it is also used for the external vehicle report via partners; useful for all parties to the transaction. See `BasicInfoSection.tsx`.

## Analytics

- **Events**: `click_infocar_check` (Order report), `click_infocar_sample` (Sample report).
- **Methods**: `analytics.infocarCheck(listingId, hasVin, brand?, model?, year?)`, `analytics.infocarSampleClick(listingId)`.
- **When**: On click on "Order report" or "Sample report" (before navigation).
- See [ga4-events.md](../analytics/ga4-events.md#click_infocar_check).

## Environment

**Backend** (required for signed “Order report” URL):

| Variable | Description |
|----------|-------------|
| `INFOCAR_SECRET_KEY` | Secret key from Infocar.md partner agreement. Used to encrypt VIN (AES-256-CBC, key = SHA256(secret), IV 16 bytes random, output base64url(IV \|\| ciphertext)). If unset, `GET /api/listings/:id/report-url` returns 404 and the frontend opens the fallback URL (Infocar base without VIN). |

Optional overrides: `INFOCAR_BASE_URL` (default `https://infocar.md` for RO), `INFOCAR_BASE_URL_RU` (default `https://ru.infocar.md` for RU), `INFOCAR_PARTNER_FROM` (default `kupito`). See also [technical.md](../architecture/technical.md#3-environment-variables) and [platform-checklist.md](../guides/platform-checklist.md).

## Implementation

- **Component**: `ListingPageHistorySection` in `core/frontend/app/listings/[id]/ListingPageHistorySection.tsx`. Used by `ListingPageClient.tsx`.
- **Helpers**: `getInfocarBaseUrl(locale)`, `getInfocarDemoUrl(locale)`, `getInfocarUrl(listing, locale)`, `shouldShowInfocarSection(listing)`, `INFOCAR_BASE_URL_RO`, `INFOCAR_BASE_URL_RU` in `core/frontend/app/listings/[id]/listingPageInfocar.ts`.
- **Tests**: `core/frontend/app/listings/[id]/ListingPageClient.infocar.test.ts` — `getInfocarUrl` URL building (RO/RU locale) and `shouldShowInfocarSection` visibility (Active with VIN / without VIN, Closed, Paused). Backend: `core/backend/src/listings/application/use-cases/get-report-url.use-case.spec.ts` — locale-based host (infocar.md vs ru.infocar.md), errors when listing not found / no VIN / no secret.
- **Backend**:
  - `GET /api/listings/:id/report-url?locale=ro|ru` — returns Infocar URL with encrypted VIN using `INFOCAR_SECRET_KEY` (AES-256-CBC, param `vin`). Optional query `locale`: `ru` → ru.infocar.md, otherwise RO (infocar.md). If `INFOCAR_SECRET_KEY` is not set, returns 404.
  - `GET /api/listings/:id/report-redirect?locale=ro|ru` — returns 302 redirect to Infocar URL for the given locale (or locale-specific fallback on error: RO → `https://infocar.md/?from=kupito`, RU → `https://ru.infocar.md/?from=kupito`). Used by the "Order report" button as direct link for iOS Safari compatibility.
  - `GET /api/listings/:id/history` — returns previous listings with the same VIN (for the site history table).
  - VIN on listing detail: `GET /api/listings/:id` returns masked VIN (4+9+4). Full VIN: `GET /api/listings/:id/vin` (JWT required, rate limit 5 per user per hour; query `action=reveal|copy` for logging). See listing characteristics section for Show/Hide/Copy VIN.

## Partner tracking

The query parameter `from=kupito` is used by Infocar.md to attribute the user and future report purchases to the kupito.club partner account.

## Partner verification (VIN encryption)

Reversible encryption (AES-256-CBC) so Infocar can recover the VIN. Format: `https://infocar.md/?from=kupito&vin=<encoded>` (RO) or `https://ru.infocar.md/?from=kupito&vin=<encoded>` (RU).

- **Input**: VIN string (trimmed; we store uppercase from the form). Secret key: `INFOCAR_SECRET_KEY` as UTF-8 string.
- **Key derivation**: AES key = SHA256(secretKey), 32 bytes.
- **Algorithm**: AES-256-CBC with random 16-byte IV; payload = IV || ciphertext; output = base64url(payload), no padding.
- **Output**: Query param `vin=<encoded>`, with `encoded` passed through `encodeURIComponent`.

Node.js snippet (same as in `GetReportUrlUseCase`):

```js
const crypto = require('crypto');

function base64urlEncode(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function encryptVin(vin, secretKey) {
  const vinNormalized = vin.trim();
  const key = crypto.createHash('sha256').update(secretKey).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(vinNormalized, 'utf8'), cipher.final()]);
  return base64urlEncode(Buffer.concat([iv, encrypted]));
}
```
