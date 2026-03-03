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

Filter state is synced with the URL; submitting the form runs the search and updates results. See [SEARCH_TITLE_URL.md](./SEARCH_TITLE_URL.md) for brand/model slugs and [TECHNICAL.md](../architecture/TECHNICAL.md) for API and URL parameters.

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

Only one tab’s content is rendered at a time (`activeTab === 'basic' | 'advanced' | 'equipment' | 'popular'`). Tab state is managed by `useSearchTabs`.

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
| **Price** (paired: From / To text inputs, thousands with spaces) | **Transmission** + **Drive type** (two MultiSelectDropdowns) | **Mileage** (paired: From / To text inputs, km) |

### Row 3 (full width)

- **Popular body types** — `PopularBodyTypesFilter`: clickable body-type chips (e.g. Sedan, SUV). Selection syncs with the Body type multi-select from row 1.

**Paired fields (From/To):** Year, Price, Mileage use a single label and two controls side by side, styled as one block (shared border, `.paired-left` / `.paired-right` in `app/globals.css`). Placeholders use `searchFilters.from` and `searchFilters.to`.

**Translation keys (examples):** `searchFilters.brand`, `searchFilters.model`, `searchFilters.year`, `searchFilters.price`, `searchFilters.fuel`, `searchFilters.body`, `searchFilters.transmission`, `searchFilters.drive`, `searchFilters.mileage`, plus placeholders like `searchFilters.selectBrands`, `searchFilters.selectModels`, etc.

---

## Additional Criteria Tab

**Component:** `AdvancedFilters.tsx`.

**Layout:** Same responsive 3-column grid as Basic. Labels use `truncate` and `title` so long text (e.g. “Наличие регистрации”) stays on one line on tablets and shows full text on hover.

### Row 1 (three columns)

| Column 1                                             | Column 2                                                                      | Column 3                            |
| ---------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------- |
| **City** + **Currency** (two dropdowns side by side) | **Has registration** + **Registration type** (Dropdown + MultiSelectDropdown) | **Condition** (MultiSelectDropdown) |

### Row 2 (three columns)

| Column 1                               | Column 2                               | Column 3 (car/truck vs moto)                                             |
| -------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------ |
| **Engine (l)** — paired From/To inputs | **Power (hp)** — paired From/To inputs | **Color** + **Number of doors** (car/truck) **or** **Color** only (moto) |

### Row 3 (full width)

- **Labels:** Checkboxes for “Urgent” and “New” (or “New moto” for moto). Styled as badge chips with icons.

**Options:**

- Currency: from constants (e.g. EUR, MDL); no “All” option; placeholder e.g. “Select currency”.
- Has registration: yes/no; placeholder e.g. “Select”; no “All” option.
- Registration type, Condition, Color, Number of doors: from `useFilterOptions` (backend/options); multi-select or dropdown as in UI.

**Translation keys (examples):** `searchFilters.city`, `searchFilters.currency`, `searchFilters.registration`, `searchFilters.registrationTypeLabel`, `searchFilters.condition`, `searchFilters.engine`, `searchFilters.horsepower`, `searchFilters.color`, `searchFilters.doors`, `searchFilters.labels`, `searchFilters.urgent`, `searchFilters.new`, `searchFilters.newMoto`, plus placeholders.

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
- **URL:** Slug-based (`?brand=...&model=...`), built via `createSlug`; see [SEARCH_TITLE_URL.md](./SEARCH_TITLE_URL.md). When multiple models share the same name (e.g. Dacia Logan, Renault Logan), the URL stores a single slug (e.g. `logan`); parsing resolves to all matching model IDs per selected brands.

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
- **Handlers:** `useFilterHandlers` — change handlers, validation (year/price/mileage/engine/horsepower ranges), submit, reset.
- **Options:** `useFilterOptions` — brand/model options (with popular/other categories), city options, colors, doors, condition, registration type, registration yes/no, currency list.
- **Tabs:** `useSearchTabs` — active tab, refs for indicator and scroll.
- **Vehicle type:** `useVehicleType` — from URL or default `car`.
- **Popular tab:** `usePopularModels` — toggleBrand, toggleModel, isBrandExplicitlySelected, isModelSelected, selectedItems, clearAll; syncs with `filters.brand_ids` and `filters.model_ids`.

---

## Files

| File                                        | Role                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `SearchFilters.tsx`                         | Form container, vehicle type, tabs, conditional render of tab content, actions, save modal |
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

- [SEARCH_TITLE_URL.md](./SEARCH_TITLE_URL.md) — URL slugs for brand/model, page title with diacritics.
- [VEHICLE_TYPE.md](./VEHICLE_TYPE.md) — Vehicle type classification and usage in search/form.
- [TECHNICAL.md](../architecture/TECHNICAL.md) — Listings API, filter query params, slug handling.
- [UI_COMPONENTS.md](./UI_COMPONENTS.md) — InfoBlock / HintTooltip (used in forms; equipment uses HintTooltip).

---

**Last updated:** 2026-03-03
