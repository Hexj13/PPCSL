---
title: Playwright E2E standards
owner: platform
tags:
  - type/guide
  - domain/testing
  - scope/core
  - status/active
---

# Playwright E2E standards

Project-specific standard for E2E tests in PPCSL frontend.

## Scope and entry points

- Active E2E specs live in `core/frontend/e2e/specs`.
- Shared test helpers live in:
  - `core/frontend/e2e/components`
  - `core/frontend/e2e/page-objects`
  - `core/frontend/e2e/utils`
  - `core/frontend/e2e/fixtures`
  - `core/frontend/e2e/test-data`
  - `core/frontend/e2e/constants`
- Playwright config: `core/frontend/playwright.config.ts`.

## Runtime and commands

Run from `core/frontend`:

```bash
npm run test:e2e
```

Optional modes:

```bash
npm run test:e2e:headed
npm run test:e2e:ui
```

Allure reporting:

```bash
npm run test:e2e:allure
npm run test:e2e:allure:open
```

- Raw results directory: `core/frontend/allure-results`
- Generated report directory: `core/frontend/allure-report`

Install browser binaries once per machine:

```bash
npx playwright install chromium
```

## Environment contract

- `E2E_BASE_URL` (optional, default `http://localhost:3000`)
- `E2E_USER_LOGIN` (optional; default `admin@admin.com` when unset)
- `E2E_USER_PASSWORD` (optional; default `GGGgggTEST777` when unset — matches stage `seed.ts` admin)

If you set `E2E_USER_*` explicitly, values must match a user in your database (password must match the hashed password from seed or your own reset).

Authenticated tests must use `test.skip(...)` when credentials are missing.

Local registration flow expectation:

- On local environment SMS verification code is `000000`.
- Registration E2E should cover both user types: individual and business.
- Registration flow is complete only after `verify-phone` -> `complete-profile` (with additional data) -> home page.

## Required architecture for specs

Each spec must follow these rules:

1. **Page object first**
   - Use page objects for page-level operations.
   - Each page object must expose `expectPageView()`.
2. **Component object composition**
   - For complex page regions (forms, dialogs, widgets), create component objects in `e2e/components`.
   - Page objects must compose component objects instead of duplicating region-level logic.
3. **Fixture-based dependency injection**
   - Specs must import `test`/`expect` from `e2e/fixtures/base.ts`.
   - Page objects should be injected through fixtures instead of `new` in every spec.
4. **Visibility gate before interaction**
   - The test must call page `expectPageView()` before any interaction on that page.
5. **No duplicated setup**
   - Use shared hooks/utilities for repeated setup (`useClearedBrowserState`).
6. **No locator literals inside test bodies**
   - Locator values must come from shared constants (`e2e/constants/locators.ts`) or page object methods.
7. **Reusable flow utilities**
   - Repeated cross-spec flows (auth, listing navigation, common checks) must be extracted to `e2e/utils` or page objects.
8. **Step-based execution style**
   - Use explicit `test.step(...)` for meaningful user actions and validations.
   - For multi-step flows, group steps in arrays and execute via shared helper (`e2e/utils/steps.ts`).
9. **Describe/test structure**
   - Keep one feature per `describe` block and use clear scenario names in `test(...)`.
   - Keep assertion and action names readable in Playwright report output.
10. **Test-data factories**

- Reusable runtime scenario data should live in `e2e/test-data`.
- Specs should consume factory helpers instead of duplicating generation logic.

## Selector policy

- Primary selector strategy: `data-testid`.
- Keep naming stable and semantic (flow + element intent).
- Keep selectors centralized via `e2e/constants/locators.ts`.

## Reliability rules

- Tests must be isolated and independent.
- Avoid hard sleeps.
- Use explicit URL and visibility assertions after each meaningful navigation step.
- Keep assertions deterministic and language-independent.
- Use Allure as the source of truth for E2E run reports.

## P0 smoke scope

P0 is the minimum E2E subset that protects release readiness for the primary marketplace flow.

- Search home page opens and filter interactions work for core vehicle types.
- Listing detail page opens from search results and key detail blocks are visible.
- Login flow is stable for valid credentials and unauthenticated access stays guarded.
- Registration flow reaches home through `verify-phone` and `complete-profile`.
- Listing creation flow covers guest guard and successful authenticated publish.
- My listings page is accessible for authenticated users and route guard works after logout.

All other end-to-end checks are considered non-P0 coverage and can run in the full suite.

## Current implementation status

Current suite is aligned with this standard:

- Shared locator constants: `e2e/constants/locators.ts`
- Shared fixtures: `e2e/fixtures/base.ts`
- Shared setup hook: `e2e/utils/spec-hooks.ts`
- Shared auth/listing helpers: `e2e/utils/auth.ts`, `e2e/utils/listings.ts`
- Shared step runner: `e2e/utils/steps.ts`
- Shared test-data factories: `e2e/test-data/auth.ts`
- Shared component objects:
  - `components/auth/register-form.component.ts`
  - `components/auth/verify-phone-form.component.ts`
  - `components/profile/complete-profile-form.component.ts`
- Required page objects with `expectPageView()`:
  - `SignPage`
  - `VerifyPhonePage`
  - `CompleteProfilePage`
  - `SearchHomePage`
  - `ListingDetailPage`
  - `ListingCreatePage`
  - `MyListingsPage`
