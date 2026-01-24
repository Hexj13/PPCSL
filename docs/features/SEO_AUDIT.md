# Аудит SEO и индексации (Google Search)

**Date:** 2025-12-17

This document audits technical SEO, crawlability, indexing, and Google Search visibility based on the current codebase.

---

## 1) Scope & Goals

### Goals
- Ensure **fast, reliable indexing** of the right pages.
- Prevent indexing of **private/thin/utility pages**.
- Avoid **duplicate content** via canonical, parameter handling, and redirects.
- Improve **SERP appearance** (titles, descriptions, structured data, OpenGraph).
- Reduce risk of **crawl traps** (infinite URL variations, unnecessary params).

### In scope
- Next.js App Router metadata/robots/sitemap
- Canonical strategy
- URL structure and parameter strategy
- Server rendering vs client-only rendering
- Structured data (JSON-LD)
- Internal linking
- Performance signals that impact SEO (CWV, heavy client JS)

### Out of scope (but recommended)
- Content strategy, backlinks, and PR (covered briefly as recommendations)

---

## 2) What’s Already Good

### 2.1 Robots + sitemaps exist
- `frontend/app/robots.ts` provides user-agent rules and references both `sitemap.txt` and `sitemap.xml`.
- `frontend/app/sitemap.ts` generates a **scalable multi-sitemap** (static + brand/model in one sitemap, and paginated listing sitemaps for volume growth).
- `frontend/app/sitemap.txt/route.ts` generates `sitemap.txt` with static pages + brand/model URLs and a bounded, paginated listing URL set.

**Why this is good:** Google discovers URLs faster when sitemaps are correct and stable.

### 2.2 Canonical exists for key static pages
Canonical is set for:
- Home (with `brand`/`model` query variants) in `frontend/app/page.tsx`.
- Listing detail pages in `frontend/app/listings/[id]/layout.tsx`.
- Static legal/help pages in their layouts (`terms`, `privacy`, `faq`, `cookie-settings`).

**Why this is good:** canonical reduces duplicates and consolidates signals.

### 2.3 Basic SEO metadata exists at the root
`frontend/app/layout.tsx` defines:
- `metadataBase`
- default title template
- default description
- OpenGraph + Twitter
- `robots` (index/follow)
- Google verification

**Why this is good:** prevents “empty metadata” on most routes.

### 2.4 URL normalization middleware
`frontend/middleware.ts` performs:
- Trailing slash removal (301)
- `www.` → apex redirect (301)
- HTTP → HTTPS redirect in production (301)

**Why this is good:** canonicalization via redirects reduces duplicates.

### 2.5 Brand/model “pretty” parameters (slugs)
Recent work introduces `brand` and `model` slugs in URLs and converts them server-side to IDs for API filtering.

**Why this is good:** user- and SEO-friendly URLs are easier to understand and share.

---

## 3) Critical Issues (Must Fix)

### P0 — `/listings` is in sitemap but no route exists (RESOLVED)
**Status:** Implemented.

**Impact:**
- Submitting a sitemap with 404 URLs wastes crawl budget and can reduce trust in sitemap quality.

**Action steps:**
1. Ensure `/listings` returns `200` and is included in sitemaps.
2. Validate with:
   - `curl -I https://<site>/listings` must return `200`.
   - Search Console → Sitemaps: errors should drop to 0.

---

### P0 — Many private/utility pages are indexable (RESOLVED)
**Status:** Implemented via route-level metadata (`robots: { index: false, follow: false }`) on private/utility layouts.

Routes likely should be **noindex**:
- Auth/account: `/login`, `/register`, `/reset-password`, `/verify-*`, `/profile/*`
- User/private: `/favorites`, `/my-listings`, `/listings/new`, `/listings/[id]/edit`
- Admin: `/admin`
- Utility: `/offline`, `/design-system`
- Compare: `/compare` (usually low-value + user-specific content)

**Impact:**
- Google may index thin/duplicated pages or user-specific states.
- Risk of indexing pages with inconsistent content or requiring auth.

**Action steps:**
1. Add route-level metadata to set:
   - `robots: { index: false, follow: false }` (or `follow: true` if you want link discovery but no indexing).
2. Optionally also disallow crawling in `robots.ts` for these paths (defense in depth).
3. Validate with:
   - `site:kupito.club login` etc should return 0 results.
   - URL Inspection → “Indexing allowed?” should be “No: ‘noindex’ detected”.

---

### P0 — Canonical is wrong for routes without their own canonical (RESOLVED)
**Status:** Implemented.

Examples that currently **lack canonical**:
- `/login`, `/register`, `/reset-password` layouts only return title/description/OG/Twitter.
- `/design-system` sets title/description only.
- `/admin`, `/favorites`, `/my-listings`, `/profile`, `/compare`, `/offline` do not set metadata.

**Impact:**
- Canonical to homepage on unrelated URLs can confuse indexing signals.
- If those pages accidentally index, canonical mismatch increases duplicate/soft-canonical noise.

**Action steps (recommended approach):**
1. Remove the global `alternates.canonical` from `frontend/app/layout.tsx`.
2. Ensure each indexable route sets canonical to itself.
3. For noindex routes, either omit canonical or set canonical to itself (both patterns are used; consistency matters).
4. Validate:
   - Inspect HTML `<link rel="canonical">` for key URLs.

---

### P0 — Listing detail page content is client-only (RESOLVED)
**Status:** Implemented via SSR wrapper page and `notFound()` handling.

**Impact:**
- Google can render JS, but indexing becomes slower and less reliable.
- HTML delivered to bots is thin until JS runs, increasing risk of:
  - delayed indexing
  - missing structured data extraction
  - poor performance signals

**Action steps:**
1. Convert `/listings/[id]` to a server-rendered page:
   - Fetch listing data in a Server Component.
   - Render visible content on the server.
   - Keep interactive parts (favorites, compare, galleries) as isolated Client Components.
2. Ensure `notFound()` is used for 404 listings (proper status).
3. Validate:
   - View source: page should include the listing title/price/content.
   - Search Console → URL Inspection: “Page is indexable” and renders content.

---

### P0 — Structured data is injected via `useEffect` (RESOLVED)
**Status:** Implemented by rendering JSON-LD scripts in SSR output for Organization, Search, and Listing detail.

**Impact:**
- Google may still process it, but SSR JSON-LD is more reliable.

**Action steps:**
1. Render JSON-LD in the HTML using:
   - a Server Component with `<script type="application/ld+json">{...}</script>` or Next’s `Script` where appropriate.
2. Ensure only one schema of each type exists and IDs are stable.
3. Validate:
   - Rich Results Test / Schema validator.
   - Search Console → Enhancements (if applicable).

---

## 4) High Priority Issues (Should Fix)

### P1 — Parameter strategy can create crawl traps
Current behavior supports many filters via query params, plus special `_f/_e` parameters.

**Risk:** if Google discovers many combinations (prices, cities, fuels, etc.) it can crawl an effectively infinite space.

**Recommended strategy:**
- **Index only**:
  - Homepage
  - Listings page
  - Brand pages (e.g. Toyota)
  - Brand+Model pages (e.g. Toyota Yaris)
  - Listing detail pages
- **Noindex** all other filter combinations (price, year ranges, sorting, etc.) unless you intentionally build landing pages.

**Action steps:**
1. Define an allowlist of “indexable params”: `brand`, `model` (and maybe `page`).
2. For any other params, output:
   - `robots: { index: false }`
   - canonical to the closest indexable URL (usually `/` or `/listings`).
3. Ensure internal links only point to indexable variants.

---

### P1 — Sitemap coverage and scalability (RESOLVED)
**Status:** Implemented with multi-sitemap + pagination for listing URLs.

**Risk:**
- If listings exceed 10k, many URLs will never enter the sitemap.

**Action steps:**
1. Implement pagination in sitemap generation (loop pages until empty, or use a dedicated backend sitemap endpoint).
2. Consider splitting into multiple sitemaps + sitemap index if volume grows (common for marketplaces).

---

### P1 — `sitemap.xml` vs `sitemap.txt` mismatch on API failures (RESOLVED)
**Status:** Implemented. Both sitemaps return consistent base + brand/model URLs on API failures, and listing URLs are best-effort.

**Impact:** inconsistent discovery behavior depending on which sitemap Google prefers.

**Action steps:**
1. Make both sitemaps include the same static URL set when API is unavailable.

---

### P1 — Design system route should not be indexable
`frontend/app/design-system/layout.tsx` sets metadata but doesn’t set noindex.

**Action steps:**
- Set `robots: { index: false, follow: false }` and canonical (or remove canonical).

---

### P1 — Pagination SEO for `/` (IMPLEMENTED)
**Status:** Implemented.

What’s implemented:
- Canonical strategy for `page`:
  - `page=1`: canonical without `page`
  - `page>1`: canonical includes `page` (only when query params are allowlisted)
- `rel="prev"` / `rel="next"` equivalents via `Metadata.alternates.prev/next` for indexable paginated pages.
- Strict allowlist: `brand`, `model`, `page` are indexable; any other params → `noindex` and canonical to the nearest clean URL.

---

### P1 — Alt text + OpenGraph on listing pages (IMPLEMENTED)
**Status:** Implemented.

What’s implemented:
- Listing cards: alt now includes meaningful vehicle attributes (brand/model/year/city) instead of just the listing title.
- Listing detail: SSR `generateMetadata` now sets title/description/canonical and OpenGraph/Twitter image.

---

## 5) Recommended Improvements (Medium Priority)

### P2 — Create SEO landing pages as real routes (not query-only)
Query URLs can rank, but **path-based** pages are easier to scale and control.

Examples:
- `/brands/toyota`
- `/brands/toyota/yaris`

**Benefits:**
- Cleaner URL hierarchy
- Easier canonical and internal linking
- Easier to build unique content blocks (FAQs, descriptions)

### P2 — Internal linking strategy
Add visible HTML links to:
- Top brands and top brand+model combinations
- Cities and categories (if relevant)

**Rule:** only link to pages you want indexed.

### P2 — Grid/listing structured data
For listing result pages, consider `ItemList` schema with the first N items.

### P2 — Pagination SEO
If you introduce real `/listings?page=2`:
- Keep canonical to the paginated URL (common), or canonical to page 1 (less recommended).
- Add internal links to next/prev pages.

---

## 6) Operational Checklist (Fast Indexing)

### 6.1 Google Search Console
1. Verify property (already supported via `NEXT_PUBLIC_GOOGLE_VERIFICATION`).
2. Submit:
   - `/sitemap.xml`
   - `/sitemap.txt`
3. Use URL Inspection on:
   - Home
   - `/listings` (after fixing)
   - Several listing detail pages
4. Monitor:
   - Coverage → Excluded (Soft 404, Duplicate, Crawled - currently not indexed)
   - Sitemaps → errors
   - CWV reports

### 6.2 Indexing hygiene
- Avoid indexing:
  - account pages
  - admin
  - internal tools
  - user-specific states

---

## 7) Suggested Roadmap (Prioritized)

### Week 1 (P0)
✅ Fix `/listings` route (avoid 404s in sitemaps).
✅ Add `noindex` to all private/utility routes.
✅ Fix canonical strategy (remove global canonical, add per-route canonicals).
✅ Convert listing detail page to SSR and render JSON-LD server-side.

### Week 2 (P1)
✅ Lock down param/indexing rules (allowlist `brand/model/page`).
✅ Improve sitemap scalability (multi-sitemap + pagination).
✅ Align `sitemap.xml` and `sitemap.txt` behavior.
✅ Add pagination canonical + prev/next.
✅ Add Alt/OG improvements for listing cards and listing detail.

### Week 3+ (P2)
- Add path-based brand/model landing pages with unique content blocks.
- Strengthen internal linking.
- Expand structured data on collection pages.

---

## 8) Validation & Tools

### Key validations
- **HTTP status:** sitemapped URLs must be `200`.
- **Canonical:** each indexable URL must canonical to itself.
- **Robots/noindex:** sensitive pages must not be indexable.
- **Rendered HTML:** important pages must contain meaningful content without JS.
- **Schema:** validate JSON-LD with Google’s tools.

---

## Appendix A — Route Indexing Policy (Recommended)

### A.1 Indexable routes (crawlable + indexable)
- `/` (homepage + brand/model landing via `?brand=...&model=...`)
- `/listings` (once created; recommended)
- `/listings/[id]` (listing detail)
- `/terms`, `/privacy`, `/faq`, `/cookie-settings`

### A.2 Noindex routes (must not appear in Google)
- `/admin`
- `/design-system`
- `/offline`
- `/compare`
- `/login`, `/register`, `/reset-password`, `/verify-email`, `/verify-phone`, `/profile/**`
- `/favorites`, `/my-listings`, `/listings/new`, `/listings/[id]/edit`

**Implementation note:** prefer route-level metadata with `robots: { index: false }` rather than relying only on `robots.txt` disallows.

---

## Appendix B — Canonical Strategy (Recommended)

### B.1 Remove global canonical
- Remove `alternates.canonical` from the root layout (`frontend/app/layout.tsx`) to avoid canonicalizing unrelated pages to the homepage.

### B.2 Set canonical per route
- Indexable routes: canonical to self.
- Parameterized landing pages:
  - If params are **indexable** (e.g. `brand`, `model`, optionally `page`): canonical includes those params.
  - If params are **not indexable**: set `noindex` + canonical to the nearest indexable URL.

---

## Appendix C — Query Parameter Allowlist (Crawl Trap Prevention)

### C.1 Recommended allowlist
Allow indexing only when query params are a subset of:
- `brand`, `model` (and optionally `page`)

### C.2 Everything else should be non-indexable
Examples (non-indexable unless you explicitly create SEO landing pages):
- price ranges (`price_gte`, `price_lte`)
- sort parameters
- city filters
- `_f`, `_e` storage flags

**Goal:** prevent crawling millions of low-value combinations.

---

## Appendix D — Structured Data (SSR Best Practice)

### D.1 Listing detail page
- Render `Product`/`Offer`/`BreadcrumbList` JSON-LD on the server.
- Keep only interactive UI in Client Components.

### D.2 Collection/listing pages
- Add `CollectionPage` + `ItemList` with a limited number of items.
- Ensure breadcrumb schema matches visible breadcrumbs.

---

## 9) Google Search Console Issues & Fixes

### 9.1 CDN robots.txt 403 Error

**Problem:** Google Search Console shows error 403 when trying to access `https://cdn.kupito.club/robots.txt`.

**Root Cause:** `cdn.kupito.club` is a CloudFront CDN that serves static files (images) from S3 bucket. The `robots.txt` file doesn't exist in the S3 bucket, so CloudFront returns 403 when Googlebot tries to access it.

**Solution 1: Remove CDN Domain from Google Search Console (Recommended)**

CDN domains (`cdn.kupito.club`) are for serving static assets, not for indexing. Google should only check `robots.txt` on the main domain (`kupito.club`).

**Steps:**
1. Go to Google Search Console
2. Remove `cdn.kupito.club` from the property list (if it was added)
3. Ensure only `kupito.club` (or `www.kupito.club`) is verified
4. Check `robots.txt` on the main domain: `https://kupito.club/robots.txt`

**Solution 2: Upload robots.txt to S3**

If you need to keep CDN domain in Search Console:

```bash
cd backend
npm run upload-robots-txt
```

Then invalidate CloudFront cache for `/robots.txt` in AWS Console.

**Note:** The main domain already has `robots.txt` generated by Next.js at `frontend/app/robots.ts`.

### 9.2 Redirect Issues

**Problem:** Google Search Console shows "Redirect issues" for:
- `http://kupito.club/`
- `http://www.kupito.club/`
- `https://www.kupito.club/`

**Root Cause:** Googlebot sees multiple versions of the same URL and cannot properly determine the canonical version due to:
1. Incorrect redirect sequence
2. Redirect chains (one URL redirects to another, which redirects to a third)
3. Conflicting canonicalization rules
4. Temporary redirects (302) instead of permanent (301)

**Solution:**

1. **Improve redirect logic in middleware:**
   - Redirects should execute in the correct order and combine into a single redirect
   - All versions should redirect to canonical: `https://kupito.club/` (without www, with HTTPS)

2. **Ensure all versions redirect to canonical:**
   - `http://kupito.club/` → `https://kupito.club/` (301)
   - `http://www.kupito.club/` → `https://kupito.club/` (301)
   - `https://www.kupito.club/` → `https://kupito.club/` (301)

3. **Use only permanent redirects (301):**
   - All redirects should be 301 (permanent), not 302 (temporary)

4. **Check hosting settings:**
   - Ensure no conflicting redirects at hosting level (Nginx, Apache, Cloudflare)

**Verification:**
```bash
curl -I http://kupito.club/
curl -I https://www.kupito.club/
curl -I http://www.kupito.club/
```

All should return 301 redirect to `https://kupito.club/`.

### 9.3 Common Google Search Console Issues

#### Technical Issues
1. **Server errors (4xx, 5xx)**
   - 403 (access forbidden) — incorrect access permissions
   - 404 (not found) — deleted or moved pages
   - 500 (internal server error) — code or database issues

2. **robots.txt problems**
   - File unavailable (403, 404)
   - Incorrect syntax
   - Blocking important pages

3. **sitemap.xml problems**
   - Sitemap contains non-existent URLs (404)
   - Sitemap unavailable
   - Incorrect XML format

#### Indexing Issues
1. **Duplicate content**
   - Multiple URLs with same content
   - Missing or incorrect canonical tags
   - URL parameters creating duplicates

2. **Redirect problems**
   - Redirect chains (more than 3-4 redirects)
   - Circular redirects
   - Temporary redirects (302) instead of permanent (301)

3. **noindex meta tags**
   - Pages with `noindex` accidentally included in sitemap
   - Conflicts between robots.txt and meta tags

#### Content Issues
1. **Thin content**
   - Pages with minimal content
   - Pages requiring JavaScript to display content

2. **Missing structured data**
   - No JSON-LD markup
   - Incorrect Schema.org markup

3. **Performance issues**
   - Slow page loading
   - Poor Core Web Vitals

### 9.4 Prevention Recommendations

#### Regular Monitoring
1. **Weekly Google Search Console check**
   - Check "Indexing" → "Pages" section
   - Track new errors
   - Check sitemap status

2. **Performance monitoring**
   - Core Web Vitals
   - Page load speed
   - Mobile version

#### Technical SEO Hygiene
1. **Proper redirect setup**
   - All domain versions redirect to canonical
   - Use only 301 redirects
   - Avoid redirect chains

2. **Proper canonical setup**
   - Each indexable page has canonical to itself
   - No global canonical to homepage

3. **Proper robots.txt and sitemap setup**
   - robots.txt is accessible and correct
   - sitemap contains only existing URLs
   - Regular sitemap updates

#### Pre-Deployment Testing
1. **Redirect testing:**
   ```bash
   curl -I http://kupito.club/
   curl -I https://www.kupito.club/
   curl -I http://www.kupito.club/
   ```
   All should redirect to `https://kupito.club/` with code 301.

2. **robots.txt testing:**
   ```bash
   curl https://kupito.club/robots.txt
   ```

3. **sitemap testing:**
   ```bash
   curl https://kupito.club/sitemap.xml
   ```

### 9.5 Quick Diagnostics Checklist

- [ ] Check robots.txt availability: `curl https://kupito.club/robots.txt`
- [ ] Check sitemap.xml availability: `curl https://kupito.club/sitemap.xml`
- [ ] Check redirects for all domain versions
- [ ] Verify CDN domain is not added to Search Console
- [ ] Check canonical tags on key pages
- [ ] Verify no redirect chains (more than 3)
- [ ] Check status codes for all URLs in sitemap (should be 200)

### 9.6 Diagnostic Tools

1. **Google Search Console**
   - URL Inspection Tool
   - Coverage Report
   - Sitemap Report

2. **External Tools**
   - Screaming Frog SEO Spider
   - Google Rich Results Test
   - PageSpeed Insights

