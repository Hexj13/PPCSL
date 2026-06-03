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
  - `core/frontend/e2e/types`
- Playwright config: `core/frontend/playwright.config.ts` (`testDir: ./e2e/specs`).

## Runtime and commands

Run from `core/frontend`:

```bash
npm run test:e2e
```

Optional modes:

```bash
npm run test:e2e:p0
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

- `E2E_BASE_URL` or `PLAYWRIGHT_BASE_URL` (optional; Playwright default `http://localhost:3000`)
- `PLAYWRIGHT_SKIP_WEBSERVER=1` to skip `webServer` when the dev server is already running
- `E2E_USER_LOGIN` (optional; default `admin@admin.com` when unset)
- `E2E_USER_PASSWORD` (optional; default `GGGgggTEST777` when unset — matches stage `seed.ts` admin)
- `API_URL` or `E2E_API_URL` (optional; default `http://localhost:4000` for API helpers such as `buildAvailableMdPhone`)
- For browser-side API helpers (`e2e/utils/api-origin.ts`), only **absolute** `http(s)` URLs are used from env. Priority: `E2E_API_URL`, then `API_URL`, then `NEXT_PUBLIC_API_URL` (relative values such as `/api` are ignored so helpers do not call the wrong host).
- Run the backend API with `SMS_OUTBOUND_DISABLED=true` (and `NODE_ENV` not `production`) when Twilio credentials are present in `.env` so Playwright flows do not trigger real outbound SMS; codes in Redis are still written; UI verification can use `000000` when the API runs with `NODE_ENV=development` or `stage`, or with `NODE_ENV=test` and `ALLOW_SMS_TEST_CODE=true` (see below).

If you set `E2E_USER_*` explicitly, values must match a user in your database (password must match the hashed password from seed or your own reset).

`e2e/utils/auth.ts` `loginByUi` throws if post-login navigation lands on `/complete-profile` with `mode=phone_required` or `mode=business_onboarding` (seeded E2E admin must have `phoneVerified: true`; Business users need `companyName`).

Use `testInfo.skip(condition, reason)` only for rare environment constraints documented in the spec. Prefer fixing data or config so tests **run** (pass or fail) rather than staying skipped.

Local registration flow expectation:

- SMS verification code `000000` is accepted when the API `NODE_ENV` is `development` or `stage`, or when `NODE_ENV` is `test` and `ALLOW_SMS_TEST_CODE=true` (not production). Registration submit waits for `POST /api/auth/send-sms` before asserting navigation to `/verify-phone`.
- Registration E2E should cover both user types: individual and business.
- Registration flow is complete only after `verify-phone` -> `complete-profile` (with additional data) -> home page.

Google account password setup (`profile-password.spec.ts`):

- Local/test API only: `POST /api/auth/e2e/google-business-user` creates a Business user with `googleId`, verified phone/email, and `password: null`, then sets auth cookies (same as login). The endpoint returns 404 in `production` and `stage`.
- Helper: `e2e/utils/api/provision-google-user.ts` (`provisionGoogleBusinessUser(page)` via browser `fetch` to `E2E_API_URL` / `API_URL`).
- UI selectors: `profile-password-set-section`, `profile-password-change-section`, `profile-password-new-input`, `profile-password-current-input`, `profile-password-set-hint`.
- Covers initial password set (save enabled, `POST /api/auth/change-password`, UI switches to change-password) and login with phone + new password after logout.

## Viewport priority (mobile first)

- **Priority:** automate and stabilize flows on **mobile** first, then **desktop**.
- **Coverage:** every spec in `e2e/specs` runs on **both** viewports (no separate `mobile-*.spec.ts` smoke files unless documenting a one-off experiment).
- **Mobile viewport:** `390×844` (`e2e/constants/viewport.ts`); Playwright project uses `Pixel 7` device profile (touch enabled).
- **Desktop viewport:** `Desktop Chrome` profile from Playwright.
- **Layout breakpoint:** app mobile sheets match `max-width: 767px` (`BottomSheet`, `MobileSelectField`, mobile search filters).

### Mobile vs desktop UI differences

| Area | Desktop (`md+`) | Mobile (`≤767px`) |
| --- | --- | --- |
| Search filters (brand, price, …) | Inline controls in tabs | `FilterRow` opens bottom sheets (`MobileVehicleSection`) |
| Search vehicle type / tabs | Same top bar | Same top bar (still visible) |
| Listing create selects | `Dropdown` menu | `MobileSelectField` bottom sheet; year uses scroll picker + **OK** |
| Modals (save filter, AI report) | `Modal` | `Modal` (unchanged) |

Page objects must absorb these differences (`ListingCreatePage.pickDropdownOption`, `BottomSheetComponent`, `pageUsesMobileLayout`).

## Playwright projects

`playwright.config.ts` defines **two** Chromium projects (mobile listed first, then desktop):

| Project | Viewport | Specs |
| --- | --- | --- |
| **`mobile`** | `Pixel 7` | All specs except `search-filters-desktop.spec.ts` (`testIgnore` on the mobile project) |
| **`desktop`** | `Desktop Chrome` | All specs except `search-filters-mobile.spec.ts` (`testIgnore` on the desktop project) |

**Viewport-only specs** are scoped in `playwright.config.ts` with per-project `testIgnore` (not in-spec `test.skip`): `search-filters-mobile.spec.ts` runs on mobile only; `search-filters-desktop.spec.ts` runs on desktop only. All other specs run on both viewports.

Specs that mutate shared E2E admin data (favorites, saved-filters, smart-selection, listing-detail-actions, sync-favorites-cross-tab, listing-create, my-listings, listing-view, search-filters, promotion) rely on isolated flows or cleanup helpers; run the full suite locally before release when changing those areas.

Run a subset explicitly:

```bash
npx playwright test --project=mobile
npx playwright test --project=desktop
```

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
   - Page objects should be injected through fixtures instead of `new` in every spec (except rare multi-page-context cases such as cross-tab scenarios).
4. **Visibility gate before interaction**
   - The test must call page `expectPageView()` before any interaction on that page.
5. **Browser reset is a step, not a hook**
   - Do not perform navigation, storage clearing, or cookie consent dismissal inside `beforeEach` hooks.
   - Use `prependClearBrowserState` from `e2e/utils/steps.ts` as the first steps in a scenario, executed inside `test(...)`.
6. **No locator literals inside test bodies**
   - Locator values must come from page object/component APIs.
   - Keep locator definitions in the related page object/component file, not in separate shared constants files.
7. **Reusable flow utilities**
   - Repeated cross-spec flows (auth, listing navigation, common checks) must live in `e2e/utils` or page objects.
8. **Step-based execution style**
   - Use explicit `test.step(...)` for meaningful user actions and validations.
   - For multi-step flows, group steps in arrays and execute via shared helper (`e2e/utils/steps.ts`).
9. **Describe/test structure**
   - Keep one feature per `describe` block and use clear scenario names in `test(...)`.
   - Keep assertion and action names readable in Playwright report output.
10. **Test-data factories**

- Reusable runtime scenario data should live in `e2e/test-data`.
- Specs should consume factory helpers instead of duplicating generation logic.

## Step typing

- Shared step shape: `E2EStep` in `e2e/types/e2e-step.ts` (re-exported from `e2e/utils/steps.ts`).

## Selector policy

- Primary selector strategy: `data-testid`.
- Add `data-testid` only when a real E2E scenario needs a stable selector.
- Do not add test IDs proactively to every element or as a blanket refactor.
- Add or update test IDs in the same task where the E2E flow is implemented or stabilized.

### When to add `data-testid`

- Add it when role/text/structure-based locators are unstable for a required E2E action or assertion.
- Add it when the element is business-critical in a tested flow (submit action, route guard trigger, verification block, result item).
- Skip it when existing semantic locators are already stable and readable.

### Naming format

- Use kebab-case.
- Use semantic flow-oriented names: `{feature}-{area}-{element}`.
- Keep names stable over styling/layout refactors.

Examples:

- `listing-create-brand-select`
- `auth-login-submit`
- `listing-detail-copy-link`

### Dynamic collections and generated IDs

Use deterministic suffixes for repeated elements:

- Entity-based: `listing-card-${id}`
- Key-based: `listing-form-equipment-${key}`
- Index-based: `verify-phone-code-input-${index}`

For prefix matching in tests, use:

- `page.locator('[data-testid^="listing-card-link-"]')`

### Dropdown convention

For dropdowns with a base ID (`testId`):

- Trigger: `${testId}`
- Menu: `${testId}-menu`
- Option: `${testId}-option-${index}`

This keeps page-object helpers generic and reusable.

### React prop convention

- In component APIs use `dataTestId` (camelCase prop name).
- In rendered HTML it must be `data-testid` (DOM attribute).

### Selector ownership in E2E code

- Keep selector values in the page object or component object that owns the interaction.
- Store them in a local `testIds` object (`as const`) inside that object.
- Do not introduce shared global constants files for test IDs.

Example (`ListingCreatePage` pattern):

```ts
private readonly testIds = {
  page: 'listing-create-page',
  submitButton: 'listing-create-submit',
  brandSelect: 'listing-create-brand-select',
} as const;
```

Example (dynamic option selection):

```ts
await page.getByTestId(testId).click();
await page.locator(`[data-testid^="${testId}-option-"]`).first().click();
```

### Playwright locator API usage

- Prefer `getByTestId(...)` for exact element targeting.
- Use prefix locators only for intentional dynamic groups.
- Keep raw locator strings out of spec bodies; expose actions through page/component APIs.

## Reliability rules

- Tests must be isolated and independent.
- Avoid hard sleeps.
- Use explicit URL and visibility assertions after each meaningful navigation step.
- Keep assertions deterministic and language-independent.
- Use Allure as the source of truth for E2E run reports.

## End-to-end flow completeness

A spec must cover the user-visible outcome of the feature, not only an intermediate API or list state.

- **Saved filters / smart selection:** after create or wizard submit, click the saved filter card, assert navigation to search home (`/`), URL query params match the saved `filters` payload, and results grid or empty state is visible.
- **Favorites:** after toggle on listing detail, open favorites tab, assert the card, then open listing detail again from that card. `FavoritesPage.expectListingCardVisible` polls with reload until `GET /api/favorites` returns the card (shared account + parallel guest projects can delay list hydration).
- **AI listing report:** guest redirect with `openAiReport` intent; authenticated flow waits for terminal modal state and, when `ready`, asserts report content (not only loading/unavailable shells).
- **Compare / listing actions:** add-to-compare on detail must reach compare page with table visible, not only empty-state tabs.
- **Search filters (mobile):** all vehicle tabs (`basic`, `advanced`, `equipment`, `popular`); each mobile bottom sheet opens, offers options, confirms with OK, and sets `data-has-selection` on the filter row; separate spec submits with a changed filter and waits for `GET /api/listings`. See `search-filters-mobile.spec.ts`.
- **Listing sort:** on home, `selectSort` updates UI only until `submitSearch()`; assert URL `sortBy`/`sortOrder` and listings response after submit. On seller board, sort updates URL and refetches immediately. See `listing-sort.spec.ts`, `e2e/test-data/listing-sort.ts`, `BoardPage`.

Prefer parsing create/save API responses for `id` and `filters` when asserting apply-on-home, so expander or backend relaxations stay aligned with what the UI applies.

## Allure defaults

- `e2e/fixtures/base.ts` applies an automatic Allure `layer` label (`e2e-ui`) for every test via an auto fixture.

## P0 smoke scope

P0 is the minimum E2E subset that protects release readiness for the primary marketplace flow. P0 scenarios run on **both** mobile and desktop projects when tagged.

- Search home page opens and filter interactions work for core vehicle types (`search-filters.spec.ts` @p0).
- Listing detail page opens from search results and key detail blocks are visible.
- Login flow is stable for valid credentials and unauthenticated access stays guarded.
- Registration flow reaches home through `verify-phone` and `complete-profile`.
- Listing creation flow covers guest guard and successful authenticated publish.

Tag P0 scenarios with `@p0` in the `test.describe` title. Run `npm run test:e2e:p0` to execute only tagged tests (all viewport projects that match the grep).

All other end-to-end checks are considered non-P0 coverage and can run in the full suite.

## Current implementation status

Current suite is aligned with this standard:

- Shared fixtures: `e2e/fixtures/base.ts` (page objects + Allure auto layer)
- Browser reset helper: `e2e/utils/session.ts` (no `beforeEach` UI hooks)
- Shared step runner: `e2e/utils/steps.ts` (`prependClearBrowserState`, `runSteps`); `clearBrowserState` restores default locale cookies (`ro`) before navigating home so i18n does not leave a duplicate hidden search form in the DOM
- Search form locators: `e2e/utils/search-filters-form.ts` (`visibleSearchFiltersForm` — scopes to `[data-testid="search-filters-form"]:visible`)
- API helpers: `e2e/utils/api/auth.ts`, `e2e/utils/api/check-phone.ts`, `e2e/utils/api/listing-actions.ts`, `e2e/utils/api/saved-filters.ts`, `e2e/utils/api/wait-favorite-api.ts`
- Shared auth/listing helpers: `e2e/utils/auth.ts`, `e2e/utils/listings.ts`, `e2e/utils/listing-flow.ts`
- API origin + locale cookies: `e2e/utils/api-origin.ts`, `e2e/utils/e2e-locale.ts`
- URL assertions: `e2e/utils/app-path.ts` `pathnameWithoutLocalePrefix()` strips only configured URL locale prefixes (e.g. `ru`), not arbitrary two-letter path segments (so `/listings/...` is not mangled).
- Saved filters quota: `e2e/utils/api/saved-filters.ts` `deleteAllSavedFiltersForSession` (used by `saved-filters.spec.ts` so `POST /api/saved-filters` does not hit the per-user cap during repeated local runs)
- Shared test-data factories: `e2e/test-data/auth.ts`, `e2e/test-data/search-filter-sheets.ts` (mobile sheet matrix for vehicle search), `e2e/test-data/listing-sort.ts` (sort option index for `search-sort-select`)
- Shared component objects:
  - `components/auth/register-form.component.ts`
  - `components/auth/verify-phone-form.component.ts`
  - `components/profile/complete-profile-form.component.ts`
  - `components/listing/listing-ai-report-modal.component.ts`
  - `components/common/bottom-sheet.component.ts`
  - `components/layout/header-nav.component.ts`
  - `LanguageSwitcherPage`
- Required page objects with `expectPageView()`:
  - `SignPage`
  - `VerifyPhonePage`
  - `CompleteProfilePage`
  - `SearchHomePage` (`selectSort`, `selectSortAndApply`, `submitSearch`)
  - `BoardPage` (seller board sort, immediate URL apply)
  - `ListingDetailPage`
  - `ListingCreatePage`
  - `MyListingsPage`
  - `FavoritesPage`
  - `ComparePage`
  - `ProfilePage`
  - `AdminPage`
  - `SmartSelectionPage`
