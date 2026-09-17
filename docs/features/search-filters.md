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

**Location:** Home page (`/`), form `#search-filters` (`data-testid="search-filters-form"`). Entry: `SearchFilters.tsx` (controller hook) → `search-filters/SearchFiltersForm.tsx` (markup and tab panels).

---

## Overview

The search form is split into:

1. **Vehicle type selector** — Car / Truck / Moto (above tabs).
2. **Four tabs:** Basic criteria, Additional criteria, Equipment, Popular.
3. **Actions:** Sort dropdown, available-count label, Reset, Smart selection, (Save filter), Log in. **Search** is shown only from `xl` (1280px).

On compact viewports (`< 1280px`) a committed change (bottom-sheet **OK**, popular body-type tile, equipment/checkbox, popular chip, sort, tire vehicle-type tile) updates the URL and listings grid immediately. Draft values inside an open sheet do not search until **OK**. Dismissing a sheet without **OK** does not search. On desktop (`>= 1280px`) filter state is held in React until the user clicks **Search** (or submits the form with Enter in a field). If the form matches the last applied state, Search and compact commit do nothing (no navigation, no listings refetch). The desktop Search button stays enabled; it is visually highlighted when there are pending changes.

See [search-title-url.md](./search-title-url.md) for brand/model slugs and [technical.md](../architecture/technical.md) for API and URL parameters.

---

## Search apply and sorting

| Surface | Sort behaviour | When results refresh |
| --- | --- | --- |
| Home search form (`/`), compact (`< 1280px`) | `SortDropdown` updates `filters.sortBy` / `filters.sortOrder` and applies search | Immediately on sort commit |
| Home search form (`/`), desktop (`>= 1280px`) | `SortDropdown` updates `filters.sortBy` / `filters.sortOrder` only (`selectedSortKey` from form state) | On **Search** when `hasFiltersChanged` |
| Seller board (`/board/:slug`) | `SortDropdown` without `onSortChange`; writes `sortBy` / `sortOrder` to the URL | Immediately on sort change |

- **Pending edits:** Desktop tab fields and home sort use deferred apply until **Search**. Compact sheets keep a draft until **OK**, then apply immediately. Compact tiles, checkboxes, popular chips, and sort apply on commit.
- **Change detection:** `useFilterHandlers` compares current `FilterState` to `lastAppliedFilters` (including sort). `lastAppliedFilters` is set after a successful apply and on URL sync from external navigation.
- **Available count:** `useAvailableListingsCount` uses current form fields (including pending sort), not only URL params.
- **Components:** `SortDropdown.tsx` (shared); home wires `onSortChange` + `selectedSortKey` via `SearchFormActions` / `SearchFiltersForm`. Compact apply uses `commitCompactSearch` (`scrollToResults: false`).
- **Scroll to results:** desktop **Search** sets `scrollToResultsAfterLoad`. After the grid is ready, `useListingGridScrollEffects` scrolls to `#listings-results`. Compact search apply does **not** set that flag, so the page stays put. On desktop (`innerWidth >= 1280`) the flag still only scrolls when the page is near the top (`scrollY <= 32`); if the user has already scrolled, the flag is cleared and the current position is kept. Header catalog search and applying a saved filter from `/favorites` are exceptions: they set `scrollToResultsAfterLoad=header` and always scroll to `#listings-results` (or to the top when the result set is empty). The header burger **Listings** item on home scrolls smoothly to `#home-listings` after the mobile drawer finish-close animation (`prepareScrollLockReleaseThen`).

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

On compact viewports the tab row is horizontally scrollable. It centers on **Basic criteria** on first load and again after switching vehicle type or the tire category. Edge chevrons (`lg:hidden`) scroll to the previous or next tab.

---

## Basic Criteria Tab

**Component:** `BasicFilters.tsx`.

**Layout:** Responsive grid: 1 column by default, 2 from `sm`, 3 from `xl` (so `lg` / 1024px stays on 2 columns). Two main rows of filters, then a full-width “Popular body types” block.

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

**Paired fields (From/To):** Year, Price, Mileage use two controls side by side, styled as one block (shared border, `.paired-left` / `.paired-right` in `app/globals.css`). On desktop each half has its own floating label (`yearFrom`/`yearTo`, `priceFrom`/`priceTo` + currency, `mileageFrom`/`mileageTo`). Desktop Year From/To dropdowns include a first menu item `common.clearSelection`: Year From clears to empty (disabled when empty); Year To resets to the current year (disabled at that default). On mobile, the year bottom sheet uses a dual scroll picker: From has an empty/`searchFilters.rangeAny` option; To omits the empty option because `year_lte` defaults to the current year.

**Desktop floating labels:** Desktop Basic/Advanced/Tire input and dropdown controls render the field name inside the control (`fieldLabel` / `SearchFilterInput`). Text inputs float on focus or when a value is present. Dropdowns keep the label centered while open/empty and float only after a selection (or while typing in a searchable dropdown filter), with the value (or `common.selectedCount`) on the second line. Mobile filter rows and sheets are unchanged.

**Translation keys (examples):** `searchFilters.brand`, `searchFilters.model`, `searchFilters.yearFrom`, `searchFilters.yearTo`, `searchFilters.priceFrom`, `searchFilters.priceTo`, `searchFilters.fuel`, `searchFilters.body`, `searchFilters.transmission`, `searchFilters.drive`, `searchFilters.mileageFrom`, `searchFilters.mileageTo`, plus placeholders like `searchFilters.selectBrands`, `searchFilters.selectModels`, etc.

---

## Additional Criteria Tab

**Component:** `AdvancedFilters.tsx`.

**Layout:** Same responsive grid as Basic (`1` → `sm:2` → `xl:3`). Desktop dropdown/input labels are floating inside the controls; long floating labels truncate with `title` for the full text on hover.

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
| **Seller type** — `MultiSelectDropdown` (`Individual` / `Business`) with clear actions; empty selection means “any” | **Labels** — “Urgent” and “New” checkboxes (car: `searchFilters.new`, truck: `newTruck`, moto: `newMoto`), badge styling | **Credit/installment** — “Available in credit” checkbox |

**Options:**

- Currency: from constants (e.g. EUR, MDL); no “All” option; placeholder e.g. “Select currency”.
- Has registration: yes/no; placeholder e.g. “Select”; no “All” option.
- Registration type, Condition, Color, Number of doors: from `useFilterOptions` (backend/options); multi-select or dropdown as in UI.

**URL / API:** `seller_types` is sent as a comma-separated list when one or more of `Individual` / `Business` are selected. Available in both vehicle advanced filters and tire search filters; applied by both `buildVehicleSearchQuery` and `buildTireSearchQuery` on the backend. Legacy `seller_type` (singular) is still accepted when reading URLs and by the API. See `build-fallback-listing-search-params.ts` and `SearchListingsDto.seller_types`.

**Translation keys (examples):** `searchFilters.city`, `searchFilters.currency`, `searchFilters.registration`, `searchFilters.registrationTypeLabel`, `searchFilters.condition`, `searchFilters.engine`, `searchFilters.horsepower`, `searchFilters.color`, `searchFilters.doors`, `searchFilters.labels`, `searchFilters.sellerTypeLabel`, `searchFilters.sellerTypePlaceholder`, `searchFilters.sellerTypeIndividual`, `searchFilters.sellerTypeBusiness`, `searchFilters.urgent`, `searchFilters.new`, `searchFilters.newMoto`, `searchFilters.newTruck`, plus placeholders.

---

## Equipment Tab

**Component:** `EquipmentFilters.tsx`.

- Equipment keys depend on `vehicleType` (car/truck/moto); see `getEquipmentKeysByVehicleType` and `vehicle-equipment.ts`.
- Options are grouped by category (e.g. comfort, safety) in an accordion: the first non-empty category is open by default; the rest are collapsed. Multiple categories can be open at once (same pattern as popular models by body type). Toggle/content test ids (when E2E ids are enabled): `search-equipment-category-{category}-toggle`, `search-equipment-category-{category}-content`.
- Headlights (e.g. LED, xenon) and tires are mutually exclusive within their group when match mode is “full”.
- Each checkbox uses a stable `id` (`search-equipment-${key}`) so SSR/hydration does not rely on React `useId()` for label association.
- **Match mode:** “Full” (listing must have all selected) or “Partial” (at least one). Stored in `filters.equipment_match_mode`; sent as `equipmentMatch` in API.

---

## Popular Tab

**Component:** `PopularFilters.tsx`.

- **Popular brands block:** Grid of brand tiles (logo + name), multi-select. Shown **only for cars** (`vehicleType === 'car'`); hidden for truck and moto. Data from `lib/content/popular-brands.ts` (and `getPopularBrands(vehicleType)`). Selection syncs with Basic criteria; affects “You selected” and search when applied.
- **Popular models block:** Chips for “most popular” model per brand, then “Show more” reveals additional models. Multi-select. Mutual exclusion: selecting a brand tile clears that brand’s model chips; selecting a model chip clears that brand’s tile. Clicking an active brand tile that has models selected switches to brand-only (removes models, keeps brand). “You selected” lists brand-only items as brand name only, model items as “Brand Model”.
- **Apply behaviour:** On desktop, selections update filter state and “You selected” immediately; search runs when the user clicks Search. On compact viewports, the same selections apply search immediately.
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

## Compact layout (phone and tablet)

- Below `xl` (`< 1280px`), vehicle filters use `MobileSearchFilters` (bottom sheets for field editing). Desktop dropdowns start at `xl`.
- On the vehicle **Basic criteria** tab, mobile rows are: Brand, Model, Year, Price, then Fuel, Body, Transmission, Drive, Mileage. The last five rows start collapsed behind a full-width **Show more** divider (hairline `primary-500/20` rules, `text-xs font-semibold text-primary-700`, chevron) that matches equipment category headers. When collapsed, a smaller `bg-accent` dot (`h-1.5 w-1.5`) sits to the right of the label if any extra field has a value — the same accent as the search-tab active dots (`h-2 w-2`). Expanding/collapsing uses the same 300ms `grid-template-rows` + opacity reveal as equipment/popular accordions; the label switches to **Show less** and the dot is hidden. Extra field values stay in form state while collapsed. Popular body type chips below the form stay visible.
- Action buttons (`SearchFormActions`) stay stacked full-width until `xl`; the desktop sort+CTA row starts at 1280px. The **Search** button is `hidden` below `xl`.
- All mobile search sheets use `components/common/BottomSheet.tsx` with a unified open/close lifecycle: the same 300ms slide-up/slide-down as other common sheets (`getBottomSheetSlideStyle`), regardless of whether the user dismisses via **OK**, the header close button, backdrop tap, Escape, swipe-down, or system **Back**.
- Confirm (**OK**) applies draft values, closes the sheet with the same exit animation, and runs search (`commitCompactSearch`). Dismiss actions do not apply draft changes and do not search.
- Sheet height is derived from `visualViewport` (not static `vh`) and respects iOS safe areas (`viewport-fit=cover`, top inset on the handle/header, bottom inset on the footer).
- Background scroll is blocked while the sheet is open via `useBlockBackgroundScroll` (event interception), not by locking `body` overflow — this keeps the `position: sticky` page header anchored to the viewport instead of scrolling out of view. Scrolling inside the sheet list still works and the page position stays put.
- System **Back** on Android/PWA closes the open bottom sheet first (shared overlay stack — see [overlay-back-navigation.md](./overlay-back-navigation.md)). Overlay history cleanup runs when the sheet portal unmounts, after the exit animation.
- The same four tab panels stay mounted with CSS `hidden` on inactive tabs (values persist when switching tabs).
- Mileage sheet inputs and summaries use thousands with spaces (same formatting helper as price).

### Mobile bottom sheet QA checklist

Manual verification on real devices (priority: iOS Safari, Android Chrome):

| Area | Cases |
| --- | --- |
| Vehicle type | Car, truck, moto — basic and advanced sheets |
| Category | Tire search sheets |
| Tabs | Basic, advanced, equipment, popular |
| Open/close | OK, header ×, backdrop, Escape, swipe-down, browser Back |
| Long lists | Brand, model, city — header close button visible; list scroll stays inside sheet |
| Scroll stability | Scroll page, open sheet, close without OK — page position unchanged |
| Safe area | Header × and footer OK not hidden under browser chrome or home indicator |

Automated coverage: `e2e/specs/search-filters-mobile.spec.ts` (sheet matrix + dismiss/scroll smoke).

---

## Styling and UX Details

### Paired inputs (From/To)

- Wrapper: `flex` with two children.
- Left control: `paired-left` (rounded left, no inner right border).
- Right control: `paired-right` (rounded right, overlapping left border, higher z-index on focus so the shared edge highlights correctly).
- Defined in `core/frontend/app/globals.css` (`.paired-left`, `.paired-right`, focus states).

### Desktop floating labels

- Opt-in via `fieldLabel` / `fieldLabelIcon` on `Dropdown` and `MultiSelectDropdown`, and via `SearchFilterInput` for native inputs.
- Classes: `.search-field-floating`, `.search-field-floating-label`, `.search-field-floating-value`, `.search-field-floating-input`. Floating labels use `primary-900` when empty and `primary-700` when floating; values and typed input text use `primary-900`.
- Without `fieldLabel`, shared dropdowns (for example the language switcher) keep the previous single-line trigger. `SortDropdown` uses the same floating-label pattern as desktop search filter controls.

### Border contract

- Utility: `.search-control-border` (1px solid `primary-500/20`; hover `primary-500/40`; focus/open/selected `primary-500`).
- Applied on desktop and mobile search controls: floating fields, mobile `FilterRow`s, popular statistics cards, popular body/brand tiles, popular model/tire-size chips, selection check badges, equipment match-mode chips, tire vehicle-type selectors, label cards, sheet inputs, and checkboxes.
- Action CTAs keep their own borders.

### Label truncation

- Long floating labels truncate inside the control; `title` preserves the full text on hover.

### Responsive grid

- Grid (Basic/Advanced): `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4`. Inner groups (e.g. Brand+Model) use `grid-cols-2 gap-2` where two controls share one column.

---

## State and Hooks

- **Filter state:** `useSearchFilters` — holds all filter fields (brand_ids, model_ids, year_gte/lte, price_gte/lte, cities, currency, etc.).
- **URL sync:** `useSearchFiltersSync` — reads/writes URL search params and applies initial state from URL.
- **Handlers:** `useFilterHandlers` — change handlers, validation (year/price/mileage/engine/horsepower ranges and brand/model selection limits), submit, reset, compact commit. Submit runs `applySearchWithOverrides` only when `hasFiltersChanged`; otherwise no-op. Compact commit uses `applySearchWithOverrides(overrides, { scrollToResults: false })`. On apply, blurs the active input so formatted values (e.g. mileage with spaces) are committed before building the URL.
- **Options:** `useFilterOptions` — brand/model options (with popular/other categories), city options, colors, doors, condition, registration type, registration yes/no, currency list.
- **Tabs:** `useSearchTabs` — active tab, refs for indicator and scroll.
- **Vehicle type:** `useVehicleType` — from URL or default `car`.
- **Popular tab:** `usePopularModels` — toggleBrand, toggleModel, isBrandExplicitlySelected, isModelSelected, selectedItems, clearAll; syncs with `filters.brand_ids` and `filters.model_ids`.
- **Controller:** `useSearchFiltersController` — wires hooks, handlers, and props for `SearchFiltersForm`; lifecycle in `useSearchFiltersControllerLifecycle`.

---

## Files

| File                                        | Role                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `SearchFilters.tsx`                         | Thin wrapper: `useSearchFiltersController` → `SearchFiltersForm` |
| `search-filters/SearchFiltersForm.tsx`      | Form markup, vehicle type, tabs, desktop/mobile panels, actions, save modal |
| `search-filters/searchFiltersDynamics.tsx`  | `dynamic()` imports for mobile/tire panels and save modal (code-split). Desktop `AdvancedFilters`, `EquipmentFilters`, `TireSearchFilters`, and `SaveFilterModal` use `{ ssr: false }`; `MobileSearchFilters` is SSR’d (mobile equipment panel imports `EquipmentFilters` statically inside `MobileVehicleSection`) |
| `hooks/useSearchFiltersController.ts`       | Composes filter state, URL sync, handlers, and form props |
| `search-filters/mobile/MobileSearchFilters.tsx` | Mobile vehicle/tire filter UI and sheets |
| `search-filters/mobile/MobileVehicleBasicTab.tsx` | Mobile basic rows; Show more for fuel/body/transmission/drive/mileage |
| `search-filters/BasicFilters.tsx`           | Basic criteria grid + PopularBodyTypesFilter                                               |
| `search-filters/AdvancedFilters.tsx`        | Additional criteria grid + labels                                                          |
| `search-filters/SearchFilterInput.tsx`      | Desktop floating-label wrapper for native search inputs                                    |
| `search-filters/SearchFieldFloatingLabel.tsx` | Shared floating label markup for desktop search fields                                   |
| `search-filters/EquipmentFilters.tsx`       | Equipment checkboxes and match mode                                                        |
| `search-filters/PopularFilters.tsx`         | Popular brands/models links                                                                |
| `search-filters/PopularFilterPickers.tsx`   | Popular brand tiles and model/size chips                                                   |
| `search-filters/PopularStatistics.tsx`      | Popular tab statistics cards                                                               |
| `search-filters/SearchTabs.tsx`             | Tab buttons and indicator                                                                  |
| `search-filters/SearchFormActions.tsx`      | Available-count display, sort dropdown, Smart selection, Save, Search, Reset, and Log in buttons |
| `components/search/SortDropdown.tsx`        | Listing sort select; deferred on home (`onSortChange`), immediate on board |
| `search-filters/VehicleTypeSelector.tsx`    | Car / Truck / Moto selector                                                                |
| `search-filters/PopularBodyTypesFilter.tsx` | Body type chips under Basic filters                                                        |
| `hooks/usePopularModels.ts`                 | Popular tab: brand/model selection, mutual exclusion, selectedItems                         |
| `app/globals.css`                           | `.paired-left`, `.paired-right`, `.input-field`, `.search-control-border`, `.search-field-floating*`; `.input-field` inside `[data-bottom-sheet-overlay]` uses a white (`#fff`) background |

---

## E2E selectors (Playwright)

Stable `data-testid` values used by `search-filters-mobile.spec.ts` and `search-filters-desktop.spec.ts`. Add or rename IDs in the same change as the E2E flow.

| Surface | IDs |
| --- | --- |
| Form | `search-filters-form` (E2E uses `:visible` when a stale hidden instance exists after cookie reset) |
| Tabs | `search-tab-basic`, `search-tab-advanced`, `search-tab-equipment`, `search-tab-popular` |
| Desktop panels | `search-panel-basic`, `search-panel-advanced`, `search-panel-equipment`, `search-panel-popular` |
| Mobile panels | `search-panel-mobile-basic`, `search-panel-mobile-advanced`, `search-panel-mobile-equipment`, `search-panel-mobile-popular` |
| Mobile sheet rows | `search-filter-row-{sheetId}` (e.g. `vehicle_brand`); `data-has-selection` on the row |
| Mobile basic extra | `search-basic-more-toggle`, `search-basic-more-content`, `search-basic-more-active` (collapsed extra-value dot) |
| Sheet UI | `search-sheet-option-{value}`, `search-sheet-confirm` |
| Mobile equipment / popular | `search-equipment-{key}` (mobile layout only), `search-equipment-category-{category}-toggle` / `-content`, `search-popular-chip-{brand}-{model}` |
| Actions | `search-submit`, `search-reset`, `search-smart-selection`, `search-save-filter` |
| Sort (home) | `search-sort-select`, `search-sort-select-menu`, `search-sort-select-option-{index}` |

E2E: `listing-sort.spec.ts` — home uses `selectSortAndApply()` (compact applies immediately; desktop still submits Search); board applies sort immediately. See [e2e-playwright-standards.md](../guides/e2e-playwright-standards.md) for project layout and flow rules.

---

## Listing create/edit forms

The same floating-label and `search-control-border` primitives are reused in vehicle and tire listing forms (`ListingFormTextInput`, `MobileSelectField`, `ListingYearField`).

| Viewport | Text inputs | Selects / year |
| --- | --- | --- |
| Desktop (`≥768px`) | `SearchFilterInput` with internal floating label; optional `fieldLabelTrailing` (`RequiredAsterisk`) | `Dropdown` via wrappers with `fieldLabel` / `fieldLabelTrailing` |
| Mobile (`<768px`) | Plain `input-field` + `search-control-border`; external labels unchanged | Bottom-sheet triggers + `search-control-border`; no floating labels |

`VehicleTypeSelector` and tire compatible-vehicle chips use `search-control-border` + `is-selected` for the active state on all viewports.

---

## Related Documentation

- [header-catalog-search.md](./header-catalog-search.md) — header typeahead for brand / model / year.
- [search-title-url.md](./search-title-url.md) — URL slugs for brand/model, page title with diacritics.
- [smart-selection.md](./smart-selection.md) — Guided questionnaire that creates saved filters.
- [vehicle-type.md](./vehicle-type.md) — Vehicle type classification and usage in search/form.
- [technical.md](../architecture/technical.md) — Listings API, filter query params, slug handling.
- [ui-components.md](./ui-components.md) — InfoBlock / HintTooltip (used in forms; equipment uses HintTooltip).

---

**Last updated:** 2026-09-17
