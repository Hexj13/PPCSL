# Listings

## Optional vehicle and listing fields

Vehicle create/edit exposes optional fields in addition to core specs:

- **Listing `availability`:** `InStock` (default) or `OnOrder`.
- **Vehicle `country_of_origin`:** ISO 3166-1 alpha-2 code (nullable).
- **Vehicle `owners_count`:** integer 0–100 (nullable).
- **Vehicle `interior_color`:** color slug from the shared vehicle palette (nullable).
- **Vehicle `seats`:** integer 1–9 (cars/trucks); motorcycle form allows 1–4 (nullable).

**Form sections (vehicle):**

- **Condition and Registration** — order: condition, availability, registration, country of origin, owners count.
- **Interior and Exterior** (renamed from “Exterior”; exterior color label **Vehicle color**) — order: vehicle color, interior color, doors, seats.

Optional select fields on create/edit (`availability`, country of origin, colors, doors, seats; tire model) use a first menu item `common.clearSelection` (disabled when empty) instead of a fake “Not selected” option. Free-text `ListingFormTextInput` fields show a clear (×) control when non-empty.

## Listing video

Sellers can attach **one video** per vehicle listing. **New listing:** optional **staged** multipart upload without a listing id (`POST /api/listings/video/staged-upload-init`, `POST /api/listings/video/staged-upload-complete`, poll `POST /api/listings/video/staged-status`); when processing reaches a publishable state, `POST /api/listings` may include **`stagedVideoToken`** to attach that asset to the created row. **Existing listing:** multipart upload uses `POST /api/listings/:id/video/upload-init` and `POST /api/listings/:id/video/upload-complete`. The backend starts transcoding and stores public playback URLs on the listing when processing completes.

Client constraints (max size, max duration, allowed MIME types, multipart part size) are served by `GET /api/listings/video/constraints` and echoed on upload-init responses so the listing editor stays aligned with server limits. Presigned URLs for each multipart part expire after **3600 seconds** (1 hour).

If an SNS/EventBridge notification for a MediaConvert job is missed, a background job runs **every 5 minutes** and reconciles listings stuck in `processing` for more than 20 minutes by calling **MediaConvert GetJob** and either completing the listing video pipeline or marking it failed.

When a listing is **Closed** (seller action, account deletion, or scheduled auto-close), the backend deletes stored video objects from object storage and clears the listing `video` JSON. Photos are not removed. MediaConvert completion events for a **stale** job (listing already closed, `video` cleared, or `jobId` mismatch) do not restore `video` in the database; output objects from that job are deleted from object storage.

Optional branding overlay: when `LISTING_VIDEO_WATERMARK_S3_URI` is set (full `s3://...` or key relative to the uploads bucket), MediaConvert applies an image overlay on transcoded MP4/WebM outputs. Upload a PNG to S3 and point the env var at it.

Partner import tools (`cipauto-import`, `999md-import`) read a `videoUrl` from PDP when the source exposes a **direct file URL** (path ending with a known video extension). After create or update, they call `POST /api/upload/video/from-url` via the shared upload client so the backend downloads and processes the file. The download uses SSRF protections (HTTPS-only in production, DNS resolution must yield public IPs, manual redirect handling) and enforces a maximum streamed byte count even without `Content-Length`. Failures are logged as warnings and the import continues without video.

Production AWS / Render setup (operators): see [listing-video-production-setup-ru.md](../guides/listing-video-production-setup-ru.md) (Russian).

## URL slug (vehicles)

Vehicle listings may expose an SEO-friendly path segment (`slug`) in addition to the numeric id; sitemap and public URLs can prefer the slug form when present. Apply the corresponding listing migration before relying on slugs in production.
