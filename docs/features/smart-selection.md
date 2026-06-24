---
title: Smart selection
owner: platform
tags:
  - type/guide
  - domain/search
  - scope/core
  - status/active
---

# Smart Selection

Guided questionnaire that creates a saved search filter for authenticated users.

**Status:** Implemented.

**Entry points:** frontend route `/smart-selection`, search form action `SearchFormActions`, backend endpoint `POST /api/smart-selection`.

---

## User Flow

1. User clicks **Smart selection** in the search form.
2. Guest users are redirected to sign in with return path `/smart-selection`.
3. Authenticated users answer a six-step questionnaire:
   - purpose, driving mode, budget, size/body type, transmission/fuel, year/mileage/priorities
4. The frontend posts the answers to `POST /api/smart-selection`.
5. The backend creates a saved filter and returns the saved filter entity.
6. The frontend clears the saved filters cache, shows a success toast, and redirects to `/favorites?tab=filters`.

The feature uses the same saved filter limit as manual filters: `MAX_SAVED_FILTERS` on the frontend and `SavedFiltersService` on the backend.

---

## API

```http
POST /api/smart-selection
```

Auth: `JwtAuthGuard` + `PhoneVerifiedGuard`.

Body:

- `purposes`: 1-3 values
- `drivingMode`: one value
- `budgetPreset`: one value
- `currency`: `EUR` or `MDL`
- `flexibleBudget`: optional boolean, default `false`
- `size`: one value
- `bodyTypes`: 1-4 values
- `transmission`: one value
- `fuels`: 1-4 values
- `yearPreset`: one value
- `mileagePreset`: one value
- `priorities`: 1-3 values

Response: saved filter entity.

Errors:

- `400` for validation errors or saved filter limit reached
- `401` for unauthenticated users

---

## Mapping Rules

The backend maps answers to a regular saved filter. The output always targets vehicle cars:

- `vehicleType = car`
- budget preset -> `price_lte`
- body type choices and usage context -> `body_types`
- fuel choices and usage context -> `fuels`
- transmission choice -> `transmissions`
- rural/off-road context -> `drive_types = AWD`
- year preset and freshness/reliability priorities -> `year_gte`
- mileage preset and low-mileage/reliability priorities -> `mileage_lte`
- comfort/safety/family/equipment priorities -> `equipment`

If the first filter is too narrow, the backend progressively relaxes it until it finds at least `MIN_SMART_SELECTION_RESULTS` listings or exhausts all expansion steps. Expansion can switch equipment matching to partial, widen budget by 10% when the user allowed flexible budget, relax mileage/year, drop equipment, and expand inferred body/fuel/transmission sets. Explicit user choices for body type, fuel, and strict transmission are preserved even when fewer than `MIN_SMART_SELECTION_RESULTS` listings remain.

---

## Files

| File | Role |
| --- | --- |
| `frontend/app/smart-selection/page.tsx` | Auth-gated page and breadcrumbs |
| `frontend/components/smart-selection/SmartSelectionWizard.tsx` | Questionnaire state and submit flow |
| `frontend/lib/smart-selection/types.ts` | Frontend answer enums and initial state |
| `frontend/lib/smart-selection/option-order.ts` | Context-aware option ordering |
| `frontend/lib/api/api-smart-selection.ts` | API client |
| `backend/src/smart-selection/smart-selection.controller.ts` | API controller |
| `backend/src/smart-selection/dto/create-smart-selection.dto.ts` | Request validation |
| `backend/src/smart-selection/application/create-smart-selection-filter.use-case.ts` | Orchestrates mapping, expansion, and saved filter creation |
| `backend/src/smart-selection/domain/smart-selection-mapper.ts` | Pure answer-to-filter mapping |
| `backend/src/smart-selection/domain/smart-selection-filter-expander.ts` | Result-count-based relaxation |

---

## Legal and Privacy

Smart Selection stores the resulting saved search filter in the existing saved filters system. No new third-party processor is introduced. Legal text already covers saved search filters, their retention, and deletion.

---

**Last updated:** 2026-06-24
