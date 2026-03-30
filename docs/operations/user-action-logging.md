---
title: User action logging (backend)
owner: platform
tags:
  - type/runbook
  - domain/backend
  - scope/core
  - status/active
---

# User action logging (backend)

Structured logs for significant user-driven mutations on the NestJS API. Intended for **operations** (incident response, support trails), not product analytics. For GA4 event naming, see [../analytics/ga4-events.md](../analytics/ga4-events.md).

## Scope

- **In scope:** HTTP API flows handled by Nest (authenticated user or guest only where an endpoint exists), including **`/api/comparison`** mutations (comparison rows are persisted for signed-in users).
- **Separate mechanism:** Admin catalog edits use `admin_audit_log` / `AdminAuditService`, not this convention.

## Transport

Use Nest **`Logger`** at **INFO**: one line per event, **JSON only** (single argument), so log aggregators can parse it.

```typescript
logger.log(JSON.stringify({ event: 'example_event', userId: '...', ... }));
```

Prefer a small helper (`logUserEvent` in `core/backend/src/common/utils/log-user-event.ts`) to keep call sites consistent.

Do **not** rely on these logs for billing or compliance archives; treat as best-effort operational telemetry.

### Sentry

Errors, metrics, and breadcrumbs stay in Sentry as today. Duplicating every user-action line as a Sentry breadcrumb is **not** required when the same payload is already logged to stdout.

## Action failure logs (4xx)

For **application** errors returned as HTTP 4xx with an `errors.*` i18n key (Nest `HttpException` messages), the global `HttpExceptionFilter` emits one structured line at **WARN** via `logUserActionFailure` (`core/backend/src/common/utils/log-user-event.ts`). Payloads use **`outcome: "failure"`** plus `errorKey` (raw key, e.g. `errors.invalidLoginCredentials`), `httpStatus`, `method`, `path`, optional `userId` from JWT, and route-derived ids (`listingId`, `savedFilterId`, `resourceUserId`, `targetUserId`) where applicable.

- **Paths:** `api/auth`, `api/users`, `api/listings` (except `GET /api/listings` search), `api/favorites`, `api/comparison`, `api/saved-filters`. Other API areas are omitted to limit noise.
- **Not included:** request body, query strings beyond `path`, email/phone/password/tokens. **`validation.*` keys** and class-validator-only 400 responses are not emitted here (no stable `errors.*` key).
- **Server errors:** 5xx and unhandled exceptions stay on `logger.error` / Sentry; they are not duplicated as these WARN lines.

Implementation helpers: `shouldLogUserActionFailure` and `buildUserActionFailureContext` in `core/backend/src/common/utils/user-action-failure-log.utils.ts`.

## Payload rules

### Required

| Field   | Type   | Description |
|--------|--------|-------------|
| `event`| string | `snake_case`. Prefix by domain when helpful: `listing_*`, `favorite_*`, … |

Session actor:

| Field    | Type | Description |
|----------|------|-------------|
| `userId` | string (UUID) | User who performed the action (JWT subject / authenticated actor). |

Admin-on-behalf-of-owner (same pattern as `listing_created` in `ListingsService`):

| Field         | Type | When |
|---------------|------|------|
| `ownerUserId` | string (UUID) | When the affected resource belongs to another user (e.g. admin edits someone else’s listing). |

### Optional (examples)

`listingId`, `savedFilterId`, `previousStatus`, `newStatus`, `category`, `closedListingsCount`, `changes`, etc.

### Privacy and redaction

Never log raw **email**, **phone**, **password**, **tokens**, full **VIN**, full **HTML description**, or URLs with **signed query parameters**.

**`listing_updated` / `changes`:**

- Each entry: `{ "field": string, "before": <json-safe>, "after": <json-safe> }`.
- Field names are stable logical keys (e.g. `price`, `vehicle.mileage_km`, `tire.width_mm`).
- **VIN:** only masked values, e.g. `****` + last 4 characters.
- **Description:** log `{ "length": number, "preview": string }` (plain text, truncated; no full HTML). `preview` length capped (implementation limit).
- **Images:** log count and pathnames without query strings (or equivalent stable representation); not full signed URLs.
- Omit or boolean-flag **cover blur hash**; log **count** of image blur hashes instead of full arrays when they change.

### When to emit

- Emit **after** successful persistence (DB save / commit path). Do not log if the request fails before that.
- **Idempotent favorites:** emit `favorite_added` only when a new row is created; if the favorite already exists and the API returns it without insert, **no** `favorite_added` line.
- **Listing PATCH:** emit `listing_updated` only when `changes` is non-empty. Do **not** emit when the body resulted in no effective change.
- **Status-only transitions:** use distinct events `listing_published`, `listing_paused`, `listing_closed` with `previousStatus` / `newStatus`. Do not also emit `listing_updated` for that same operation (avoid duplicate noise).

## Event catalog (initial)

| event | Module / reference | Payload highlights |
|-------|-------------------|-------------------|
| `listing_created` | `ListingsService.create` | `userId` (actor), `listingId`, `ownerUserId` |
| `listing_updated` | `UpdateListingUseCase` | `listingId`, `userId`, optional `ownerUserId`, `category`, `changes[]` |
| `listing_published` | `PublishListingUseCase` | `listingId`, `userId`, `previousStatus`, `newStatus` |
| `listing_paused` | `PauseListingUseCase` | same shape |
| `listing_closed` | `CloseListingUseCase` | same shape |
| `favorite_added` | `FavoritesService.add` | `listingId`, `userId` |
| `favorite_removed` | `FavoritesService.remove` | `listingId`, `userId` |
| `saved_filter_created` | `SavedFiltersService.create` | `savedFilterId`, `userId` |
| `saved_filter_updated` | `SavedFiltersService.update` | `savedFilterId`, `userId` |
| `saved_filter_removed` | `SavedFiltersService.remove` | `savedFilterId`, `userId` |
| `profile_updated` | `UpdateProfileUseCase` | `userId`, `changedFields[]` (no raw PII values) |
| `password_changed` | `ChangePasswordUseCase` | `userId` |
| `account_deleted` | `DeleteAccountUseCase` | `userId`, `closedListingsCount` |
| `user_logged_in` | `LoginUserUseCase` | `userId` |

Add new rows here when introducing new `event` values.

## Examples

**Create listing (existing convention):**

```json
{
  "event": "listing_created",
  "userId": "660e8400-e29b-41d4-a716-446655440001",
  "listingId": "550e8400-e29b-41d4-a716-446655440000",
  "ownerUserId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Update listing (redacted description + mask):**

```json
{
  "event": "listing_updated",
  "userId": "660e8400-e29b-41d4-a716-446655440001",
  "listingId": "550e8400-e29b-41d4-a716-446655440000",
  "category": "vehicle",
  "changes": [
    {
      "field": "price",
      "before": 12000,
      "after": 11500
    },
    {
      "field": "description",
      "before": { "length": 42, "preview": "Selling my car in good condition…" },
      "after": { "length": 18, "preview": "Price reduced today." }
    },
    {
      "field": "vin",
      "before": "****1234",
      "after": "****5678"
    }
  ]
}
```

**Favorite added:**

```json
{
  "event": "favorite_added",
  "userId": "660e8400-e29b-41d4-a716-446655440001",
  "listingId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Code placement

Emit success logs from **use cases** or **application services**, not from controllers. See [../architecture/backend-layers.md](../architecture/backend-layers.md). **Failure** lines for scoped 4xx `errors.*` responses are centralized in `HttpExceptionFilter` as described above.
