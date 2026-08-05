---
title: E2E Test Architecture
owner: platform
tags:
  - type/architecture
  - domain/testing
  - scope/core
  - status/active
---

# E2E Test Architecture

Layered architecture for Playwright E2E in `core/frontend/e2e`.

## Goals

- Keep specs readable and stable.
- Isolate selectors and UI structure details from scenario assertions.
- Reuse cross-scenario flows and test data generation.

## Layers

### Platform contract

- Location: `core/frontend/e2e/platform`.
- Resolves country-specific e2e defaults (`defaultLocale`, phone region, URL prefixes, locale cookie names) from synced `lib/config/site.ts` + `COUNTRY`.
- Specs, page objects, and utils must depend on `getE2ePlatform()` / phone helpers here — not on hardcoding Moldova or Albania values.
- Listing description tab slot0 test id stays the legacy UI id (`listing-form-description-tab-ro`) exported as `E2E_DESCRIPTION_TAB_SLOT0_TEST_ID`.

### Specs

- Location: `core/frontend/e2e/specs`.
- Describe business scenarios only.
- Use `test.step(...)` with clear action/assertion names (or `runSteps` with `E2EStep` arrays).
- Consume fixtures from `e2e/fixtures/base.ts` instead of constructing page objects in each test.

### Fixtures

- Location: `core/frontend/e2e/fixtures`.
- `base.ts` extends Playwright `test` with typed fixtures for page objects and an automatic Allure layer label.
- Fixtures are the dependency injection layer for specs.

### Page Objects

- Location: `core/frontend/e2e/page-objects`.
- Own route-level behavior and `expectPageView()` checks.
- Compose lower-level component objects for complex page regions.
- Keep page-level `data-testid` values in a local `testIds` object inside each page object.

### Component Objects

- Location: `core/frontend/e2e/components`.
- Encapsulate reusable behavior for form or widget regions.
- Keep component-level `data-testid` values in the owning component object when needed by E2E flows.
- Examples:
  - `components/auth/register-form.component.ts`
  - `components/auth/verify-phone-form.component.ts`
  - `components/profile/complete-profile-form.component.ts`

### Utilities

- Location: `core/frontend/e2e/utils`.
- Hold cross-feature helpers:
  - flow helpers (`auth.ts` — `loginByUi`, `listings.ts`, `listing-flow.ts`)
  - browser reset (`session.ts`)
  - step runner (`steps.ts`)
  - search form scoping (`search-filters-form.ts`, `search-filter-panels.ts`)
  - API helpers (`utils/api/*`)

### Types

- Location: `core/frontend/e2e/types`.
- Shared non-runtime types such as `E2EStep`.

### Test Data

- Location: `core/frontend/e2e/test-data`.
- Generate deterministic runtime data for scenarios (`test-data/auth.ts`, `test-data/search-filter-sheets.ts` for mobile vehicle filter sheets).
- Do not hardcode random generation in spec bodies when reusable factory is possible.

## Dependency Direction

Dependencies must stay one-way:

`specs -> fixtures -> page-objects -> components`

`e2e/platform` may be imported by specs, fixtures, page-objects, and utils.

Utilities and test-data can be consumed by specs/page-objects, but must not depend on specs.

## Coverage matrix (high level)

Browser: **Chromium only**. Viewports: default Playwright projects are `mobile` then `desktop`; most specs run on both. `search-filters-mobile.spec.ts` and `search-filters-desktop.spec.ts` are scoped per project via `testIgnore` in `playwright.config.ts` (not in-spec `test.skip`). Prefer fixing and adding flows on mobile first.

| Area | Guest | Auth | Admin | P0 tag |
| --- | --- | --- | --- | --- |
| Search filters (shared) | yes | yes | n/a | yes (`search-filters.spec.ts`) |
| Search filters (mobile sheets) | yes | yes | n/a | yes (`search-filters-mobile.spec.ts`, mobile project only) |
| Search filters (desktop tabs) | yes | yes | n/a | yes (`search-filters-desktop.spec.ts`, desktop project only) |
| Search home scroll restore | yes | n/a | n/a | yes (`search-home-scroll.spec.ts`; extended serial coverage in `home-scroll-restore.spec.ts`) |
| Smart selection | yes | yes | n/a | no |
| Listing AI report | yes | yes | n/a | no |
| Listing detail view | via shared prep | yes | n/a | yes (`listing-view.spec.ts`) |
| Listing detail actions (compare) | n/a | yes | n/a | no |
| Listing similar carousel | yes | n/a | n/a | no (`listing-similar-scroll.spec.ts`) |
| Listing create / my listings / promotion | n/a | yes | n/a | yes (`listing-create.spec.ts`, `my-listings.spec.ts`, `promotion.spec.ts`) |
| Auth login / register | partial | yes | n/a | yes (`auth-login.spec.ts`, `auth-registration.spec.ts`) |
| Favorites | n/a | yes | n/a | no |
| Saved filters | n/a | yes | n/a | no |
| Compare empty states | yes | n/a | n/a | no |
| Profile | n/a | yes | n/a | no |
| Admin read-only tabs | n/a | yes (admin user) | yes | no (`admin.spec.ts`; users/promotions tab content test IDs) |
| Static / legal / partners / offline | yes | n/a | n/a | no |
| Guest route guards | yes | n/a | n/a | no |
| Language switcher | yes | n/a | n/a | no |
| Cross-tab favorites | n/a | yes | n/a | no (`sync-favorites-cross-tab.spec.ts`) |

## Migration Note

`e2e/src_example` was a reference implementation and is not part of active runtime architecture.
Its useful patterns were applied into active layers above.

Removed `mobile-search.spec.ts`: mobile search coverage lives in viewport projects plus `search-filters-mobile.spec.ts` / `search-filters-desktop.spec.ts` (see [e2e-playwright-standards.md](../guides/e2e-playwright-standards.md)).
