---
title: Paid promotion
owner: platform
tags:
  - type/guide
  - domain/listings
  - scope/core
  - status/active
---

# Paid promotion (listings)

## Overview

Paid promotion lets users promote their listings so they appear higher in search results. Promoted listings are visually highlighted and have ranking priority.

**Status:** MVP implemented

## Important rules

1. **Only authenticated users can promote:**
   - All promotion endpoints are protected with `@UseGuards(JwtAuthGuard)`
   - Only users with a valid JWT can promote listings
   - Admin endpoints are additionally protected with `AdminGuard`

2. **Only active listings can be promoted:**
   - The "Promote" button is shown only for listings with status `Active`
   - Backend enforces: cannot promote listings with status `Paused` or `Closed`

3. **Promotion is preserved when pausing:**
   - If a promoted listing is set to `Paused`, `is_promoted` stays `true`
   - **Promotion time is not consumed while paused** — time counts only when the listing is `Active`
   - When returning from pause to `Active`, promotion resumes with remaining time
   - Promoted listings in `Paused` are not shown in search results (only active ones are)

4. **Promotion duration:**
   - Promotion can be 1, 7, 14, or 30 days
   - Admins can set unlimited (`promoted_until = null`)
   - Platform partners can also start unlimited promotion from `partner_balance`
   - After the end date, promotion is turned off automatically (`is_promoted = false`)
   - Search results show only listings with active promotion (not expired)

5. **Sorting:**
   - Promoted listings appear first, sorted by the selected sort rule
   - Then non-promoted listings, sorted by the same rule
   - Same sort logic applies within each group (promoted / non-promoted)

6. **Auto-closing listings:**
   - Promoted listings with active promo **are not auto-closed**, even if not updated for 90+ days
   - Auto-close applies to non-promoted listings older than 90 days
   - When promo expires (`promoted_until < now`), on the next auto-close run those listings are closed
   - When a listing is closed (auto or manual), promoted status is cleared

---

## Current implementation

### Database

#### Table `listings`

Added columns:

- `is_promoted` (boolean, default false) — promotion flag
- `promoted_until` (timestamp, nullable) — end of promotion (null = unlimited)
- `promoted_started_at` (timestamp, nullable) — start of promotion
- `promoted_paused_at` (timestamp, nullable) — when listing was paused (for freezing time)

#### Table `promotion_history`

Stores promotion history:

- `id` (uuid, primary key)
- `listing_id` (uuid, foreign key, ON DELETE CASCADE)
- `user_id` (uuid, foreign key, ON DELETE CASCADE)
- `listing_title` (varchar) — listing title at record creation
- `started_at` (timestamp) — promotion start
- `ended_at` (timestamp, nullable) — promotion end
- `days` (integer) — number of days promoted
- `created_at` (timestamp) — record creation time

Indexes on: `listing_id`, `user_id`, `started_at`, `ended_at`, `created_at`

### Backend API

#### User endpoints

**`PATCH /api/listings/:id/promote`**

- Toggle promotion for the user's own listing
- Requires auth (`JwtAuthGuard`)
- Validation: only active listings, durations 1/7/14/30 days, or unlimited when `source=partner_balance`
- Limit: `MAX_PROMOTIONS_PER_USER` active promotions per user

**`GET /api/listings/promotion-history`**

- Get current user's promotion history
- Pagination: default 50 per page; params: `page`, `limit`

**`GET /api/listings/promotion-history/check`**

- Check if current user has any promotion history
- Returns: `{ hasHistory: boolean }`

**`GET /api/listings/promotion-access`**

- Get access status for promotion features
- No auth required (`OptionalJwtAuthGuard`)
- Returns: `{ access: 'disabled' | 'admin' | 'all', enabled: boolean, isAdmin: boolean, canPromote: boolean }`
- Used by frontend to decide which UI to show
- Logic: `PROMOTION_ACCESS=all` → all can promote; `admin` → only admins; `disabled` → none. In development, admin always has access.
- Response also includes partner state used by the partner program UI.

**`POST /api/listings/cron/expire-promotions`**

- Cron endpoint to clear expired promotions (`is_promoted = false` when `promoted_until < NOW()`)
- Protected by `CRON_SECRET` (header `x-cron-secret`)
- Recommended schedule: hourly (e.g. `0 * * * *`), see DEPLOYMENT.md § 3.9

#### Admin endpoints

**`PATCH /api/admin/listings/:id/promote`**

- Manage promotion for any listing
- Requires auth and admin role (`JwtAuthGuard`, `AdminGuard`)
- Supports unlimited promotion (`days: null`)

**`GET /api/admin/promotions`**

- List all promotions with pagination and filters
- Params: `page`, `limit`, `listingId`, `userId`, `fromDate`
- Default 50 per page

**`GET /api/admin/listings`**

- List all listings with status and promo filters
- Params: `page`, `limit`, `listingId`, `userId`, `status`, `isPromoted`
- Server-side pagination and filtering

**`GET /api/admin/users`**

- List all users with search and filters
- Params: `page`, `limit`, `searchQuery`, `roleFilter`
- Server-side pagination and search

**`GET /api/admin/listings/status-counts`**

- Get listing counts by status and promo
- Used for filter badge numbers

### Frontend

#### Components

- **`PromotionModal`** — modal to choose promotion duration (1, 7, 14, 30 days + unlimited for admin)
- **`PromotionHistoryModal`** — promotion history modal with table and pagination
- **`ListingCard`** — visual highlight for promoted listings (border, label)
- **`ListingManagementCard`** — highlight and promotion controls
- **`PromotionsTab`** — admin tab with table of all promotions

#### Pages

- **`/my-listings`** — "Promote" button, promo filter, "Promotion history" button (shown only when `canPromote === true` via `GET /api/listings/promotion-access`). Promo styling (border, label) is visible to all users.
- **`/admin`** — tabs: Listings, Users, Promotions (server-side pagination)
- **`/favorites`** — sort: promoted first by `last_updated_at`, then others by `last_updated_at`
- **`/listings/[id]`** — "Promoted" tag

#### Visual styling

- Border: 2px, color `#6eeb9c87` (green with transparency)
- "Promoted" label: gold/yellow (`border-yellow-500 text-yellow-400`) with crown icon
- Label is first in the tag list
- On homepage: compact tags (emoji only) when there are 3 tags

---

## Environment variables

### Backend

```env
# Promotion feature access: disabled, admin, all (default: disabled)
PROMOTION_ACCESS=disabled

# Secret for cron job auth (min 32 chars)
CRON_SECRET=your-secret-key-here

# Max active promotions per user (default: 10)
MAX_PROMOTIONS_PER_USER=10
```

### Examples

1. **Disable for everyone (production):** `PROMOTION_ACCESS=disabled`
2. **Admins only (production):** `PROMOTION_ACCESS=admin`
3. **All users (production):** `PROMOTION_ACCESS=all`

**Note:** `PROMOTION_ACCESS` applies only in production. In development, admin always has access. Frontend uses `GET /api/listings/promotion-access` to show/hide UI. Promo styling (border, label) is visible to all regardless of access.

---

## Security

### Auth

- All endpoints use `@UseGuards(JwtAuthGuard)`
- Admin endpoints also use `AdminGuard`
- Listing ownership checked via `req.user.id`

### Input validation

- DTO validation with `class-validator`
- UUID format for all ID params
- Promotion duration: only 1, 7, 14, 30
- Listing status checked when enabling promotion

### Rate limiting

- Global: 600 req/min (production)
- Promotion endpoints: `togglePromotion` 10/min, `getPromotionHistory` 30/min, admin 20–30/min

### Cron protection

- `POST /api/listings/cron/expire-promotions` protected by `CRON_SECRET` (header `x-cron-secret`)

### Promotion limits

- Max active promotions per user: `MAX_PROMOTIONS_PER_USER` (default 10), checked on each enable

### Cache invalidation

- On promotion status change, listing search cache invalidated (`redisService.invalidateByPrefix(CACHE_PREFIXES.listingsSearch)`) and single-listing cache invalidated

---

## Notes

1. **Visual:** Green border (2px, `#6eeb9c87`) and "Promoted" label (first in tag list); on homepage, compact emoji-only tags when 3 tags.
2. **Ranking:** Promoted first; same user-selected sort within promoted and within non-promoted.
3. **Performance:** Indexes on `is_promoted`, `promoted_until`; server-side pagination in admin; `useDeferredValue` to reduce UI flicker.
4. **Cache:** Search and single-listing caches invalidated on promotion change.
5. **Listing status:** Only active listings can be promoted; on pause, promotion is kept and time is not consumed; on resume, remaining time applies; search shows only active listings.
6. **Auto-close:** Promoted with active promo are not auto-closed; when promo expires, next auto-close run closes them; on close (manual or auto), promoted status is cleared.
7. **History:** All promotions written to `promotion_history`; `ended_at` updated on listing close; history kept after listing deletion (via `listing_title`).
8. **Cron:** `expire-promotions` endpoint exists; configure a server cron to call it regularly.
9. **`PROMOTION_ACCESS`:** Frontend uses `GET /api/listings/promotion-access`; promote/history buttons and promo filter shown only when `canPromote === true`; styling visible to all. `disabled` → all hidden; `admin` → admins only; `all` → all authenticated. Backend returns 403 if access denied.

See [partner-program.md](./partner-program.md) for partner balance, reward rules, and partner-specific UI.

---

## Migrations

### `1778000000000-AddPromotedField.ts`

Adds promotion columns to `listings`:

- `is_promoted` (boolean, default false)
- `promoted_until` (timestamp, nullable)
- `promoted_started_at` (timestamp, nullable)
- `promoted_paused_at` (timestamp, nullable)
- Indexes on `is_promoted` and `promoted_until`

### `1778000000001-CreatePromotionHistory.ts`

Creates `promotion_history`:

- All fields for history
- Foreign keys with `ON DELETE CASCADE`
- Indexes for queries

---

## Entities

### `Listing`

Added fields:

- `is_promoted: boolean`
- `promoted_until: Date | null`
- `promoted_started_at: Date | null`
- `promoted_paused_at: Date | null`

### `PromotionHistory`

New entity for promotion history:

- `id: string`
- `listing_id: string`
- `user_id: string`
- `listing_title: string`
- `started_at: Date`
- `ended_at: Date | null`
- `days: number`
- `created_at: Date`

---

## Multi-repo and PPCSL

**For future work:**

- The codebase is moving to a multi-repo layout with PPCSL (Platform for Posting Car Sale Listings) as the core repo (git submodule).
- Implement in a way that is easy to move into PPCSL; avoid hard ties to project-specific details; use env and config for configuration.
- See [multi-repository.md](../architecture/multi-repository.md) for the PPCSL overview.
