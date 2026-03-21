# Ruling out caching layers for intermittent API/toast issues

Use this checklist when users see periodic “connection / server unavailable” toasts but the root cause might be confused with stale or edge-cached data.

## 1. Next.js RSC / `fetch` (server-side listing feed)

- **Home listings** use [`getListings`](../../frontend/lib/api/server-api.ts) with `next: { revalidate: 30 }` in production and `cache: 'default'`.
- **Brands / metadata** use longer revalidation (e.g. 3600s) via React `cache()` + `fetch` in the same module.
- **Interpretation:** A 30s ISR window can change how often the server hits the API; it does **not** by itself produce axios toasts (those are client-side). If symptoms track **full page reload** and **new listings**, correlate with **SSR** `getListings` timing and backend load, not only browser HTTP cache.

## 2. Browser / CDN cache for JSON API

- Client listing calls go through axios (`api-client`), not `Cache-Control` on `GET /api/listings` for the grid path.
- **Listing detail** (`getOne`) may set `Cache-Control` in the API layer; verify in [`api-listings`](../../frontend/lib/api/api-listings.ts) if investigating detail fetches.
- **Test:** Hard reload with DevTools “Disable cache”, or a clean profile. If behavior is unchanged, browser cache is unlikely to be the sole explanation.

## 3. Redis (search / catalog)

- Search results and brand caches use Redis; misses increase Postgres load (see [`RedisListingCache`](../../backend/src/listings/infrastructure/cache/redis-listing-cache.ts)).
- **Correlate:** Redis error rate, latency, evictions vs. toast times. **Reproduction hint:** feed with **new** listings after a cache miss on search keys often exercises a heavier SQL path.

## 4. CDN / reverse proxy in front of API

- If the API is behind a CDN or proxy, verify it is not caching `GET /api/*` responses incorrectly or dropping long-running requests.
- Compare `Age` / `CF-Cache-Status` (if present) and response bodies for the same URL.

## 5. Distinguishing “stale UI” from “real failure”

| Signal | Suggests cache artifact | Suggests real API/DB issue |
|--------|-------------------------|----------------------------|
| Toast + empty or partial data after retry | Less likely | Likely |
| Data updates on manual refresh only | Possible stale RSC segment | Or SSR path error handling returning empty |
| Sentry / backend `503` or pool timeout | No | Yes |
| Matches fixed 30s cadence only | Consider `revalidate: 30` | Also check cron / health checks |

## 6. Related runbook

- Pool saturation, connection limits, and Top Queries: [postgres-query-baseline.md](./postgres-query-baseline.md).
