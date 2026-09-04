---
title: Header catalog search
owner: platform
tags:
  - type/guide
  - domain/search
  - scope/core
  - status/active
---

# Header catalog search

Typeahead in the site header over the `brands` / `vehicle_models` catalog (brand, model, year). This is not a listing search engine: suggestions come from an in-memory Redis index, and the listings grid updates only when the user **selects** a row (click or Enter).

**Status:** Implemented.

**Entry points:** `GET /api/brands/suggest` (`brands.controller.ts`) → `HeaderCatalogSearch.tsx` in the site header.

---

## Behaviour

- Suggest runs after **3 Unicode letters or digits** (`\p{L}` / `\p{N}`), with 200ms debounce on the client. Queries longer than **64** characters are not sent (same cap as the API DTO).
- Matching uses `normalizeForComparison` (Cyrillic → Latin) plus a static alias map (`brand-search-aliases.ts`). Display names stay canonical (`Ford`).
- One catalog entity is exploded per `vehicleType` (`car` / `truck` / `moto`). Tires are out of scope. Query `ford` / `форд` yields **brand** rows per category, not every Ford model. Models appear when the query has a second token (`ford fo`).
- A year is attached to matching rows only when the query contains **exactly four digits** in the allowed range **1940…current calendar year** (`ford 2016`, `форд 2016`). Incomplete fragments (`201`), longer digit runs (`20150`), and out-of-range years (`1939`, next year) are not treated as years. The list title stays the canonical name (`Ford`); the year is shown on the same subtitle line as the category (`Car · Year: 2016` / `Makinë · Viti: 2016`). Selecting the row still writes `year_gte` and `year_lte`.
- Ranking: exact brand → brand+model → model → year. Limit **12**.
- Selecting a row navigates to a **clean** home URL (`getDefaultFilters` plus suggest fields). Other filters (price, mileage, …) are not merged. Brand/model slugs must match `[a-z0-9]+(-[a-z0-9]+)*`; `vehicleType` is only `car` / `truck` / `moto`; years outside **1940…current calendar year** are dropped.
  - Brand: `/?brand=ford` or `/?brand=ford&vehicleType=truck`
  - Model: `/?brand=ford&model=focus`
  - Year on the row writes **From** and **To** together (`year_gte` and `year_lte`). If the year is the current calendar year, `year_lte` is omitted from the URL (existing `handleYearLte`); parsed `FilterState` still has both fields equal to that year.
  - Year-only rows keep the current URL `vehicleType`, else default `car`.
- From home the navigation is `replace`; from other pages it is `push`.
- After a row is selected, `useListingGridScrollEffects` scrolls to `#listings-results` once the grid is ready, on every viewport including desktop when the page was already scrolled. An empty result set scrolls to the top of the page instead. On mobile the sheet overlay history is detached before navigation so closing the sheet does not `history.back()` onto the unfiltered URL.
- Hidden on `/sign`, error pages, and `/admin`.

---

## Backend

- Index: one SQL join of non-archived brands and models, cached at `cache:brands:suggest-index` (TTL 86400), invalidated with the brands list.
- Matcher is a pure function over the index (user `q` is never interpolated into SQL).
- DTO: max 64 chars, Unicode letters/digits/space/hyphen, min 3 alphanumeric after trim, optional `vehicleType` enum, `limit` capped at 12.
- Throttle: 60 requests/minute in production.
- Redis is not keyed by raw `q` (only the index is cached). Logs record query length and result count, not the full `q`.

---

## Frontend / layout

Desktop (`lg+`, 1024px and up): logo → nav links → divider → search input (full placeholder, fills leftover width) → divider → action buttons → divider → language. The header row is full viewport width with `20px` side padding (`px-5`); it does not use the page `container` max-width. From `lg` until `xl` (1024–1279px) Favorites, Compare, My listings, and Partners sit in the More dropdown; they return as inline links from `xl`.

If the desktop search slot is **narrower than 200px** when the field is focused (or the query changes), nav links collapse left of the input so the field grows toward the logo. The threshold is `HEADER_CATALOG_SEARCH_MIN_WIDTH_PX` and is measured once from the slot’s width before collapse; a later keystroke does not re-measure (that would restore the menu because the field is already wider). Fields already **200px or wider** leave the menu in place. Nav returns on click outside, Escape, or selecting a suggestion. While collapsed, the nav cluster is `inert` / `aria-hidden`, uses `overflow-hidden`, and animates `grid-template-columns` `1fr` → `0fr` (~300ms). At rest the cluster keeps `overflow-visible` so the More dropdown is not clipped.

While header auth is still initializing (`showSkeleton`), the catalog search slot is a pulse skeleton like the rest of the header: desktop input (`data-testid="header-catalog-search-skeleton"`), mobile icon (`data-testid="header-mobile-search-skeleton"`), and logo (`data-testid="header-logo-skeleton"`) sized to the SVG aspect boxes so the row does not shift when the image appears. The live field is not shown until auth is ready.

Mobile and tablet (`< lg`, including 768–1023): search icon immediately left of the burger (`data-testid="header-mobile-search"`, 44px tap target). The icon opens a `BottomSheet` with `mobileOnly={false}` (header chrome switches at `lg`, independently of the compact-layout sheet cap). Custom header: input + clear + **Cancel** from `common.cancel`; grab-handle kept, default title+× replaced. Opening search closes the menu drawer and vice versa. Resizing to `lg+` closes the sheet. The sheet uses the same enter/exit slide as other `BottomSheet` panels. The opening tap focuses the sheet input in the same user gesture (`flushSync` + `focus({ preventScroll: true })`) so the virtual keyboard opens without a second tap; the field is mounted on that same update, before the slide finishes.

While suggest is in flight, the list area shows `Spinner` `inline size="md"` plus `header.catalogSearchLoading` (`data-testid="header-catalog-search-loading"`), deferred with `useLoadingState` / `SKELETON_DEFERRED`. The previous list is not kept.

Combobox keyboard: Arrow Up/Down, Enter, Escape, click outside. Desktop suggestion list is left-aligned to the search input, `min-width: 200px`, and matches the input width when the field is wider. The header language dropdown (shared `Dropdown` portal, `menuExpandToContent`) is clamped to the viewport with an 8px margin and flips to the trigger’s right edge when it would overflow. Mobile close: Cancel, backdrop, Escape, system Back (`useHistoryBackClose`).

---

## Related

- [search-filters.md](./search-filters.md) — home filter form (brand/model selects are unchanged).
- [overlay-back-navigation.md](./overlay-back-navigation.md) — mobile sheet Back handling.
- [search-title-url.md](./search-title-url.md) — brand/model slugs in the URL.

---

**Last updated:** 2026-09-04
