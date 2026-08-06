---
title: Image optimization setup guide
owner: platform
tags:
  - type/guide
  - domain/frontend
  - scope/core
  - status/active
---

# Image optimization setup guide

After implementing image upload optimization, complete these 3 steps:
DB migration, env variable on Render, backfill script.

---

## Step 1. Run DB migration

New field `cover_blur_hash` added to `listings` table.
Migration: `1792000000000-AddCoverBlurHash.ts`.

**Locally (dev):**

```bash
cd core/backend
npm run migration:run
```

**On production (Render):**

Connect to Render Shell and run:

```bash
cd /opt/render/project/src/core/backend
npm run migration:run
```

If `typeorm-ts-node-commonjs` is not available, use the compiled CLI:

```bash
node node_modules/typeorm/cli.js migration:run -d dist/data-source.cli.js
```

> **Important:** deploy the backend with the new code BEFORE setting the frontend
> env variable. The `/api/upload/image/:filename` endpoint must be live first.

---

## Step 2. Add env variable on Render (Frontend)

1. Open [Render Dashboard](https://dashboard.render.com)
2. Go to the **frontend** web service for this platform
3. **Environment** -> **Add Environment Variable**:

```
NEXT_PUBLIC_IMAGE_CDN_URL=https://api.your-domain.com
```

Use the hostname that serves optimized images for **this** platform (custom API domain or CDN). CSP `connect-src` and Next.js `images.remotePatterns` are built from `NEXT_PUBLIC_API_URL` and this CDN env at build time — redeploy after changes.

4. Click **Save Changes**
5. Frontend will rebuild automatically

After this, `getOptimizedImageUrl()` will generate URLs like
`https://api.your-domain.com/api/upload/image/xxx.webp?quality=65&width=640`.

### Why the API (or CDN) host and not a random CloudFront origin?

If the API is behind Cloudflare, CloudFront cannot connect to a Cloudflare-proxied
origin (502 errors). Using the backend's custom domain directly routes through
Cloudflare (which provides CDN, DDoS protection, SSL) while keeping the backend's
LRU cache and `Cache-Control: public, max-age=31536000` headers for browser caching.
When CloudFront is the real image origin for your platform, set `NEXT_PUBLIC_IMAGE_CDN_URL`
(and backend `AWS_CLOUDFRONT_URL`) to that distribution hostname instead.

### Verify

```bash
curl -sI "https://api.your-domain.com/api/upload/image/SOME_UUID.webp?quality=65&width=640"
```

Expected: `HTTP/2 200`, `content-type: image/webp`,
`cache-control: public, max-age=31536000, immutable`.

---

## Step 3. Backfill blurhash for existing listings (optional)

New listings get blurhash automatically on photo upload.
For existing listings, run the script once.

**Locally (with access to production DB and S3):**

```bash
cd core/backend
COUNTRY=md \
DB_HOST=... DB_PORT=5432 DB_USERNAME=... DB_PASSWORD=... DB_NAME=... \
AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_REGION=eu-north-1 AWS_S3_BUCKET_NAME=<your-uploads-bucket> \
npm run backfill:blurhash:cover
```

**On Render Shell:**

```bash
cd /opt/render/project/src/core/backend
npm run backfill:blurhash:cover
```

Use `npm run backfill:blurhash:all` when the `image_blur_hashes` column exists and you need placeholders for every photo on the listing page.

The tool processes 50 listings at a time with 1-second pause between batches.
Cover-only mode only touches rows with `cover_blur_hash IS NULL`. Full mode only touches rows with `image_blur_hashes IS NULL`. Safe to interrupt and re-run.

---

## What changed

| Before | After |
|---|---|
| Image processed twice (backend + Next.js) | Single processing (backend), Next.js skips |
| Every card request -> S3 + sharp | LRU cache in memory, repeated requests instant |
| Thumbnails 800px | 640px (~36% savings) |
| API returns 20 photos per card | Maximum 5 |
| Thumbnail generated on the fly | Pre-generated 400px at upload |
| All requests hit API server | Cloudflare CDN + browser cache (max-age=1yr) |
| Grey rectangle while loading | Blurred colorful blurhash preview |
