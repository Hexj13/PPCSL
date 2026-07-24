---
title: Search filter selection limits
owner: platform
tags:
  - type/guide
  - domain/search
  - scope/core
  - status/active
---

# Search Filter Selection Limits

The search form enforces hard selection limits for brands and models:

- Brands: max `40` (`MAX_SEARCH_BRAND_SELECTIONS` / `maxSearchBrandSelections`)
- Models: max `20` (`MAX_SEARCH_MODEL_SELECTIONS` / `maxSearchModelSelections`)

## UI behavior

- Basic tab brand and model dropdowns show a counter in the footer (`current/max`) on the same row as reset and OK actions.
- Counter color is `primary-900` while below the limit and switches to red when it reaches the limit.
- Trying to add more items than allowed does not change the selection and shows an error toast.
- Popular tab applies the same limits but does not render counters.

## URL and API overflow handling

- If a user opens a URL with too many brand/model selections, the app redirects to `/`, stores a pending error toast, and logs the event.
- If the API returns `400` due to brand/model limits, the listing grid applies the same redirect flow and logs the error.
- After redirect, the home page reads the pending toast key from session storage and shows the localized error message.

## Backend validation

- `SearchListingsDto` validates `brand_ids` / `tire_brand_ids` with `ArrayMaxSize(maxSearchBrandSelections)` and `model_ids` / `tire_model_ids` with `ArrayMaxSize(maxSearchModelSelections)`.
- Validation errors use localized keys:
  - `errors.searchBrandIdsLimit`
  - `errors.searchModelIdsLimit`
