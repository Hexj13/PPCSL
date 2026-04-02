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
│   ├── logo*.png         # Platform logos
│   ├── og-image.jpg      # Open Graph image
│   ├── partners/         # Footer partner logos
│   └── pwa192.png        # PWA icon
└── backend/watermark/
    └── logo.png          # Watermark for photos
```

## How it works

1. **Source:** Files in `assets/` are the source of truth (platform repo root).
2. **Copy:** Copied to `core/` during `npm run prepare:build`.
3. **Usage:** Core uses the copied resources.

```bash
assets/frontend/public/*     → core/frontend/public/
assets/backend/watermark/   → core/backend/assets/watermark/
```

## Required files

### Frontend (`frontend/public/`)

- `favicon-16.png`, `favicon-32.png`, `favicon-64.png`, `favicon-192.png`, `favicon-512.png`, `favicon.ico`
- `logo.png`, `logo-desktop.png`, `logo-mobile.png`
- `og-image.jpg` (1200x630px), `opengraph-image.png` (1200x630px)
- `partners/*` for any logos referenced from `config/site.ts` (`footerPartners`)
- `pwa192.png` (192x192px)

### Backend (`backend/watermark/`)

- `logo.png` — PNG with transparent background, ~200x200px, light color

## Detailed checklist

See [platform-checklist.md](../guides/platform-checklist.md) for full platform checklist and requirements.

**Tools:** [Real Favicon Generator](https://realfavicongenerator.net/) for favicon generation.

## Important

- Do not commit copied assets to core.
- Always edit in `assets/`, not in core.
- Assets in core are temporary, recreated on each build.
