---
title: Search title and URL
owner: platform
tags:
  - type/guide
  - domain/search
  - scope/core
  - status/active
---

# Search Page Title and URL Generation

> **Status:** Implemented. Code fixed, cleanup scripts created.
>
> **Remaining:** Run `fix-brand-duplicates.ts` on local DB and production.

## Overview

When selecting a brand and model in search filters:

1. URL is formed with `brand` and `model` parameters (slugs without diacritics)
2. Page title is formed with full names from database (with diacritics)

---

## Ideal Solution

### 1. Data Structure

**Database:**

- `brands` table: contains brands with full names (e.g., "Citroën", "Mercedes-Benz")
- `vehicle_models` table: contains models with full names (e.g., "C-Elysée", "ë-C4")
- Each model is linked to ONE brand via `brand_id`
- NO duplicate brands should exist (e.g., "Citroen" and "Citroën" should be ONE brand)

### 2. URL Generation (Frontend)

When selecting in UI:

```
Brand: Citroën (id: uuid-123)
Model: C-Elysée (id: uuid-456)
```

URL is formed from slugs (without diacritics):

```
/?brand=citroen&model=c-elysee
```

**createSlug function:**

```typescript
function createSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // decomposes diacritics
    .replace(/[\u0300-\u036f]/g, '') // removes diacritics
    .replace(/[^a-z0-9]+/g, '-') // replaces special chars with dash
    .replace(/^-+|-+$/g, ''); // removes leading/trailing dashes
}

createSlug('Citroën'); // → 'citroen'
createSlug('C-Elysée'); // → 'c-elysee'
createSlug('ë-C4'); // → 'e-c4'
```

### 3. URL Parsing and Title Generation (Backend)

**Input:**

- `brand=citroen` (slug from URL)
- `model=c-elysee` (slug from URL)

**Algorithm:**

1. **Find brand by slug:**

   ```typescript
   const brand = brands.find((b) => createSlug(b.name) === 'citroen');
   // Finds: { id: 'uuid-123', name: 'Citroën' }
   ```

2. **Load brand's models:**

   ```typescript
   const models = await getModelsByBrand(brand.id);
   // Returns: [{ name: 'C-Elysée' }, { name: 'C3' }, ...]
   ```

3. **Find model by slug:**

   ```typescript
   const model = models.find((m) => createSlug(m.name) === 'c-elysee');
   // Finds: { name: 'C-Elysée' }
   ```

4. **Generate title:**
   ```typescript
   const title = `${brand.name} ${model.name}`;
   // Result: "Citroën C-Elysée"
   ```

**Output:**

```json
{
  "title": "Citroën C-Elysée",
  "brandName": "Citroën",
  "modelNames": ["C-Elysée"]
}
```

### 4. Title Display (Frontend)

Frontend receives title from API and displays it:

```html
<title>Citroën C-Elysée | Kupito</title>
```

### 5. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                           FRONTEND                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User selects in UI:                                         │
│     Brand: Citroën (from dropdown, name from DB)                │
│     Model: C-Elysée (from dropdown, name from DB)               │
│                                                                  │
│  2. URL is formed:                                              │
│     createSlug('Citroën') → 'citroen'                           │
│     createSlug('C-Elysée') → 'c-elysee'                         │
│     URL: /?brand=citroen&model=c-elysee                         │
│                                                                  │
│  3. API request:                                                │
│     GET /api/brands/search-metadata?brand=citroen&model=c-elysee│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                           BACKEND                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  4. Parse slugs:                                                │
│     brandSlug = 'citroen'                                       │
│     modelSlug = 'c-elysee'                                      │
│                                                                  │
│  5. Find brand in DB:                                           │
│     SELECT * FROM brands                                        │
│     WHERE createSlug(name) = 'citroen'                          │
│     → { id: 'uuid-123', name: 'Citroën' }                       │
│                                                                  │
│  6. Load brand's models:                                        │
│     SELECT * FROM vehicle_models                                │
│     WHERE brand_id = 'uuid-123'                                 │
│     → [{ name: 'C-Elysée' }, { name: 'C3' }, ...]               │
│                                                                  │
│  7. Find model by slug:                                         │
│     models.find(m => createSlug(m.name) === 'c-elysee')         │
│     → { name: 'C-Elysée' }                                      │
│                                                                  │
│  8. Generate response:                                          │
│     { title: 'Citroën C-Elysée', brandName: 'Citroën', ... }    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                           FRONTEND                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  9. Receive response and display:                               │
│     <title>Citroën C-Elysée | Kupito</title>                    │
│                                                                  │
│     Dropdown shows the same:                                    │
│     Brand: Citroën                                              │
│     Model: C-Elysée                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Current Implementation and Problems

### Problem 1: Duplicate Brands in Database

**What exists:**
Two brands exist in database:

- `{ id: 'uuid-111', name: 'Citroen' }` ← without diacritics
- `{ id: 'uuid-222', name: 'Citroën' }` ← with diacritics

Models are linked to `uuid-222` (Citroën with diacritics).

**What happens:**

1. Search by slug `citroen`:
   - `'citroen'.toLowerCase() === 'citroen'` → finds "Citroen" (uuid-111)
   - Models for uuid-111 = [] (empty array)
   - Title: "Citroen" (without model)

2. Dropdown loads models by brand ID directly:
   - UI selects "Citroën" (uuid-222)
   - Models for uuid-222 = ["C-Elysée", "C3", ...]
   - Dropdown shows: "C-Elysée"

**Solution:**

- Merge duplicate brands in database
- Keep only one brand "Citroën" with correct name
- Reassign all models to this brand

### Problem 2: Brand Search Order

**Current code:**

```typescript
brands.find((b) => b.name.toLowerCase() === slug || createSlug(b.name) === slug);
```

**Problem:**
`find()` returns FIRST found element. When sorted alphabetically:

- "Citroen" < "Citroën" (by ASCII code)
- "Citroen" is found first (without models)

**Partial solution (already applied):**

```typescript
const bySlug = brands.find((b) => createSlug(b.name) === slug);
if (bySlug) return bySlug;
return brands.find((b) => b.name.toLowerCase() === slug);
```

Prioritize `createSlug()`, but this doesn't fully solve the problem since both brands produce the same slug.

### Problem 3: Fallback via slugToName

**When model is not found:**

```typescript
const fallbackModels = modelSlugs.map((s) => slugToName(s)).join(', ');
// slugToName('c-elysee') → 'C Elysee' (without diacritics!)
```

**Problem:**
Title becomes "Citroën C Elysee" instead of "Citroën C-Elysée"

**Solution:**
This fallback shouldn't trigger if DB data is correct.

### Problem 4: Redis Caching

**Problem:**

- Redis caches brand and model lists
- If DB data changed, cache may contain stale data

**Solution:**

- Clear cache after changing DB data
- Or wait for cache TTL to expire

---

## Found Problems in Scripts

### Problem 1: Inconsistent Brand Names in Scripts

| File                                         | Was        | Should Be  |
| -------------------------------------------- | ---------- | ---------- |
| `stage/add-truck-brands-models.ts:1291`      | `Citroen:` | `Citroën:` |
| `production/add-truck-brands-models.ts:1291` | `Citroen:` | `Citroën:` |
| `stage/seed-vehicles-full.ts:1253`           | `Mini:`    | `MINI:`    |

**Status:** ✅ Fixed

### Problem 2: remove-duplicates.ts Doesn't Handle Diacritics

Old code groups by `toLowerCase()`:

```typescript
const nameLower = brand.name.toLowerCase().trim();
// 'citroën' !== 'citroen' - duplicates NOT found!
```

Need to use normalize('NFD'):

```typescript
function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // removes diacritics
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}
// normalizeForComparison('Citroën') === normalizeForComparison('Citroen') // true
```

---

## Fix Plan

### Step 1: Fix Scripts ✅ Done

Files fixed:

- `core/backend/src/scripts/stage/add-truck-brands-models.ts`
- `core/backend/src/scripts/production/add-truck-brands-models.ts`
- `core/backend/src/scripts/stage/seed-vehicles-full.ts`
- `core/backend/src/scripts/stage/check-all-countries-brands.ts`

### Step 2: Fix Brand Search Logic ✅ Done

Files fixed:

- `core/backend/src/brands/brands.service.ts` - prioritize search by `createSlug(name)`
- `core/frontend/app/page.tsx` - same fix for frontend

### Step 3: Create Cleanup Scripts ✅ Done

Scripts created:

- `core/backend/src/scripts/stage/fix-brand-duplicates.ts`
- `core/backend/src/scripts/production/fix-brand-duplicates.ts`

### Step 4: Clean Up Duplicates in DB (locally) ⏳ Pending

```bash
cd core/backend
npx ts-node -r tsconfig-paths/register src/scripts/stage/fix-brand-duplicates.ts
```

Script automatically:

1. Finds duplicates considering diacritics (Citroen = Citroën)
2. Merges models and vehicles to correct brand
3. Deletes duplicate
4. Renames brand to correct name (Citroën)
5. **Clears Redis cache** (brands, models, search)

### Step 5: Verification

Check URL:

```
/?brand=citroen&model=c-elysee
```

Expected title: "Citroën C-Elysée"

---

### Step 6: For Production ⏳ Pending

**One script does everything:**

```bash
cd core/backend
NODE_ENV=production npx ts-node -r tsconfig-paths/register src/scripts/production/fix-brand-duplicates.ts
```

Script automatically:

1. ✅ Finds and merges brand duplicates
2. ✅ Moves models and vehicles
3. ✅ Deletes duplicates
4. ✅ Fixes names (Citroen → Citroën)
5. ✅ Clears Redis cache

**No manual SQL queries required!**

---

## Files to Change

### Backend

- `core/backend/src/brands/brands.service.ts` - search and title generation logic
- `core/backend/src/common/utils/slug.utils.ts` - slug utility functions

### Frontend

- `core/frontend/app/page.tsx` - `getTitleFromParams()` function (fallback)
- `core/frontend/lib/utils/utils.ts` - `createSlug()`, `slugToName()` functions (import via `@/lib/utils`)

### Cleanup Scripts

- Script needed for finding and merging brand duplicates

---

## Test Scenarios

| URL                                          | Expected Title                |
| -------------------------------------------- | ----------------------------- |
| `/?brand=citroen`                            | Citroën                       |
| `/?brand=citroen&model=c-elysee`             | Citroën C-Elysée              |
| `/?brand=citroen&model=e-c4`                 | Citroën ë-C4                  |
| `/?brand=bmw&model=x5`                       | BMW X5                        |
| `/?brand=mercedes-benz&model=e-class`        | Mercedes-Benz E-Class         |
| `/?brand=bmw,mercedes-benz&model=x5,e-class` | BMW X5, Mercedes-Benz E-Class |
