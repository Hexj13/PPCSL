---
title: Search filters
owner: platform
tags:
  - type/guide
  - domain/search
  - scope/core
  - status/active
---

# Search Filters

Feature documentation for the search/filter form on the main listing search page.

**Status:** Implemented.

**Location:** Home page (`/`), form `#search-filters`. Main component: `core/frontend/components/search/SearchFilters.tsx`.

---

## Overview

The search form is split into:

1. **Vehicle type selector** — Car / Truck / Moto (above tabs).
2. **Four tabs:** Basic criteria, Additional criteria, Equipment, Popular.
3. **Actions:** Search, Reset, (Save filter), Log in.

Filter state is synced with the URL; submitting the form runs the search and updates results. See [search-title-url.md](./search-title-url.md) for brand/model slugs and [technical.md](../architecture/technical.md) for API and URL parameters.

---

## Vehicle Type Selector

- Renders above the tabs.
- Options: Car, Truck, Moto (vehicle type affects which body types, equipment, and popular brands/models are shown).
- Component: `VehicleTypeSelector.tsx`.
- Value is reflected in URL as `?vehicleType=car|truck|moto`.

---

## Tabs

| Tab                 | Key (i18n)                         | Content                                                                                                    |
| ------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Basic criteria      | `searchFilters.basicCriteria`      | Brand, model, year, price, fuel, body, transmission, drive, mileage, popular body types                    |
| Additional criteria | `searchFilters.additionalCriteria` | City, currency, registration, condition, engine, horsepower, color, doors (or color only for moto), labels |
| Equipment           | `searchFilters.equipment`          | Equipment checkboxes by category, match mode (full/partial)                                                |
| Popular             | `searchFilters.popularFilters`     | Quick links for popular brands and models                                                                  |

Only one tab panel is visible at a time (`activeTab === 'basic' | 'advanced' | 'equipment' | 'popular'`). Inactive panels stay mounted and use CSS `hidden` so filter values persist when switching tabs. Tab state is managed by `useSearchTabs`.

---

## Basic Criteria Tab

**Component:** `BasicFilters.tsx`.

**Layout:** Responsive grid. On `md` and up: 3 columns; on smaller screens: 2 or 1 column. Two main rows of filters, then a full-width “Popular body types” block.

### Row 1 (three columns)

| Column 1                                                      | Column 2                               | Column 3                                                         |
| ------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------- |
| **Brand** + **Model** (two MultiSelectDropdowns side by side) | **Year** (paired: From / To dropdowns) | **Fuel** + **Body type** (two MultiSelectDropdowns side by side) |

### Row 2 (three columns)

| Column 1                                                         | Column 2                                                     | Column 3                                        |
| ---------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------- |
| **Price** (paired: From / To text inputs, thousands with spaces) | **Transmission** + **Drive type** (two MultiSelectDropdowns) | **Mileage** (paired: From / To text inputs, km; displayed with thousands separators like price) |

### Row 3 (full width)

- **Popular body types** — `PopularBodyTypesFilter`: clickable body-type chips (e.g. Sedan, SUV). Selection syncs with the Body type multi-select from row 1.

**Paired fields (From/To):** Year, Price, Mileage use a single label and two controls side by side, styled as one block (shared border, `.paired-left` / `.paired-right` in `app/globals.css`). Placeholders use `searchFilters.from` and `searchFilters.to`.

**Translation keys (examples):** `searchFilters.brand`, `searchFilters.model`, `searchFilters.year`, `searchFilters.price`, `searchFilters.fuel`, `searchFilters.body`, `searchFilters.transmission`, `searchFilters.drive`, `searchFilters.mileage`, plus placeholders like `searchFilters.selectBrands`, `searchFilters.selectModels`, etc.

---

## Additional Criteria Tab

**Component:** `AdvancedFilters.tsx`.

**Layout:** Same responsive 3-column grid as Basic. Labels use `truncate` and `title` so long text (e.g. “long label text”) stays on one line on tablets and shows full text on hover.

### Row 1 (three columns)

| Column 1                                             | Column 2                                                                      | Column 3                            |
| ---------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------- |
| **City** + **Currency** (two dropdowns side by side) | **Has registration** + **Registration type** (Dropdown + MultiSelectDropdown) | **Condition** (MultiSelectDropdown) |

### Row 2 (three columns)

| Column 1                               | Column 2                               | Column 3 (car/truck vs moto)                                             |
| -------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------ |
| **Engine (l)** — paired From/To inputs | **Power (hp)** — paired From/To inputs | **Color** + **Number of doors** (car/truck) **or** **Color** only (moto) |

### Row 3 (three columns)

| Column 1 | Column 2 | Column 3 |
| -------- | -------- | -------- |
| **Seller type** — `MultiSelectDropdown` used as single-select (`Individual` / `Business`); empty selection means “any” | **Labels** — “Urgent” and “New” (or “New moto” for moto) checkboxes, badge styling | **Credit/installment** — “Available in credit” checkbox |

**Options:**

- Currency: from constants (e.g. EUR, MDL); no “All” option; placeholder e.g. “Select currency”.
- Has registration: yes/no; placeholder e.g. “Select”; no “All” option.
- Registration type, Condition, Color, Number of doors: from `useFilterOptions` (backend/options); multi-select or dropdown as in UI.

**URL / API:** `seller_type` is sent when set to `Individual` or `Business` (mono). Available in both vehicle advanced filters and tire search filters; applied by both `buildVehicleSearchQuery` and `buildTireSearchQuery` on the backend. See `build-fallback-listing-search-params.ts` and `SearchListingsDto.seller_type`.

**Translation keys (examples):** `searchFilters.city`, `searchFilters.currency`, `searchFilters.registration`, `searchFilters.registrationTypeLabel`, `searchFilters.condition`, `searchFilters.engine`, `searchFilters.horsepower`, `searchFilters.color`, `searchFilters.doors`, `searchFilters.labels`, `searchFilters.sellerTypeLabel`, `searchFilters.sellerTypePlaceholder`, `searchFilters.sellerTypeIndividual`, `searchFilters.sellerTypeBusiness`, `searchFilters.urgent`, `searchFilters.new`, `searchFilters.newMoto`, plus placeholders.

---

## Equipment Tab

**Component:** `EquipmentFilters.tsx`.

- Equipment keys depend on `vehicleType` (car/truck/moto); see `getEquipmentKeysByVehicleType` and `vehicle-equipment.ts`.
- Options are grouped by category (e.g. comfort, safety). Headlights (e.g. LED, xenon) and tires are mutually exclusive within their group when match mode is “full”.
- **Match mode:** “Full” (listing must have all selected) or “Partial” (at least one). Stored in `filters.equipment_match_mode`; sent as `equipmentMatch` in API.

---

## Popular Tab

**Component:** `PopularFilters.tsx`.

- **Popular brands block:** Grid of brand tiles (logo + name), multi-select. Shown **only for cars** (`vehicleType === 'car'`); hidden for truck and moto. Data from `lib/content/popular-brands.ts` (and `getPopularBrands(vehicleType)`). Selection syncs with Basic criteria; affects “You selected” and search when applied.
- **Popular models block:** Chips for “most popular” model per brand, then “Show more” reveals additional models. Multi-select. Mutual exclusion: selecting a brand tile clears that brand’s model chips; selecting a model chip clears that brand’s tile. Clicking an active brand tile that has models selected switches to brand-only (removes models, keeps brand). “You selected” lists brand-only items as brand name only, model items as “Brand Model”.
- **Apply behaviour:** Selections update filter state and “You selected” immediately; search runs only when the user clicks Search (same as other filters).
- **Mobile:** When collapsing the expanded model list (“Show less”), the page scrolls to the start of the “Popular models” block with `scroll-mt-20` so the fixed header is accounted for.
- **URL:** Slug-based (`?brand=...&model=...`), built via `createSlug`; see [search-title-url.md](./search-title-url.md). When multiple models share the same name (e.g. Dacia Logan, Renault Logan), the URL stores a single slug (e.g. `logan`); parsing resolves to all matching model IDs per selected brands.

---

## Selection Limits (Brands and Models)

- Maximum selected brands: `20`
- Maximum selected models: `20`
- Limits apply in Basic and Popular tabs.
- When user hits the limit, UI keeps current selection and shows a localized error toast.
- If URL contains more than allowed selections, the app resets the filter params and shows a localized error toast after redirect.
- Backend enforces the same limits in `SearchListingsDto` (`ArrayMaxSize(20)` for `brand_ids` and `model_ids`) and returns localized validation messages.

For full behavior and edge-case flow, see [search-filter-limits.md](../guides/search-filter-limits.md).

---

## Mobile layout

- Below `md`, vehicle filters use `MobileSearchFilters` (bottom sheets for field editing).
- System **Back** on Android/PWA closes the open bottom sheet first (shared overlay stack — see [overlay-back-navigation.md](./overlay-back-navigation.md)).
- The same four tab panels stay mounted with CSS `hidden` on inactive tabs (values persist when switching tabs).
- Mileage sheet inputs and summaries use thousands with spaces (same formatting helper as price).

---

## Styling and UX Details

### Paired inputs (From/To)

- Wrapper: `flex` with two children.
- Left control: `paired-left` (rounded left, no inner right border).
- Right control: `paired-right` (rounded right, overlapping left border, higher z-index on focus so the shared edge highlights correctly).
- Defined in `core/frontend/app/globals.css` (`.paired-left`, `.paired-right`, focus states).

### Label truncation

- Long labels (e.g. “Has registration”, “Registration type”) use `truncate` and `title={t('...')}` so they stay on one line on narrow viewports and show full text on hover. Applied across Basic and Advanced filter labels where needed.

### Responsive grid

- Grid: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4`. Inner groups (e.g. Brand+Model) use `grid-cols-2 gap-2` where two controls share one column.

---

## State and Hooks

- **Filter state:** `useSearchFilters` — holds all filter fields (brand_ids, model_ids, year_gte/lte, price_gte/lte, cities, currency, etc.).
- **URL sync:** `useSearchFiltersSync` — reads/writes URL search params and applies initial state from URL.
- **Handlers:** `useFilterHandlers` — change handlers, validation (year/price/mileage/engine/horsepower ranges and brand/model selection limits), submit, reset. On submit, blurs the active input so formatted values (e.g. mileage with spaces) are committed before building the URL.
- **Options:** `useFilterOptions` — brand/model options (with popular/other categories), city options, colors, doors, condition, registration type, registration yes/no, currency list.
- **Tabs:** `useSearchTabs` — active tab, refs for indicator and scroll.
- **Vehicle type:** `useVehicleType` — from URL or default `car`.
- **Popular tab:** `usePopularModels` — toggleBrand, toggleModel, isBrandExplicitlySelected, isModelSelected, selectedItems, clearAll; syncs with `filters.brand_ids` and `filters.model_ids`.

---

## Files

| File                                        | Role                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `SearchFilters.tsx`                         | Form container, vehicle type, tabs, tab visibility (`hidden`), actions, save modal |
| `search-filters/mobile/MobileSearchFilters.tsx` | Mobile vehicle/tire filter UI and sheets |
| `search-filters/BasicFilters.tsx`           | Basic criteria grid + PopularBodyTypesFilter                                               |
| `search-filters/AdvancedFilters.tsx`        | Additional criteria grid + labels                                                          |
| `search-filters/EquipmentFilters.tsx`       | Equipment checkboxes and match mode                                                        |
| `search-filters/PopularFilters.tsx`         | Popular brands/models links                                                                |
| `search-filters/SearchTabs.tsx`             | Tab buttons and indicator                                                                  |
| `search-filters/SearchFormActions.tsx`      | Search, Reset, Save, Log in buttons                                                        |
| `search-filters/VehicleTypeSelector.tsx`    | Car / Truck / Moto selector                                                                |
| `search-filters/PopularBodyTypesFilter.tsx` | Body type chips under Basic filters                                                        |
| `hooks/usePopularModels.ts`                 | Popular tab: brand/model selection, mutual exclusion, selectedItems                         |
| `app/globals.css`                           | `.paired-left`, `.paired-right`, `.input-field` padding/truncation                         |

---

## Related Documentation

- [search-title-url.md](./search-title-url.md) — URL slugs for brand/model, page title with diacritics.
- [vehicle-type.md](./vehicle-type.md) — Vehicle type classification and usage in search/form.
- [technical.md](../architecture/technical.md) — Listings API, filter query params, slug handling.
- [ui-components.md](./ui-components.md) — InfoBlock / HintTooltip (used in forms; equipment uses HintTooltip).

---

**Last updated:** 2026-05-19
