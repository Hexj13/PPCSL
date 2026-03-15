---
title: Popular brands sync (config → DB)
owner: platform
tags:
  - type/reference
  - domain/brands-models
  - scope/core
  - status/active
---

# Popular brands sync (config → DB)

The script `core/backend/src/scripts/stage/sync-popular-brands-from-config.ts` reads platform config JSON files and ensures all listed brands and top models exist in the database.

## What it does

- Reads from `config/popular-brands.json`, `config/popular-brands-truck.json`, `config/popular-brands-moto.json` (platform root).
- For each brand: creates the brand if missing, or adds the segment's vehicle type to `vehicle_types` if needed (car / truck / moto).
- For each top model: creates the model under the brand if missing.
- Name matching is case-insensitive; spaces and hyphens are treated as equivalent (e.g. "R Series" = "R-Series").
- If any brands or models were added, clears the brands/models Redis cache automatically.

## How to run

From the platform repo (e.g. kupito.club), with DB and Redis available:

```bash
cd core/backend && COUNTRY=md npm run sync-popular-brands
```

Or with ts-node directly:

```bash
cd core/backend && COUNTRY=md npx ts-node -r tsconfig-paths/register src/scripts/stage/sync-popular-brands-from-config.ts
```

Allowed environments: `stage`, `development`, `test`. Platform: set via `COUNTRY` (e.g. `md` for Moldova).

## Config file format

Each JSON file has: `market`, `segment`, and `brands` — an array of `{ "brand": "...", "top_models": [ { "model": "...", "most_popular": true/false } ] }`. Segment maps to vehicle type: `used_cars` → car, `commercial_transport_used` → truck, `motorcycles_used` → moto.

## See also

- [known-issues.md](../architecture/known-issues.md) — Popular Brands config (JSON + fallback).
- [scripts.md](../../backend/docs/scripts.md) — List of stage scripts including this one.
