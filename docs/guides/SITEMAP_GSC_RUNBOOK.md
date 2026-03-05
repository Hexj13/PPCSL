# Sitemap and GSC Runbook

Use this runbook to diagnose sitemap.xml issues in Google Search Console and verify production behaviour.

The frontend sitemap routes (`app/sitemap.xml/route.ts`, `app/sitemap.txt/route.ts`, `app/sitemaps/[name]/route.ts`) proxy to the backend with retries (3 attempts, 400 ms delay) and log upstream errors to the server console (`[sitemap] upstream error` or `[sitemap] upstream fetch failed`). On failure they return 502 with a short plain-text body instead of an empty response.

## 1. Collect production evidence (logs)

When GSC shows "Failed to process Sitemap" or "Couldn't fetch", check logs for the time window of the last crawl (e.g. date/time from GSC "Last crawl" or "Date of last processing").

### Frontend (Next.js on Render)

- In Render dashboard: your frontend service → **Logs**.
- Filter or search for:
  - Path: `/sitemap.xml`, `/sitemap.txt`, `/sitemaps/`
  - User-Agent: `Googlebot` (if your logging includes it).
- Look for 502 responses or uncaught errors around the sitemap route.

### Backend (NestJS on Render)

- In Render dashboard: your backend service → **Logs**.
- Filter for:
  - Path: `GET /api/sitemap.xml`, `GET /api/sitemap.txt`, `GET /api/sitemaps/:name`
  - Time window: e.g. 26 Feb 2026 11:15 (match GSC "Last crawl").
- Look for 5xx, timeouts, or Redis/DB errors.

### CDN (Cloudflare)

- Cloudflare Dashboard → **Analytics & Logs** (or Logpush if enabled).
- Filter by:
  - Host: `kupito.club`
  - URI: `sitemap.xml`, `sitemap.txt`, `sitemaps/*`
  - Status code: 502, 5xx, or 200 with small body (empty 502 from frontend).
- Check for rate limiting or WAF blocks for `Googlebot`.

### One-off curl from your machine (simulate Googlebot)

```bash
curl -sSIL -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" \
  "https://kupito.club/sitemap.xml"
curl -sSIL -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" \
  "https://kupito.club/sitemaps/pages.xml"
```

Expect: `HTTP/2 200`, `Content-Type: application/xml; charset=utf-8`.

## 2. Verify runtime environment

- **Render**: Frontend and Backend services → **Environment**.
- Confirm:
  - `NEXT_PUBLIC_API_URL` = backend base URL (no trailing slash), e.g. `https://your-backend.onrender.com`.
  - `NEXT_PUBLIC_SITE_URL` = canonical site URL, e.g. `https://kupito.club`.
- Backend must have `NEXT_PUBLIC_SITE_URL` set so sitemap `<loc>` URLs use the correct domain.

Optional: from a Render shell (or local with prod env), run:

```bash
node -e "console.log('API_URL set:', !!process.env.NEXT_PUBLIC_API_URL); console.log('SITE_URL set:', !!process.env.NEXT_PUBLIC_SITE_URL);"
```

## 3. Re-submit sitemap in Google Search Console

1. Open [Google Search Console](https://search.google.com/search-console) → property **kupito.club** (domain or URL-prefix).
2. Go to **Indexing** → **Sitemaps**.
3. Remove the failing sitemap entry for `https://kupito.club/sitemap.xml` if there is an option to remove or ignore.
4. In "Add a new sitemap", enter: `sitemap.xml` (or full URL `https://kupito.club/sitemap.xml`). Do **not** use a trailing slash (`sitemap.xml/`) → **Submit**.
5. Use **URL Inspection** for `https://kupito.club/sitemap.xml`: run "Test live URL" and then "Request indexing" if available.
6. Optionally request indexing for one child sitemap, e.g. `https://kupito.club/sitemaps/pages.xml`, to trigger a fresh crawl.

GSC may take hours or days to reprocess; status will update after the next crawl.

## 4. Verify sitemap availability (curl)

Run from any machine with internet access:

```bash
SITE="https://kupito.club"

echo "=== sitemap.xml ==="
curl -sSIL "$SITE/sitemap.xml" | head -25

echo "=== sitemap.txt (first 5 lines) ==="
curl -sS "$SITE/sitemap.txt" | head -5

echo "=== Child sitemaps from index ==="
curl -sS "$SITE/sitemap.xml" | sed -n 's:.*<loc>\(.*\)</loc>.*:\1:p' | while read -r u; do
  code=$(curl -sS -o /dev/null -w "%{http_code}" "$u")
  echo "$u -> $code"
done
```

Expected: all return `200`. XML responses must have `Content-Type: application/xml; charset=utf-8`.

## 5. Confirm recovery in GSC

After re-submitting and waiting for the next processing:

- **Sitemaps** page: `https://kupito.club/sitemap.xml` should show:
  - **Type**: Sitemap (or Sitemap index)
  - **Status**: Success
  - **Date of last processing**: recent date
  - **Discovered URLs**: &gt; 0
- **URL Inspection** for `https://kupito.club/sitemap.xml`: "Page fetch" / "Last crawl" should show success and no "Temporary error when processing".

If status remains "Couldn't fetch" or "Failed to process", re-run section 1 (logs) and 2 (env) for the new crawl time.
