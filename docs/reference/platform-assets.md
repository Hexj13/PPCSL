---
title: Platform assets
owner: platform
tags:
  - type/reference
  - domain/platform
  - scope/core
  - status/active
---

# Platform assets

Platform graphics resources (logos, icons, watermark).

## Structure

```
assets/
├── frontend/public/
│   ├── favicon*.png      # All favicon sizes
│   ├── logo.png          # Square icon (PWA / schema)
│   ├── logo-desktop.svg  # Header logo
│   ├── logo-mobile.svg   # Header logo (same mark below xl)
│   ├── og-image.jpg      # Open Graph image
│   ├── partners/         # Footer partner logos
│   └── pwa192.png        # PWA icon
└── backend/watermark/
    └── logo.png          # Watermark for photos (~200x200)
```

Listing **video** watermark is **not** under `assets/backend/watermark/`. Upload a separate PNG to the media bucket and set `LISTING_VIDEO_WATERMARK_S3_URI` (MediaConvert overlay width is 140 px). The photo watermark is the wrong size for video.

## How it works

1. **Source:** Files in `assets/` are the source of truth (platform repo root).
2. **Copy:** Copied to `core/` during `npm run prepare:build` (`scripts/sync-platform-to-core.cjs`).
3. **Usage:** Core uses the copied resources.

```bash
assets/frontend/public/*                 → core/frontend/public/
assets/frontend/public/favicon.ico       → core/frontend/app/favicon.ico
assets/frontend/public/favicon-64.png    → core/frontend/app/icon.png
assets/backend/watermark/                → core/backend/assets/watermark/
```

### App Router icons (`core/frontend/app/`)

Next.js also serves `app/favicon.ico` and `app/icon.png` via file conventions. The sync script copies:

- `assets/frontend/public/favicon.ico` → `core/frontend/app/favicon.ico`
- `assets/frontend/public/favicon-64.png` → `core/frontend/app/icon.png`

Keep those source files in the platform overlay so both `public/` and `app/` stay on-brand after `prepare:build`.

## Required files

### Frontend (`frontend/public/`)

- `favicon-16.png`, `favicon-32.png`, `favicon-64.png`, `favicon-192.png`, `favicon-512.png`, `favicon.ico`
- `logo.png`, `logo-desktop.svg`, `logo-mobile.svg`. Header slot aspect comes from optional `headerLogo` in `config/site.ts` (SVG viewBox width×height). Omit it to keep the stock PPCSL pair: desktop 1905×508 from `xl`, mobile 839×329 below `xl`.
- `og-image.jpg` (1200x630px), `opengraph-image.png` (1200x630px)
- `partners/*` for any logos referenced from `config/site.ts` (`footerPartners`)
- `pwa192.png` (192x192px)

### Backend (`backend/watermark/`)

- `logo.png` — PNG with transparent background, ~200x200px, light color (photos / plate composite only)

### Video (S3, not the overlay folder)

- Separate PNG for `LISTING_VIDEO_WATERMARK_S3_URI` when listing video is enabled

## Detailed checklist

See [platform-checklist.md](../guides/platform-checklist.md) for full platform checklist and requirements.

**Tools:** [Real Favicon Generator](https://realfavicongenerator.net/) for favicon generation.

## Important

- Do not commit copied assets to core.
- Always edit in `assets/`, not in core.
- Assets in core are temporary, recreated on each build.
