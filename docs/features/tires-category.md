---
title: Tires category
owner: platform
tags:
  - type/guide
  - domain/listings
  - scope/core
  - status/active
---

# Tires category (`category=tire`)

Dev-ready specification for adding a dedicated tire listings vertical next to the existing vehicle flow.

**Status:** Active. Use this document as the current implementation reference for tire listings.

## Goals

- Add a first-class listing category for tires without breaking the current vehicle flow.
- Support exhaustive tire brands, curated tire models, and a safe fallback for missing models.
- Keep the tire UX simpler than the vehicle UX.
- Avoid overloading vehicle-only entities, filters, and components with tire-specific meaning.

## Core decisions

1. Add a new top-level listing category `tire`. Existing listings become `vehicle`.
2. Keep `vehicleType` unchanged for vehicle listings only. Do not use `vehicleType` as the category switch.
3. Create separate tire taxonomy tables and a separate tire details entity. Do not reuse `brands`, `vehicle_models`, or `vehicles` for tire data.
4. Support ambiguous models via a canonical `Other` model per brand (`is_other`); listing title omits the model name for that choice.
5. Tire search uses only two tabs in MVP: `Basic criteria` and `Popular`.
6. Tire create/edit uses a dedicated category-aware form branch, not a large set of tire conditionals inside the current vehicle form.
7. Listing category is immutable after creation in MVP. Edit flow may change tire fields but may not convert `vehicle` ↔ `tire`.

## Category model

- Add `listings.category` with enum `'vehicle' | 'tire'`, default `'vehicle'`.
- Backfill all existing listings to `category = 'vehicle'`.
- Keep `vehicle_id` for `category = 'vehicle'`.
- Add `tire_id` for `category = 'tire'`.
- `vehicleType` remains relevant only for vehicle listings. Tire compatibility uses a separate field `tire_vehicle_type`.

## Shared vs category-specific data

Keep these shared listing fields on `listings`:

- `price`
- `currency`
- `city`
- `negotiable`
- `description`
- `images`
- `cover_blur_hash`
- `image_blur_hashes`
- `urgent`
- `status`
- `user_id`
- timestamps and promotion fields

Vehicle-only listing fields currently stored on `listings` must not stay required for `category = 'tire'`:

- `vin`
- `condition`
- `registration_type`
- `horsepower`
- `power_kw`
- `equipment`
- `is_new`

Implementation rule:

- For `category = 'vehicle'`, preserve current behavior.
- For `category = 'tire'`, make the vehicle-only root fields nullable and validate them only for vehicle listings.
- For tire listings, `listings.is_new` stays `false`. The “new vehicle” marketing badge is vehicle-only; tire condition (`new` / `used` / `retreaded`) lives on the `tires` row and is not mapped to `is_new`.

## Tire taxonomy

### New tables

Create dedicated taxonomy tables:

- `tire_brands`
- `tire_models`

`tire_brands` fields:

- `id`
- `name`
- `name_normalized`
- `logoUrl` nullable
- `order`
- `is_archived`
- `created_at`

`tire_models` fields:

- `id`
- `brand_id`
- `name`
- `name_normalized`
- `order`
- `is_archived`
- `is_other` boolean
- `created_at`

### Taxonomy rules

- Tire brands are independent from vehicle brands.
- Use canonical brand names with correct spelling and normalized duplicate detection.
- `tire_brands.name_normalized` and `tire_models.name_normalized` used by the tire catalog seed use Unicode letter/digit normalization (not the vehicle-brand ASCII-only comparator), so Cyrillic and other scripts dedupe correctly.
- Store canonical DB value `Other` for the fallback model. Do not store localized DB values.
- Translate the `Other` label in UI through locale files while keeping the DB value canonical.
- Each brand must have exactly one `Other` model with `is_other = true`.
- `Other` must always be the last option in the model dropdown.

### “Other” model flow

- Brand is always selected from the curated brand list.
- Model is optional; when set, it is selected from the curated model list for that brand.
- If the seller chooses catalog `Other` (`is_other = true`), no free-text model field is collected; the generated title is brand + size (and optional load/speed), without a model segment.
- Search by explicit model matches only curated `tire_models`; `Other` behaves like any other taxonomy row for filters.

## Tire details entity

Create a dedicated `tires` table and entity referenced from `listings.tire_id`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `brand_id` | UUID | yes | References `tire_brands` |
| `model_id` | UUID | no | Nullable; references `tire_models`; may point to `Other` when present |
| `tire_vehicle_type` | enum | yes | `car`, `truck`, `moto` |
| `season` | enum | yes | Stored as `season` in DB; UI label “tread pattern”. Values: `summer`, `winter`, `all_season`, `mud_at`, `mud_mt`, `mud_rt`, `sport_semi_slick`, `race_slick` |
| `condition` | enum | yes | `new`, `used`, `retreaded` |
| `width_mm` | int | yes | Example `205` |
| `aspect_ratio` | int | yes | Example `55` |
| `diameter_inch` | decimal(4,1) | yes | Must support values like `22.5` |
| `quantity` | smallint | yes | Integer from `1` to `8` |
| `load_index` | varchar(10) | no | Keep as string to support compound values |
| `speed_index` | varchar(5) | no | Examples `H`, `V`, `W`, `ZR` |
| `dot_year` | int | conditional | Required for `used` and `retreaded` |
| `tread_depth_mm` | decimal(3,1) | conditional | Required for `used` and `retreaded` |
| `studded` | boolean | no | Meaningful only for winter tires |
| `run_flat` | boolean | no | Car only in MVP |
| `reinforced_xl` | boolean | no | Optional boolean flag |
| `spare_donut` | boolean | no | Compact spare / space-saver |
| `tubeless` | boolean | no | Tubeless construction |
| `acoustic` | boolean | no | Acoustic / foam noise reduction |

### Field semantics

- Listing price is always the total price for the full set, not per tire.
- `quantity` is the number of tires sold in the listing.
- `diameter_inch` must allow `.5` because truck tires commonly use `22.5`.
- `load_index` and `speed_index` are detail-page fields in MVP, not search filters.
- `dot_year` and `tread_depth_mm` are required for non-new tires because they materially affect buyer trust.

## Parameters intentionally excluded from MVP

Do not introduce a deep structured `tire_type` taxonomy in MVP.

Reason:

- Tire-type vocabularies diverge too much between car, truck, and moto.
- A shallow but useful MVP is better served by `tire_vehicle_type`, `season` (tread pattern enum), `condition`, `studded`, `run_flat`, `reinforced_xl`, `spare_donut`, `tubeless`, and `acoustic`.

Keep these as phase-2 candidates:

- `mud_terrain`
- `all_terrain`
- `commercial`
- `sport`
- `has_repairs`
- `repair_count`
- `price_per_tire`

## Create and edit form

### Form entry point

- `/listings/new` gets a top-level category selector:
  - `Vehicle`
  - `Tires`
- Existing vehicle flow remains the default and keeps the current `vehicleType` switcher.
- Tire flow branches into a dedicated tire form.

### Recommended form sections for tires

1. `Category`
   - listing category selector

2. `Basic tire info`
   - `tire_vehicle_type`
   - `brand`
   - `model` (optional)
   - `season`
   - `condition`

3. `Size and technical attributes`
   - `width_mm`
   - `aspect_ratio`
   - `diameter_inch`
   - `quantity`
   - `load_index`
   - `speed_index`
   - `dot_year`
   - `tread_depth_mm`

4. `Options` (checkbox grid)
   - `studded`, `run_flat`, `reinforced_xl`, `spare_donut`, `tubeless`, `acoustic` (with existing visibility rules for studded and run-flat)

5. `Additional info`
   - `urgent`
   - `description`

6. `Photos`
   - existing shared upload flow

7. `Price and location`
   - `price`
   - `currency`
   - `negotiable`
   - `city`

8. `Listing settings`
   - `status`
   - admin `assignedUserId`

### Fields hidden for tires

Do not show these current vehicle form fields for `category = 'tire'`:

- vehicle brand/model/year
- VIN
- fuel
- engine displacement
- horsepower
- power in kW
- transmission
- drive type
- body type
- mileage
- vehicle registration type
- vehicle condition enum (`Undamaged`, `Damaged`, `ForParts`)
- vehicle equipment
- separate `New` checkbox
- `available_in_credit`
- `down_payment_amount`

### Form validation rules

- `brand`, `tire_vehicle_type`, `season`, `condition`, `width_mm`, `aspect_ratio`, `diameter_inch`, `quantity`, `price`, `city`, and `images` are required; `model` is optional.
- `dot_year` and `tread_depth_mm` are required when `condition !== 'new'`.
- `studded = true` is valid only when `season = 'winter'`.
- `run_flat = true` is valid only when `tire_vehicle_type = 'car'`.
- Image validation keeps the current shared limits.

## Create and edit validation contract

### Create validation

- `category` is required.
- API must reject mixed payloads that contain both `vehicle` and `tire`.
- Tire payload must be present when `category = 'tire'`.
- `model_id` may be omitted (stored as `NULL`).
- `width_mm` must be an integer from `125` to `355` mm, multiple of `5`.
- `aspect_ratio` must be an integer from `5` to `95` (%), multiple of `5`.
- `diameter_inch` must be from `10` to `35` inches, at most one decimal place, in `0.5` steps (e.g. `16`, `22.5`).
- `quantity` is an integer from `1` to `8`.
- `dot_year` must be in the supported range `1990..currentYear+1` when present.
- `tread_depth_mm` must be a number with max 1 decimal place in the supported range `0..20` when present.
- `load_index` and `speed_index` are trimmed and uppercased when present.
- `condition = 'new'` may omit `dot_year` and `tread_depth_mm`, but provided values must still validate.

### Edit validation

- Category is immutable after create in MVP.
- Same category-specific validation rules apply as in create.
- Changing tire brand resets selected model.
- Clearing the model on edit sends `model_id: null` in the tire patch so the database row updates.
- Edit API must reject mixed category payloads in the same way as create.
- Existing listing lifecycle rules remain unchanged: tire category does not bypass current ownership, status, or admin edit rules.

## Search UX

### Category switch

- Search gets a new top-level category selector:
  - `Vehicles`
  - `Tires`
- When `category = 'vehicle'`, keep the current vehicle search unchanged.
- When `category = 'tire'`, render a dedicated tire search form.
- Reuse the existing tire placeholder slot already present in the search category selector UI instead of introducing a brand-new fourth control from scratch.
- Replace the current coming-soon presentation with a real interactive tire category entry:
  - remove the `comingSoonHint` behavior
  - remove the visual disabled treatment (`grayscale`, reduced opacity)
  - keep the same size, placement, and icon-based visual rhythm as the existing car/truck/moto entries
- If the currently referenced tire icon asset path is missing in the repo at implementation time, resolve that as part of the feature instead of redesigning the selector.

### Tabs for tires

Use only these tabs in MVP:

- `Basic criteria`
- `Popular`

Do not show:

- `Additional criteria`
- `Equipment`

### Basic criteria tab

Available filters:

- Brand
- Model
- Width
- Profile
- Diameter
- Tire vehicle type
- Season
- Condition
- Quantity
- Price from / to
- City
- Flags:
  - Studded
  - Run-flat
  - Reinforced XL

Recommended layout:

- Row 1: Brand + Model, Width + Profile + Diameter, Season + Condition
- Row 2: Tire vehicle type + Quantity, Price from / to, City
- Row 3: boolean chips for Studded / Run-flat / Reinforced XL

### Popular tab

Use the popular tab for fast shortcuts only:

- Popular tire brands
- Popular tire sizes
- Seasonal quick chips
- Quantity quick chips (`2`, `4`)

Do not add popular tire models in MVP.

Reason:

- For tires, buyers usually start from brand and size, not from model.
- Popular sizes are materially more useful than popular models.

### Search behavior

- Tire results must not mix with vehicle results.
- `category = 'tire'` is always explicit in search state and saved filters.
- Tire search does not reuse `vehicleType`.
- Existing vehicle URL params must be ignored when `category = 'tire'`.

### Search system requirements

- Tire search must use the same parsing path for draft-count preview and final submitted search.
- Available listings count preview must work for tire filters the same way it currently works for vehicle filters.
- `SearchStructuredData` must not interpret tire filters through vehicle-only popular brand/model dictionaries.
- Search reset must clear tire-specific params when leaving the tire category.
- Saved tire filters must restore the correct category before applying tire params.

## Recommended search params

Use these public filter keys for tire search:

- `category=tire`
- `tireVehicleType`
- `tire_brand_ids`
- `tire_model_ids`
- `tire_widths`
- `tire_profiles`
- `tire_diameters`
- `tire_seasons`
- `tire_conditions`
- `tire_quantities`
- `tire_studded`
- `tire_run_flat`
- `tire_reinforced_xl`
- shared `price_gte`
- shared `price_lte`
- shared `cities`

If tire brand/model names are exposed in public URLs later, use the same slug utilities and diacritics rules as the current vehicle search.

### Search validation and limits

- `category=tire` is mandatory for tire search state.
- Keep taxonomy array limits aligned with existing search conventions:
  - `tire_brand_ids`: max `20`
  - `tire_model_ids`: max `20`
  - `cities`: max `20`
- Numeric tire filters must use the same supported ranges as create/edit validation.
- Unknown brand/model IDs must be dropped during parse and sync.
- `tire_model_ids` must belong to the selected tire brands; invalid combinations are removed during URL parse and sync.
- Unknown boolean values must not be coerced; only explicit valid values are accepted.
- When `category=tire`, vehicle-only params must be ignored and removed from canonical saved-filter/search state.

## Title, cards, and details

### Listing title

Generate tire titles automatically.

Listing title format (automatic):

- Known model: `{Brand} {Model} {Width}/{Profile} R{Diameter}[ {LoadIndex}{SpeedIndex}]`
- Model omitted: `{Brand} {Width}/{Profile} R{Diameter}[ {LoadIndex}{SpeedIndex}]`
- Catalog `Other` model (`is_other`): `{Brand} {Width}/{Profile} R{Diameter}[ {LoadIndex}{SpeedIndex}]` (no model segment)

Marking: width (mm), profile (%), `R` (radial), rim diameter (inches); optional suffix is load index plus speed index with no space between them (e.g. `91V`). Omit the suffix when both load index and speed index are empty.

Examples:

- `Pirelli Contra 205/55 R16 91V`
- `Michelin Pilot Sport 255/40 R20` (no load/speed in title)
- The catalog label `Other` must never appear in the title; titles use brand + size only for that case

### Listing card

Show these tire-specific characteristics on cards:

- size (`205/55 R16`)
- season
- condition
- quantity
- optional badge for `studded`

Do not show vehicle characteristics on tire cards.

### Detail page

Show these tire-specific attributes on the listing detail page:

- brand
- model (catalog name when applicable; `Other` does not show a separate free-text label)
- tire vehicle type
- size
- season
- condition
- quantity
- load index
- speed index
- DOT year
- tread depth
- studded
- run-flat
- reinforced XL

### SEO and structured data

- Tire detail JSON-LD must use `Product`, not `Vehicle`.
- Breadcrumbs must expose a `Tires` category level.
- Title and meta description logic must branch by listing category.
- For `category=tire` search pages, use category-aware collection metadata; do not reuse vehicle-only brand/model naming assumptions.
- Until a stable tire SEO landing strategy exists, tire search structured data should stay generic and must not emit misleading vehicle brand/model breadcrumbs.

## Sitemap and indexing

- Active tire listing detail pages must be included in the existing monthly `listings-YYYY-MM.xml` sitemaps once the detail page is indexable.
- Do not add arbitrary tire filter URLs like `?category=tire&...` to sitemap in MVP.
- Do not introduce a tire taxonomy sitemap in MVP unless dedicated stable landing pages are added.
- If dedicated tire SEO landings are added later, use a separate sitemap child file such as `brands-tire.xml` or another explicit tire-specific name; do not mix tire taxonomy into `brands-car|truck|moto`.
- If a dedicated `/tires` landing page is added, include it in `pages.xml` and review its metadata, crawlability, and structured data.
- robots, metadata, and sitemap inclusion must always stay aligned: a URL listed in sitemap must be crawlable and indexable.

## Saved filters, compare, similar, analytics

### Saved filters

- Saved filters must support `category = 'tire'` and all tire-specific params.
- Backend filter validation whitelist must be extended accordingly.

### Compare

- Disable compare for tire listings in MVP.
- Do not allow mixing vehicle and tire listings in compare flows.

### Similar listings

- Hide the similar listings block for tire listings in MVP.
- If similarity is added later, use tire-specific ranking based on brand, size, season, and condition.

### Analytics

All listing/search analytics events must add explicit category context:

- `category`
- `listing_category`
- `tire_brand`
- `tire_model`
- `tire_size`
- `season`
- `condition`
- `quantity`

Do not send tire listings through vehicle-only analytics dimensions.

### Required GA4 changes

- `view_item`, `view_item_list`, `create_listing`, `add_to_wishlist`, `remove_from_wishlist`, and `contact_seller` must stop hardcoding `item_category: 'Vehicle'` and become category-aware.
- Tire item payloads should use `item_category: 'Tire'`.
- `search` events for tire flow must include at minimum `listing_category`, `tire_vehicle_type`, `season`, `condition`, `quantity`, and normalized size params.
- `select_content` tracking must support tire category switch and tire quick-filter interactions.
- `save_filter` must persist and report `category=tire`.
- While compare and similar are disabled for tires, compare/similar GA4 events must not fire for tire listings.
- Consent handling remains unchanged: tire analytics are sent only when analytics consent is granted.

## Logging and monitoring

### Application logging

- Backend create, update, and search flows for tires must log structured operational context:
  - `category`
  - operation (`create`, `update`, `search`, `sitemap`, `seed`)
  - `listingId` when available
  - `userId` when available
  - `tireVehicleType`
  - `season`
  - `condition`
  - `quantity`
- Validation failures should be logged at `warn` level with machine-readable reason codes, not full payload dumps.
- Unexpected backend errors should be logged at `error` level and captured by Sentry.
- Tire brand/model seed scripts must log counts for `added`, `updated`, `renamed`, `skipped`, and `duplicates`.

### Sentry and observability

- Tag tire exceptions with `listingCategory=tire`.
- Add operation tags such as `listingOperation=create|update|search|sitemap|seed`.
- Frontend runtime errors in tire create/edit/search/detail flows should include a surface tag such as `surface=tire_form|tire_search|tire_detail`.
- Validation errors caused by expected user input should not be promoted to noisy error-level Sentry issues unless they indicate a server bug.

### Privacy and safe logging

- Do not log raw free-text description, contact data, or full request bodies.

## Backend and API changes

### New DTOs

Add category-aware DTO support:

- `CreateTireDto`
- `UpdateTireDto`
- category-aware `CreateListingDto`
- category-aware `UpdateListingDto`
- tire-aware `SearchListingsDto`

Validation rule:

- `vehicle` is required only for `category = 'vehicle'`
- `tire` is required only for `category = 'tire'`
- mixed category payloads are invalid

### Search repository and cache

Tire search requires its own criteria and indexes.

Recommended tire indexes:

- `tires.brand_id`
- `tires.model_id`
- `tires.tire_vehicle_type`
- `tires.season`
- `tires.condition`
- `tires.quantity`
- composite `(tire_vehicle_type, width_mm, aspect_ratio, diameter_inch, season)`

Recommended cache prefixes:

- `tire-brands:*`
- `tire-brands:models:*`
- `listings:search:*`

When tire brands/models change, clear taxonomy cache and search cache.

## Scripts and operational flow

### Scripts to add

- `core/backend/src/scripts/stage/add-tire-brands-models.ts`
- `core/backend/src/scripts/production/add-tire-brands-models.ts`

The script must:

- seed or update tire brands
- seed or update tire models
- append canonical `Other` model for every brand
- preserve normalized names and deduplication rules
- keep stage and production data in sync
- emit explicit summary logs suitable for stage and production runs

### Cache invalidation

After updating tire brands/models in the database:

- clear tire taxonomy cache
- clear relevant search cache

If the shared brand-cache clear command is extended to cover tire taxonomy, document and use that single entry point.

## Frontend implementation rule

Do not turn the existing vehicle form and vehicle search into one large conditional component tree.

Recommended split:

- `ListingForm` becomes a wrapper that chooses:
  - `VehicleListingForm`
  - `TireListingForm`
- `SearchFilters` becomes a wrapper that chooses:
  - current vehicle search
  - `TireSearchFilters`

This keeps the current vehicle flow stable and limits regression risk.

## Files and areas expected to change

Backend:

- listings entities and DTOs
- listing create/update use cases
- listing search repository
- listing title generation
- saved filters validator
- sitemap and structured-data related flows if tire SEO URLs are introduced

Frontend:

- create/edit listing entry flow
- search category switch
- tire search form
- listing cards
- listing detail page
- analytics and breadcrumbs

Scripts:

- tire brands/models seeding in stage and production
- cache invalidation if new taxonomy cache is introduced

Docs and translations:

- root `locales/ro.json`
- root `locales/ru.json`
- root `locales/backend/en.json`
- root `locales/backend/ro.json`
- root `locales/backend/ru.json`
- run `npm run prepare:build` after locale changes

## Often forgotten but in scope

- price must clearly mean total set price
- `diameter_inch` must support `.5`
- `Other` model must not leak into final title when a custom model name exists
- saved filters must persist category
- compare must be disabled for tires
- similar listings must be hidden or reimplemented
- breadcrumbs and JSON-LD must stop assuming every listing is a vehicle
- analytics must carry category-specific fields
- logging must avoid raw free-text payload leakage
- sitemap decisions for tire URLs must be explicit, not implicit

## Not in MVP

- partner imports for tires
- tire compare
- tire-specific similar listings algorithm
- dedicated tire brand/model landing pages in sitemap
- deep structured tire-type taxonomy beyond the MVP flags
- price-per-tire mode

## Suggested implementation order

1. Add `category` and tire data model changes in backend.
2. Add tire taxonomy tables, scripts, and cache handling.
3. Make listing DTOs and validation category-aware.
4. Implement tire create/edit form and title generation.
5. Implement tire search with `Basic criteria` and `Popular`.
6. Branch listing cards, detail page, breadcrumbs, JSON-LD, saved filters, and analytics by category.
7. Add tests and update docs/translation files.

## Test checklist

- create tire listing with curated model
- create tire listing with `Other` model and custom model name
- reject tire listing when `Other` is selected but custom model name is empty
- reject tire create/edit when mixed `vehicle` and `tire` payload is submitted
- reject tire edit when category change is attempted
- reject `studded = true` for non-winter tires
- allow `diameter_inch = 22.5`
- keep vehicle create/edit flow unchanged
- tire search returns only tire listings
- tire search count preview matches submitted search results
- saved tire filter round-trips correctly
- tire cards and tire detail page render without vehicle fields
- tire analytics send category-aware events
- tire listing detail pages appear in monthly sitemap once active and indexable

**Last updated:** 2026-03-26
