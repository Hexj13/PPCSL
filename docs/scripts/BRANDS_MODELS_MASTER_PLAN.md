# Brands and Models — Master Plan (Implementation Spec)

Single actionable document derived from BRANDS_MODELS_CHANGES, CHINA_BRANDS_CHECK, GERMANY_BRANDS_CHECK, ITALY_BRANDS_CHECK, and JAPAN_BRANDS_CHECK. Use this for implementation; keep vehicle categories correct and avoid brand name inside model names.

**Affected code:** `core/backend/src/scripts/stage/`, `core/backend/src/scripts/production/`, `core/backend/src/scripts/data/vehicle-classification.ts`.

---

## Execution model: scripts only

All changes to brands and models are applied **only by running scripts**. No manual SQL or one-off DB edits.

1. **Source of truth** — Script files (e.g. `add-brands.ts`, `add-truck-brands-models.ts`, `add-japanese-brands-models.ts`) and `vehicle-classification.ts`. Edit these files so they contain the target data (splits, renames, short model names, new brands).
2. **Apply to DB** — Run the corresponding npm scripts; they create/update brands and models. For renames or splits that cannot be done by "add if missing" alone (e.g. moving models from Great Wall to Haval/Tank, or renaming existing truck/moto model names in DB), implement **dedicated scripts** (e.g. `apply-brand-splits.ts`, `fix-truck-model-names.ts`, `fix-moto-model-names.ts`) that perform the required UPDATEs/moves, and run them as part of the flow.
3. **Stage** — Run individual scripts from `core/backend` (e.g. `npm run add-brands`, `npm run add-truck-brands`, etc.) or the full sequence; use `COUNTRY=md` when required by script-guard.
4. **Production** — Use **one unifying script** that runs all brand/model scripts in order, then **clears cache**, then **checks duplicates** (and optionally runs remove-duplicates). See section "Production: unifying script" below.

Keep **stage** and **production** script logic and data in sync (e.g. `add-truck-brands-models.ts` in both folders).

---

## Production: unifying script

For production, a **single entry point** must:

1. Run all brand/model scripts in the **correct order** (base brands → regional → trucks → moto → any new "fix" or "apply" scripts).
2. At the end, **clear brands-related cache** (e.g. `CACHE_PREFIXES.brands`, `CACHE_PREFIXES.brandsModels`).
3. At the end, **check for duplicates** (brands with same name, models with same name within one brand).
4. Optionally run **remove-duplicates** (e.g. with `--auto-remove-duplicates`) if duplicates were found, then clear cache again if needed.

**Existing implementation:** `core/backend/src/scripts/production/seed-all-brands-complete.ts` already:

- Runs a fixed list of npm scripts (add-brands, add-italian-models, add-american-models, add-german-models, add-japanese-models, add-french-models, add-commercial-models, add-grand, add-historical, add-missing-car-brands:prod, add-truck-brands:prod, add-moto-brands:prod).
- After all scripts: runs in-process duplicate check (`checkDuplicates()`).
- If duplicates found: can run `remove-duplicates:prod` when invoked with `--auto-remove-duplicates`.
- Then clears Redis cache for brands and brandsModels.
- Then destroys DB connection.

**What to do:**

- **Option A:** Keep using `seed-all-brands-complete.ts`. After implementing the Master Plan, ensure the **data** in the scripts it runs (add-brands, add-truck-brands-models, vehicle-classification, etc.) reflects all splits, renames, and new brands. If new **dedicated** scripts are added (e.g. `apply-brand-splits.ts`, `fix-truck-model-names.ts`, `fix-moto-model-names.ts`), **add them to the `allScripts` array** in `seed-all-brands-complete.ts` in the right order (e.g. apply splits after base brands, fix model names after truck/moto scripts).
- **Option B:** Add a new production script `seed-brands-master-plan.ts` that runs the same sequence plus any new "apply"/"fix" scripts, then clear cache, then duplicate check, then optional remove-duplicates. Use it instead of (or in addition to) `seed-all-brands-complete` for the post–Master Plan flow.

**Command (current):**

```bash
cd core/backend
npm run seed:all-brands:complete:prod
# optional: npm run seed:all-brands:complete:prod -- --auto-remove-duplicates
# optional: npm run seed:all-brands:complete:prod -- --skip-heavy
# optional: npm run seed:all-brands:complete:prod -- --skip-duplicates
```

After adding new scripts to the sequence, the same command will run them; no separate "cache clear" or "duplicate check" step is needed outside this script.

---

**Scripts to create or edit (summary):**

| Action                                                           | Type               | Script(s)                                                                                                                           |
| ---------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Remove Ram Trucks (cars), Dodge Ram from Dodge, merge Ram (cars) | Edit data          | add-brands.ts, add-american-brands-models.ts, add-commercial-models.ts, vehicle-classification.ts                                   |
| Remove Dodge Trucks (trucks), add Ram (trucks)                   | Edit data          | add-truck-brands-models.ts (stage + production), vehicle-classification.ts, check-all-countries-brands.ts                           |
| Great Wall → Haval, Tank, Great Wall                             | Edit data + script | add-brands.ts, vehicle-classification.ts, add-historical-models.ts, cleanup-brands.ts; apply-brand-splits.ts (DB move)              |
| Land Rover → Range Rover                                         | Edit data + script | add-brands.ts, vehicle-classification.ts, add-historical-models.ts, cleanup-brands.ts, seed-vehicles-full.ts; apply-brand-splits.ts |
| Truck model names (Belarus, BelAZ, GAZ, Kamaz, MAZ, Ural)        | Edit data + script | add-truck-brands-models.ts (short names); fix-truck-model-names.ts (UPDATE existing rows)                                           |
| Moto model names (12 brands)                                     | Edit data + script | vehicle-classification.ts (short names); fix-moto-model-names.ts (UPDATE existing rows)                                             |
| China: Maextro, Yangwang, Xiaomi YU7                             | Edit data          | add-missing-car-brands.ts (or add-brands), vehicle-classification.ts                                                                |
| Empty brands check                                               | New script         | check-empty-brands:prod (check-empty-brands.ts)                                                                                     |

**Order in unifying script (production):**

1. Base and regional brand scripts (add-brands … add-historical); 2) add-missing-car-brands:prod; 3) add-truck-brands:prod; 4) add-moto-brands:prod; 5) apply-brand-splits:prod, fix-truck-model-names:prod, fix-moto-model-names:prod; 6) duplicate check; 7) optional remove-duplicates:prod; 8) clear cache (brands + brandsModels). Run check-empty-brands:prod separately if needed.

---

## Rules (must follow during implementation)

1. **Vehicle type (category)**  
   Each brand has `vehicle_types`: `car`, `truck`, or `moto`. Each model has `vehicle_type`. Do not assign car models to truck-only brands or vice versa. When adding a brand, set the correct type from the first model or from context (e.g. Fuso = truck, Yamaha in our data = moto).

2. **No brand name inside model name**  
   Model name must be **only the model designation**, not "BrandName ModelName".
   - Correct: brand **Haval**, model **H6**. Incorrect: brand Haval, model "Haval H6".
   - Correct: brand **BelAZ**, model **7530**. Incorrect: brand BelAZ, model "BelAZ-7530".  
     When adding new brands or models, always use short model names (no brand prefix/suffix).

3. **Single source of truth**  
   For each brand, one script (or vehicle-classification) should define the canonical list; other scripts (add-brands, add-missing-car-brands, cleanup-brands, historical, seed-vehicles-full) must stay aligned so that re-seeding does not recreate wrong or duplicate data.

---

## 1. REMOVE (delete or stop creating)

| Action                                      | What                                                                                                                          | Where / Notes                                                                                                                                                                                                                                   |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Remove **Ram Trucks** as a **car** brand    | Merge into **Ram** (cars); do not have two car brands "Ram" and "Ram Trucks".                                                 | add-brands.ts: delete block for "Ram Trucks". add-american-brands-models.ts, add-commercial-models.ts, vehicle-classification.ts: ensure only "Ram" exists for cars.                                                                            |
| Remove **Dodge Trucks** as truck brand      | All its models are Ram; move to brand **Ram** (trucks). Remove "Dodge Trucks" from truck scripts and from country check list. | add-truck-brands-models.ts (stage + production): remove "Dodge Trucks" block. check-all-countries-brands.ts: replace or remove "Dodge Trucks" for USA. vehicle-classification.ts: remove Dodge Trucks from truck list if present.               |
| Remove **Ram** models from **Dodge** (cars) | So that Dodge (cars) has only passenger/SUV models.                                                                           | add-brands.ts, add-american-brands-models.ts, add-commercial-models.ts, vehicle-classification.ts, seed-vehicles-full.ts, add-missing-car-brands (if any): in Dodge car list delete Ram, Ram 1500, Ram 2500, Ram 3500, Ramcharger, Ram 50, etc. |
| (Optional) Remove empty brands              | After all changes, any brand with zero models should be removed or filled.                                                    | Implement check-empty-brands.ts (or extend check-models-stats); then delete or add models.                                                                                                                                                      |

---

## 2. CHANGE / MOVE (splits, merges, renames)

### 2.1 Great Wall → Haval, Tank, Great Wall (cars)

- **Create** two new **car** brands: **Haval**, **Tank**.
- **Haval** (car): models **only model part** — e.g. H2, H3, H4, H5, H6, H7, H8, H9, Jolion, F7, F7x. No "Haval" in model name.
- **Tank** (car): models **only model part** — e.g. 300, 500, 700. No "Tank" in model name.
- **Great Wall** (car): keep only Wingle, Poer, Cannon (and variants like Wingle 5/6/7, Poer P12/P13, Cannon P/L/G). Remove all Haval* and Tank* models from Great Wall car list.
- **Great Wall** (truck): unchanged; still Wingle, Poer, Cannon, etc. in add-truck-brands-models. No Haval/Tank there.
- **Files:** add-brands.ts, vehicle-classification.ts, add-historical-models.ts, cleanup-brands.ts. Truck script: only Great Wall block for trucks, no Haval/Tank.
- **Script:** Implement a script (e.g. `apply-great-wall-split.ts` in stage + production) that: creates Haval and Tank brands (vehicle_types including car), creates models under them with short names, removes or reassigns Haval/Tank models from Great Wall. Run it after base/add-brands so that future runs of add-brands do not re-attach Haval/Tank to Great Wall (add-brands must already be updated to define Haval and Tank and to omit them from Great Wall).

### 2.2 Land Rover → Land Rover + Range Rover (cars)

- **Create** new **car** brand: **Range Rover**.
- **Land Rover** (car): keep only Defender, Discovery, Discovery Sport, Freelander (if applicable). Model names without "Land Rover" prefix.
- **Range Rover** (car): Range Rover, Range Rover Sport, Range Rover Velar, Range Rover Evoque, Range Rover Classic, Range Rover P38 (and similar). For brand "Range Rover", model names can stay "Range Rover", "Range Rover Sport", etc. (the word "Range Rover" is the product name).
- **Files:** add-brands.ts, vehicle-classification.ts, add-historical-models.ts, cleanup-brands.ts, seed-vehicles-full.ts.
- **Script:** Implement a script (e.g. `apply-land-rover-range-rover-split.ts`) that creates Range Rover brand and moves Range Rover models from Land Rover to Range Rover; or ensure add-brands (and other scripts) already define Range Rover and omit those models from Land Rover, then run add-brands so the DB state is correct.

### 2.3 Ram (cars): merge Ram + Ram Trucks + Dodge Ram models

- **Single car brand:** **Ram** (no "Ram Trucks" as separate car brand).
- **Models:** Full union of current Ram, Ram Trucks, and Dodge Ram-related models. Use **one** naming: either all short (1500, 2500, 3500, 4500, 5500, ProMaster, ProMaster City, 1500 Classic, etc.) or with "Ram" only where needed (e.g. "1500" not "Ram 1500" when brand is already Ram).
- **Dodge** (cars): remove all Ram / Ram 1500 / Ram 2500 / Ram 3500 / Ramcharger / Ram 50.
- **Files:** add-brands.ts, add-american-brands-models.ts, add-commercial-models.ts, vehicle-classification.ts. Verify no model is lost.

### 2.4 Ram (trucks): Dodge Trucks → Ram

- **Create or ensure** truck brand **Ram** (vehicle_types includes truck).
- **Models:** 1500, 2500, 3500, 4500, 5500, 6500, ProMaster, ProMaster City, ProMaster 1500, ProMaster 2500, ProMaster 3500 — **short names, no "Ram" prefix** (brand is Ram).
- **Remove** truck brand "Dodge Trucks" and move its models to Ram (trucks).
- **Files:** add-truck-brands-models.ts (stage + production), vehicle-classification.ts, check-all-countries-brands.ts.

---

## 3. FIX MODEL NAMES (remove brand from model string)

### 3.1 Trucks (category = truck)

Only the **model** part; no brand name prefix.

| Brand   | Current (example)                               | Target (example)                                                                                                       |
| ------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Belarus | Belarus-80, Belarus-82, Belarus-920, …          | 80, 82, 920, 952, 1025, 1221, 1523, 2022                                                                               |
| BelAZ   | BelAZ-7555, BelAZ-7530, …                       | 7555, 75710, 7513, 7530, 7540, 7547, 7548, 7549                                                                        |
| GAZ     | GAZ-3302, GAZ-3307, GAZon Next, GAZelle Next, … | 3302, 3307, 3308, …, GAZon Next, GAZelle Next, Sobol, Sobol Business (product names without "GAZ-" where it is prefix) |
| Kamaz   | KamAZ-4310, KamAZ-5320, …                       | 4310, 43118, 5320, 53605, 5490, 65115, 65117, 6520, …                                                                  |
| MAZ     | MAZ-6312, MAZ-5440, …                           | 6312, 5440, 6430, 5309, 5336, 5551, 4370, 4371                                                                         |
| Ural    | Ural-4320, Ural-6370, Ural Next, …              | 4320, 43206, 5323, 6370, 63685, Next, Next 4x4, Next 6x6, Next 8x8 (or keep "Ural Next" as product name)               |

**Files:** add-truck-brands-models.ts (stage + production), add-brands.ts (if these trucks appear), vehicle-classification.ts (if used). **Script:** Either (a) change the data in add-truck-brands-models to short names and implement a script (e.g. `fix-truck-model-names.ts`) that UPDATEs existing vehicle_models for these brands to the new names (to avoid leaving both "BelAZ-7530" and "7530" in DB), then run truck script + fix script; or (b) run truck script with short names and a separate script that removes/merges old model names. Prefer (a) so existing listings that reference old model names can be updated or mapped.

### 3.2 Moto (category = moto)

Only the **model** part; no brand name prefix.

| Brand       | Current (example)                                 | Target (example)                                                           |
| ----------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| Hualin      | Hualin 125, Hualin 150, Hualin 200                | 125, 150, 200                                                              |
| Maxon       | Maxon 125, Maxon 150, Maxon 200                   | 125, 150, 200                                                              |
| Maya Motors | Maya 125, Maya 150, Maya 200                      | 125, 150, 200                                                              |
| Moki        | Moki 125, Moki 150, Moki 200                      | 125, 150, 200                                                              |
| Motomax     | Motomax 125, Motomax 150, Motomax 200             | 125, 150, 200                                                              |
| Odes        | Odes 250, Odes 400, Odes 500, Odes 650L, Odes 700 | 250, 400, 500, 650L, 700                                                   |
| Orox        | Orox 250, Orox 400, Orox 500                      | 250, 400, 500                                                              |
| Sharmax     | Sharmax 125, Sharmax Cross 180 RX, …              | 125, 150, 200, Cross 180 RX, Hummer 320 RX LTD, GX-Cruiser 320, Force 1000 |
| Titan       | Titan 125, Titan 150, Titan 200                   | 125, 150, 200                                                              |
| Viper       | Viper 125, Viper 150, Viper 200, Viper 250        | 125, 150, 200, 250                                                         |
| Volta       | Volta 125, Volta 150, Volta 200                   | 125, 150, 200                                                              |
| Wolf Motors | Wolf 125, Wolf 150, Wolf 200                      | 125, 150, 200                                                              |

**Files:** vehicle-classification.ts only (MIXED_BRANDS, `moto` arrays). **Script:** Update vehicle-classification.ts to short names; then either re-run add-moto-brands (which creates/updates models from classification) and implement a script (e.g. `fix-moto-model-names.ts`) that UPDATEs existing moto model names for these 12 brands to the new short names, or ensure add-moto-brands uses classification and run it so DB gets short names. **Caution:** Viper and Titan exist as **car** models (Dodge Viper, Nissan Titan); change only the **moto** entries above.

---

## 4. ADD (new brands and models)

### 4.1 China — required (from CHINA_BRANDS_CHECK)

| What                   | Category | Model names (no brand inside)                           |
| ---------------------- | -------- | ------------------------------------------------------- |
| **Maextro**            | car      | S800 (and any other Maextro models; short names only)   |
| **Yangwang**           | car      | U8, U9 (and any other; short names only)                |
| **Xiaomi** — add model | car      | Add **YU7** to existing Xiaomi brand (already has SU7). |

**Files:** add-missing-car-brands.ts (or add-brands.ts / add-japanese or china-specific script if you prefer). vehicle-classification.ts: add Maextro, Yangwang with car arrays; add YU7 to Xiaomi car array.

### 4.2 China — optional (add only if needed for listings/search)

- Wey (Great Wall), Arcfox, Stelato, Onvo, Firefly, Rising Auto, Fangchengbao, Deepal.
- Same rule: **car** category; model names **without** brand prefix.

### 4.3 Germany / Italy / Japan — optional

- No mandatory additions from GERMANY_BRANDS_CHECK, ITALY_BRANDS_CHECK, JAPAN_BRANDS_CHECK for core flows.
- If adding later (e.g. Ruf, Afeela, Nismo as model line under Nissan, Casalini, Pininfarina): always **car** or **truck** or **moto** as appropriate; model names without brand name inside.

---

## 5. COMPLETE / ALIGN (no structural change)

### 5.1 Acura, Lexus, Infiniti (cars)

- Ensure full model lists in one place (e.g. add-japanese-brands-models.ts) and align vehicle-classification.ts with that list so determineVehicleType and filters work. Add any missing current/historical models. No brand name inside model names.

### 5.2 Empty brands

- Add script (e.g. check-empty-brands.ts) or extend check-models-stats: list brands with zero models. After implementation, fix by either adding models or removing the brand so we do not have empty brands.

### 5.3 Sync and verification

- **Stage vs production:** add-truck-brands-models.ts and any other brand/model scripts must be identical in stage and production where they exist in both.
- **vehicle-classification.ts:** after all renames/splits/adds, ensure every new or moved brand has correct `car` / `truck` / `moto` arrays and that model strings do not contain the brand name.
- **fix-brand-duplicates:** if new brands (e.g. Haval, Tank, Range Rover, Maextro, Yangwang) could have duplicate slugs, ensure fix-brand-duplicates or normalization handles them.

---

## 6. Checklist before development

- [ ] All new or renamed **models** use **short names** (no "BrandName" inside model name).
- [ ] **Vehicle type** for each brand and model is correct (car / truck / moto).
- [ ] **Ram** (cars): one brand, full model list; **Ram Trucks** (cars) removed; **Dodge** (cars) has no Ram models.
- [ ] **Ram** (trucks): one brand, models from ex–Dodge Trucks with short names; **Dodge Trucks** removed.
- [ ] **Great Wall** (cars): only Wingle, Poer, Cannon; **Haval** and **Tank** are separate car brands with short model names.
- [ ] **Land Rover** (cars): only Defender, Discovery, etc.; **Range Rover** is separate car brand.
- [ ] Trucks: Belarus, BelAZ, GAZ, Kamaz, MAZ, Ural — model names without brand prefix.
- [ ] Moto: Hualin, Maxon, Maya, Moki, Motomax, Odes, Orox, Sharmax, Titan, Viper, Volta, Wolf Motors — model names without brand prefix (only in moto; do not change car Viper/Titan).
- [ ] China: Maextro (S800), Yangwang (U8, U9), Xiaomi (add YU7) added with correct category and short model names.
- [ ] Stage and production scripts updated together; vehicle-classification.ts updated; empty-brands check in place; cache cleared after changes.
- [ ] **Production:** One unifying script runs all brand/model scripts in order, then clears cache (brands + brandsModels), then checks duplicates; optional `--auto-remove-duplicates` runs remove-duplicates:prod. Use `seed-all-brands-complete.ts` and add any new scripts (apply-great-wall-split, fix-truck-model-names, etc.) to its `allScripts` array in the correct order.

This document is the single reference for implementation. Proceed to development using the sections above in order (remove → change/move → fix names → add → complete/align). All changes are applied via scripts; production uses one unifying script that runs the sequence, then clears cache and checks duplicates.
