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
  - flow helpers (`auth.ts`, `listings.ts`, `listing-flow.ts`)
  - browser reset (`session.ts`)
  - step runner (`steps.ts`)
  - API helpers (`utils/api/*`)

### Types

- Location: `core/frontend/e2e/types`.
- Shared non-runtime types such as `E2EStep`.

### Test Data

- Location: `core/frontend/e2e/test-data`.
- Generate deterministic runtime data for scenarios (`test-data/auth.ts`).
- Do not hardcode random generation in spec bodies when reusable factory is possible.

## Dependency Direction

Dependencies must stay one-way:

`specs -> fixtures -> page-objects -> components`

Utilities and test-data can be consumed by specs/page-objects, but must not depend on specs.

## Coverage matrix (high level)

Browser: **Chromium only**. Viewports: **desktop default** in Playwright config; **narrow viewport** covered by `mobile-search.spec.ts` via `test.use({ viewport })`.

| Area | Guest | Auth | Admin | P0 tag |
| --- | --- | --- | --- | --- |
| Search filters (desktop) | yes | yes | n/a | yes (`search-filters.spec.ts`) |
| Search filters (mobile viewport) | yes | n/a | n/a | yes (`mobile-search.spec.ts`) |
| Listing detail view | via shared prep | yes | n/a | yes (`listing-view.spec.ts`) |
| Listing detail actions (compare) | n/a | yes | n/a | no |
| Listing create / my listings | n/a | yes | n/a | yes |
| Auth login / register | partial | yes | n/a | yes |
| Favorites | n/a | yes | n/a | no |
| Saved filters | n/a | yes | n/a | no |
| Compare empty states | yes | n/a | n/a | no |
| Profile | n/a | yes | n/a | no |
| Admin read-only tabs | n/a | yes (admin user) | yes | no |
| Static / legal / partners / offline | yes | n/a | n/a | no |
| Guest route guards | yes | n/a | n/a | no |
| Language switcher | yes | n/a | n/a | no |
| Cross-tab favorites | n/a | yes | n/a | no |

## Migration Note

`e2e/src_example` was a reference implementation and is not part of active runtime architecture.
Its useful patterns were applied into active layers above.
