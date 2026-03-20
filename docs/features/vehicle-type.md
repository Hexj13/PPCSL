---
title: Vehicle type
owner: platform
tags:
  - type/guide
  - domain/search
  - scope/core
  - status/active
---

# Vehicle type switcher — documentation

## Overview

Vehicle type switching (car, truck, moto) for filtering listings on search and listing creation. The feature includes DB changes, scripts for data generation and sync, and UI components for search and create.

**Status:** Implemented — Backend and Frontend ready; classification updated: Minivan and Pickup are for `car`; `truck` includes legacy `Van` (normalized to `Minivan` for create/update/search) plus Truck/Bus/SemiTruck/Tractor/SpecialEquipment.

**Location:**

- ✅ Search form (`SearchFilters`), top section, above main filter tabs
- ✅ Listing creation form (`ListingForm`) — vehicle type switchers at the start of the form

## Feature summary

### Goal

Ensure correct filtering of listings by vehicle type (passenger car, truck, motorcycle) at all stages: search, listing creation, and result viewing.

### Vehicle type classification

#### 🚗 Passenger cars (`car`)

**License category: B**

Passenger cars include all vehicles that require a category B license, even when used for cargo:

- Passenger cars (sedans, hatchbacks, wagons, coupes, convertibles)
- Category B vans (passenger and cargo, e.g. Ford Transit, Mercedes Sprinter, Volkswagen Crafter, Iveco Daily, Renault Master)
- Category B pickups (e.g. Ford F-150, Toyota Hilux, Nissan Navara, Mitsubishi L200)
- Crossovers and SUVs
- Minivans
- Any other category B vehicles

**Important:**

- If a vehicle requires a category B license, it is classified as a passenger car regardless of actual use (cargo or passengers)
- Category B vans and pickups (e.g. Ford Transit, Mercedes Sprinter, Ford F-150) are passenger cars even when used for cargo

#### 🚛 Trucks (`truck`)

**License category: C and above**

Trucks include all vehicles that require a category C or higher license:

- **Semi trucks** (e.g. Mercedes Actros, Volvo FH, Scania R-Series)
- **Heavy trucks** (10+ ton capacity, e.g. Mercedes Arocs, Volvo FM, MAN TGS)
- **Buses** (passenger and coach, e.g. Mercedes, MAN, Scania, Volvo)
- **Tractors** (agricultural and industrial, e.g. John Deere, Case IH, New Holland)
- **Special equipment** (construction, road, municipal, e.g. Caterpillar, Komatsu, JCB)
- Any other category C, D, E vehicles

**Important:**

- Only vehicles requiring category C or higher are classified as trucks
- Category B vans and pickups (e.g. Ford Transit, Mercedes Sprinter, Ford F-150) are **NOT** trucks; they are passenger cars
- Light trucks up to 3.5 tons requiring category B are passenger cars

#### 🏍️ Motorcycles (`moto`)

**License category: A, A1, A2**

Motorcycles include all two-wheelers and quads:

- **Motorcycle categories**: sport, naked, touring, cruiser, adventure, enduro, cross
- **Mopeds and scooters**
- **ATVs** (four-wheel off-road)
- **Snowmobiles**
- Any other category A, A1, A2 vehicles

**Important:** All motorcycle types, including quads and snowmobiles, are in the moto category.

### Main requirements

1. **Database — Brands**
   - Add `vehicle_types` (array of vehicle types)
   - A brand can have multiple types (e.g. Mercedes — car and truck)
   - Types: `'car' | 'truck' | 'moto'`

2. **Database — Models (VehicleModel)**
   - Add required field `vehicle_type` (single type)
   - Each model has exactly one vehicle type
   - Types: `'car' | 'truck' | 'moto'`

3. **Data generation script**
   - Update `add-brands.ts` to set vehicle types
   - For brands: specify all types the brand belongs to
   - For models: specify one vehicle type per model

4. **Syncing existing data**
   - Add a script to sync existing brands and models
   - Do not wipe data; only add/update vehicle types
   - Migration must be safe and reversible

5. **Linter rule for required fields**
   - Add custom ESLint rule `require-vehicle-type`
   - Rule must require `vehicle_types` when creating a brand
   - Rule must require `vehicle_type` when creating a model
   - Linter must error when fields are missing
   - Prevents creating brands/models without vehicle types

6. **Listing creation**
   - ✅ **IMPLEMENTED**: Vehicle type switchers added to listing creation form
   - ✅ Selecting a type limits available brands and models
   - ✅ Only brands and models matching the selected type are shown
   - ✅ Vehicle type is chosen before brand and model (default: 'car')

7. **Homepage search**
   - ✅ Selecting vehicle type limits brands and models in filters
   - ✅ Only brands and models matching the type are shown

8. **Filter reset on type change**
   - ✅ Changing vehicle type on search resets all filters
   - ✅ Selected brands, models, body types and other params are cleared

9. **Search result filtering**
   - ✅ Selecting vehicle type filters listing results
   - ✅ Only listings with that vehicle type are shown
   - ✅ Synced with URL params (`?vehicleType=car`)

10. **DB analysis and optimization**
    - ✅ Current brand/model storage structure analyzed
    - ✅ Indexes added for queries (`vehicle_types`, `vehicle_type`, composite)
    - ✅ Query performance optimized

11. **Motorcycle data**
    - ✅ Script added for motorcycles and mopeds (`seed-motorcycles.ts`)
    - ✅ Motorcycle brands added (Yamaha, Honda, Kawasaki, Suzuki, Ducati, KTM, etc.)
    - ✅ Models added per brand
    - ✅ Quads, motorcycles and snowmobiles included

12. **Dynamic UI changes**
    - ✅ Vehicle type selection updates popular body type tiles
    - ✅ For moto, some fields hidden (doors, drive_type, CVT and Robot in transmission)
    - ✅ Dropdowns adapt to selected vehicle type

13. **Applying filtering**
    - Use vehicle type filtering on search page
    - Apply on other pages (catalog, favorites, etc.) in the future

## Current implementation

### UI components

#### Vehicle type switchers

Three icon switchers:

- 🚗 **Passenger** (`car`) — default
  - License: B
  - Includes: cars, minivans, pickups, crossovers, SUVs
  - Even when used for cargo, if license B is required
- 🚛 **Truck** (`truck`)
  - License: C and above
  - Includes: trucks, buses, tractors, special equipment
- 🏍️ **Motorcycle** (`moto`)
  - License: A, A1, A2
  - Includes: motorcycles, mopeds, scooters, quads, snowmobiles

**Visual states:**

- **Active icon**: White (`text-white`), green indicator below, background `bg-primary-500/5`
- **Inactive icon**: Gray (`text-gray-400`), no indicator
- **Hover**: Rounded top corners (`rounded-t-lg`), light background on hover

**Sizes:**

- Button height: `48px` (`h-12`)
- Icon size: `40px` (`w-10 h-10`)
- Icons flipped horizontally (`scale-x-[-1]`)

#### Animation

- Smooth green indicator transition (same as main tabs)
- Duration: `300ms` (`duration-300`)
- Easing: `ease-in-out`

### Responsive design

**Mobile and tablet (< lg):**

- Switchers are **above** main filter tabs
- Left alignment (`justify-start`)
- Horizontal scroll when overflow
- Fade effect on the right when scrollable

**Desktop (≥ lg):**

- Switchers are to the **right** of main tabs
- Right alignment (`lg:justify-end`)
- Absolute positioning (`lg:absolute lg:right-4`)
- Vertically centered relative to tabs

### Technical details

#### Components

**Icons** (`core/frontend/ui/icons.tsx`):

- `CarIcon` — passenger car icon
- `TruckIcon` — truck icon
- `MotoIcon` — motorcycle icon

**SVG files** (`core/frontend/public/icons/`):

- `car.svg`
- `truck.svg`
- `moto.svg`

**viewBox optimization:**

- Icons use an optimized `viewBox` matching the path size
- Allows large icons without overflowing the button
- Example: `viewBox="250 1150 1050 450"` instead of `viewBox="0 0 1536 2752"`

#### State Management

```typescript
const [vehicleType, setVehicleType] = useState<'car' | 'moto' | 'truck'>('car');
```

**Default**: `'car'` (passenger)

#### Active state indicator

```typescript
const [vehicleIndicatorStyle, setVehicleIndicatorStyle] = useState({ left: 0, width: 0 });
```

Position and width of the green indicator are computed from the active button.

#### Scroll Detection

```typescript
const [showVehicleFade, setShowVehicleFade] = useState(false);
```

Controls whether to show the fade effect on the right when horizontally scrollable.

### SearchFilters integration

**DOM structure:**

```tsx
<div className="mb-6 border-b border-primary-500/20 -mx-4 md:-mx-5 px-4 md:px-5 relative">
  {/* Vehicle type switchers */}
  <div ref={vehicleIconsContainerRef} className="flex justify-start lg:justify-end ...">
    {/* Icon buttons */}
  </div>

  {/* Main filter tabs */}
  <div ref={tabsContainerRef} className="relative flex gap-1 ...">
    {/* Tabs */}
  </div>
</div>
```

Search actions now include a live listing count preview. The count is recalculated from the current draft filters (before submitting), debounced on client input, and displayed next to sorting on desktop or above sorting on mobile. The preview request reads `meta.total` from `/api/listings` with `page=1` and `limit=1`, and uses the same URL-to-API parsing path as `ListingGrid` to keep displayed totals consistent with loaded results.

## Body types by vehicle category

### Body type classification

Body types are tied to vehicle categories. Not every body type applies to every category.

#### 🚗 Passenger cars (`car`)

Body types for category B:

- `Sedan`, `Hatchback`, `Wagon`, `SUV`, `Coupe`, `Convertible`
- `Minivan` (passenger and cargo category B; legacy alias: `Van`)
- `Pickup` (category B)

**Important:** Category B vans and pickups (e.g. Ford Transit, Mercedes Sprinter, Ford F-150, Toyota Hilux) are passenger cars even when used for cargo (represented by `Minivan` in `body_type`).

#### 🚛 Trucks (`truck`)

Body types for category C and above:

- `Van` (legacy alias for `Minivan`, kept for backward-compatible filters)
- `Truck` (heavy and light trucks, special equipment)
- `Bus`
- `SemiTruck`
- `Tractor` (agricultural and industrial)
- `SpecialEquipment`

**Important:**

- Category B vans and pickups (e.g. Ford Transit, Mercedes Sprinter) are passenger cars (represented by `Minivan` in `body_type`)
- Only category C+ vehicles are trucks
- Semi trucks and tractors have separate body types for clearer classification

#### 🏍️ Motorcycles (`moto`)

Body types for category A, A1, A2:

- `Naked`, `Sport`, `Touring`, `Cruiser`, `Adventure`, `Scooter`, `Enduro`, `Cross`

### Fields that depend on vehicle type

#### Fields to hide for motorcycles:

1. **Doors (`doors`)** — not applicable
2. **Drive type (`drive_type`)** — motorcycles are rear-wheel only

#### Fields to adapt:

1. **Transmission (`transmission`)**:
   - Moto: `['Manual', 'Automatic']` (no CVT or Robot)
   - Car: `['Manual', 'Automatic', 'CVT', 'Robot']`

2. **Body types (`body_types`)**:
   - Show only body types for the selected vehicle category
   - Use mapping `BODY_TYPES_BY_VEHICLE_TYPE`

3. **Equipment (`equipment`)**:
   - Each vehicle type has its own curated subset of equipment keys
   - Use `getEquipmentKeysByVehicleType()` from `vehicle-equipment.ts`
   - Truck equipment includes ADAS (adaptive cruise, lane assist, blind spot), airbags, multimedia (Android Auto, Apple CarPlay), premium cabin options (leather, massage, ventilated seats), and truck-specific items (retarder, tachograph, sleeper cab, AdBlue, hydraulic lift)
   - Car-only items excluded from trucks: auto parking, panoramic roof, sunroof, ISOFIX, electric trunk

## Database

### Current structure

**Brand:**

```typescript
@Entity('brands')
export class Brand {
  id: string;
  name: string;
  logoUrl: string;
  order: number;
  created_at: Date;
  models: VehicleModel[];
}
```

**VehicleModel:**

```typescript
@Entity('vehicle_models')
export class VehicleModel {
  id: string;
  name: string;
  brand_id: string;
  brand: Brand;
  order: number;
  created_at: Date;
}
```

**Vehicle (listing vehicle):**

```typescript
@Entity('vehicles')
export class Vehicle {
  id: string;
  brand_id: string;
  brand: Brand;
  model_id: string;
  model: VehicleModel;
  year: number;
  // ... other fields
}
```

### Required changes

#### 1. Add field to Brand

```typescript
@Entity('brands')
export class Brand {
  // ... existing fields

  @Column('simple-array', { nullable: true })
  vehicle_types: ('car' | 'truck' | 'moto')[];
}
```

**Details:**

- Type: string array (`simple-array`)
- Can be `null` (backward compatibility)
- Example values: `['car', 'truck']`, `['car']`, `['moto']`

#### 2. Add field to VehicleModel

```typescript
@Entity('vehicle_models')
export class VehicleModel {
  // ... existing fields

  @Column({
    type: 'enum',
    enum: ['car', 'truck', 'moto'],
    nullable: false, // Required
  })
  vehicle_type: 'car' | 'truck' | 'moto';
}
```

**Details:**

- Type: enum (one of three values)
- Required (`nullable: false`)
- Each model has exactly one vehicle type

#### 3. Database migration

**Generate migration:**

```bash
npm run migration:generate -- AddVehicleTypesToBrandsAndModels
```

**Migration steps:**

1. Add column `vehicle_types` to `brands` (nullable)
2. Add column `vehicle_type` to `vehicle_models` (nullable at first)
3. Populate via sync script
4. Set `vehicle_type` NOT NULL after population

### Indexes

**Recommended indexes:**

```typescript
// Fast brand lookup by vehicle type
@Index(['vehicle_types'])

// Fast model lookup by vehicle type
@Index(['vehicle_type'])

// Composite index for listing filtering
@Index(['brand_id', 'vehicle_type'])
```

## Scripts

### 1. Data generation script update

**File:** `core/backend/src/scripts/stage/add-brands.ts`

**Changes:**

- Add brand-to-vehicle-type mapping
- Add model-to-vehicle-type mapping
- Set `vehicle_types` when creating/updating brands
- Set `vehicle_type` when creating/updating models

**Example data structure:**

```typescript
const BRANDS_VEHICLE_TYPES: Record<string, ('car' | 'truck' | 'moto')[]> = {
  'Mercedes-Benz': ['car', 'truck'],
  BMW: ['car', 'moto'],
  Toyota: ['car', 'truck'],
  Honda: ['car', 'moto'],
  Yamaha: ['moto'],
  // ...
};

const MODELS_VEHICLE_TYPES: Record<string, 'car' | 'truck' | 'moto'> = {
  'Mercedes-Benz': {
    'C-Class': 'car',
    Sprinter: 'truck',
    // ...
  },
  // ...
};
```

### 2. Sync script for existing data

**File:** `core/backend/src/scripts/stage/sync-vehicle-types.ts` ✅ **CREATED**

**Behavior:**

- Read all existing brands and models from DB
- Determine vehicle type from name/context and license category
- Update records in DB
- Log changes
- Output update statistics

**Classification rules:**

- **Car (`car`)**: Default when not truck or moto
- **Truck (`truck`)**: Models with keywords (Actros, Sprinter, Transit, F-150, Master, T, C, K, D, Partner, Expert, etc.) or truck brands (MAN, Scania, DAF, Iveco, etc.)
- **Moto (`moto`)**: Motorcycle brands (Yamaha, Honda, Kawasaki, Suzuki, Ducati, KTM, Triumph, Harley-Davidson, etc.) or models with motorcycle keywords (YZF, CBR, Ninja, GSX, Panigale, etc.)

**Algorithm:**

1. Load all brands with their models
2. For each model without `vehicle_type`: check brand/model keywords, set type, update model
3. For each brand: collect unique types from models, update `vehicle_types`
4. Output statistics

**Usage:**

```bash
cd core/backend
COUNTRY=md npx ts-node src/scripts/stage/sync-vehicle-types.ts
```

### 3. Motorcycle data script

**File:** `core/backend/src/scripts/stage/add-motorcycles.ts`

**Behavior:**

- Add motorcycle brands (Yamaha, Honda, Kawasaki, Suzuki, Ducati, KTM, etc.)
- Add models per brand
- Set `vehicle_type: 'moto'` for all models
- Set `vehicle_types: ['moto']` for all brands
- Include motorcycles, mopeds, scooters, quads (ATV) and snowmobiles

**Data structure:**

```typescript
const MOTORCYCLE_BRANDS: Record<string, string[]> = {
  'Yamaha': ['YZF-R1', 'YZF-R6', 'MT-07', 'MT-09', 'Ténéré 700', ...],
  'Honda': ['CBR1000RR', 'CBR600RR', 'CB650R', 'Africa Twin', ...],
  'Kawasaki': ['Ninja ZX-10R', 'Ninja ZX-6R', 'Z900', 'Versys 650', ...],
  // Quads
  'Polaris': ['Sportsman', 'Ranger', 'RZR', ...],
  'Can-Am': ['Outlander', 'Renegade', 'Maverick', ...],
  // Snowmobiles
  'Ski-Doo': ['MXZ', 'Renegade', 'Summit', ...],
  'Arctic Cat': ['ZR', 'M', 'ProCross', ...],
  // ...
};
```

## Backend API

### BrandsService changes

**Get brands with filtering:**

```typescript
async findAll(vehicleType?: 'car' | 'truck' | 'moto'): Promise<Brand[]> {
  const query = this.brandRepository.createQueryBuilder('brand');

  if (vehicleType) {
    query.where('brand.vehicle_types @> ARRAY[:vehicleType]', { vehicleType });
  }

  return query.getMany();
}
```

**Get models with filtering:**

```typescript
async findModelsByBrand(
  brandId: string,
  vehicleType?: 'car' | 'truck' | 'moto'
): Promise<VehicleModel[]> {
  const query = this.modelRepository
    .createQueryBuilder('model')
    .where('model.brand_id = :brandId', { brandId });

  if (vehicleType) {
    query.andWhere('model.vehicle_type = :vehicleType', { vehicleType });
  }

  return query.getMany();
}
```

### ListingsService changes

**Filter listings by vehicle type:**

```typescript
async searchListings(filters: SearchFilters): Promise<Listing[]> {
  const query = this.listingRepository
    .createQueryBuilder('listing')
    .leftJoinAndSelect('listing.vehicle', 'vehicle')
    .leftJoinAndSelect('vehicle.model', 'model')
    .leftJoinAndSelect('vehicle.brand', 'brand');

  if (filters.vehicleType) {
    query.andWhere('model.vehicle_type = :vehicleType', {
      vehicleType: filters.vehicleType
    });
  }

  // ... other filters

  return query.getMany();
}
```

## Frontend

### Search (SearchFilters)

#### Current implementation

**Done:**

- ✅ Visual vehicle type switchers
- ✅ Active type state (default: passenger)
- ✅ Smooth switch animation
- ✅ Responsive layout (mobile/tablet/desktop)
- ✅ Horizontal scroll when overflow
- ✅ Fade effect on scroll
- ✅ URL param sync (`?vehicleType=car`)
- ✅ Restore state from URL on load
- ✅ Filter reset on vehicle type change
- ✅ Brand and model filtering by vehicle type
- ✅ Search result filtering by vehicle type
- ✅ Dynamic body types by category
- ✅ Conditional field hiding (doors, drive_type for moto)
- ✅ Transmission options (no CVT/Robot for moto)

**Features:**

**1. URL sync:** Vehicle type synced with `vehicleType`; 'car' removes param (default); other types add param.

**2. Restore from URL:** On load, type restored from URL; invalid/missing → default 'car'.

**3. Filter reset on switch:** On type change, all filters reset; URL updated.

**4. Brand/model filtering:** Brands loaded with vehicle type via API; models loaded for selected brand and type; `useBrandsAndModels(vehicleType)`.

**5. Body types by vehicle category:**

Data structure mapping body types to categories:

```typescript
export const BODY_TYPES_BY_VEHICLE_TYPE: Record<'car' | 'truck' | 'moto', BodyType[]> = {
  car: [
    'Sedan',
    'Hatchback',
    'Wagon',
    'SUV',
    'Coupe',
    'Convertible',
    'Minivan',
    'Pickup', // category B pickups
  ],
  truck: [
    'Van', // legacy alias for Minivan (backward-compatible filters)
    'Truck', // category C+ trucks
    'Bus',
    'SemiTruck',
    'Tractor',
    'SpecialEquipment',
  ],
  moto: ['Naked', 'Sport', 'Touring', 'Cruiser', 'Adventure', 'Scooter', 'Enduro', 'Cross'],
};
```

**6. Body type enum updates in DB:**

- ✅ Migration `1780000000000-AddMotorcycleAndBusBodyTypes.ts` for moto and bus body types
- ✅ Migration `1782000000000-AddSemiTruckAndTractorBodyTypes.ts` for semi trucks and tractors
- ✅ PostgreSQL enum `vehicles_body_type_enum` updated
- ✅ Constants in `core/backend/src/common/constants.ts` and `core/frontend/lib/constants.ts` updated

**7. Conditional fields by vehicle type:**

**Hide for moto:** `doors`, `drive_type` (moto is rear-wheel only).

**Adapt:** `transmission` — moto: Manual, Automatic only; `body_types` — show only for selected category.

```typescript
// Hide doors for motorcycles
{vehicleType !== 'moto' && (
  <Select
    label="…"
    options={doorOptions}
    // ...
  />
)}

// Hide drive type for motorcycles
{vehicleType !== 'moto' && (
  <Select
    label="…"
    options={driveTypeOptions}
    // ...
  />
)}

// Adapt transmission options
const transmissionOptions = vehicleType === 'moto'
  ? ['Manual', 'Automatic']
  : ['Manual', 'Automatic', 'CVT', 'Robot'];

// Filter body types by category
const bodyTypeOptions = BODY_TYPES_BY_VEHICLE_TYPE[vehicleType] || [];
```

### Listing creation

#### ✅ IMPLEMENTED

**Done:** Vehicle category is selected before brand and model on the listing creation page for correct classification.

#### Current implementation

**1. Vehicle type switchers:** Same components as search (CarIcon, TruckIcon, MotoIcon); at start of form; default 'car'; active type has green border and background.

**2. Brand/model limits:** Only brands for selected type loaded; only models for selected brand and type; brand/model reset on type change; `useBrandsAndModels(vehicleType)`.

**3. Conditional fields:** `doors` and `drive_type` hidden for moto; transmission options (no CVT/Robot for moto); body types filtered by category.

**4. Persistence:** Vehicle type stored via vehicle model; type derived from selected model.

## DB optimization

### Current structure

**Current indexes:**

- `brands`: `['order']`
- `vehicle_models`: `['brand_id']`, `['order']`
- `vehicles`: `['brand_id']`, `['model_id']`, `['brand_id', 'model_id']`, `['year']`, `['fuel']`, `['transmission']`, `['body_type']`, `['mileage_km']`, `['engine_displ_l']`

### Recommendations

**1. Add indexes for new fields:**

```sql
CREATE INDEX idx_brands_vehicle_types ON brands USING GIN(vehicle_types);
CREATE INDEX idx_vehicle_models_vehicle_type ON vehicle_models(vehicle_type);
CREATE INDEX idx_vehicle_models_brand_type ON vehicle_models(brand_id, vehicle_type);
```

**2. Composite indexes:**

```sql
-- Model lookup by brand and type
CREATE INDEX idx_models_brand_type ON vehicle_models(brand_id, vehicle_type);

-- Listing filtering
CREATE INDEX idx_vehicles_model_type ON vehicles(model_id)
  INCLUDE (vehicle_type) -- if supported
```

**3. Performance:** Run `EXPLAIN ANALYZE` on queries; optimize vehicle-type filtering; consider denormalizing `vehicle_type` onto `vehicles`.

## Files

### Components

- `core/frontend/components/search/SearchFilters.tsx` — main component with switchers
- `core/frontend/ui/icons.tsx` — icon components (CarIcon, TruckIcon, MotoIcon)
- `core/frontend/ui/index.ts` — icon exports

### Assets

- `core/frontend/public/icons/car.svg` — passenger car icon
- `core/frontend/public/icons/truck.svg` — truck icon
- `core/frontend/public/icons/moto.svg` — motorcycle icon

### Listing form (create/edit) — engine displacement and Electric fuel

When **Fuel = Electric**, the **Engine displacement** field is optional and disabled for all vehicle types (car, truck, moto). If the user had already entered a value and then selects Electric, the field is cleared so that no engine volume is sent to the API. The placeholder shows "—" when Electric is selected and "2.0" otherwise. On listing cards, the engine block is not shown when `engine_displ_l` is empty. Implementation: `SpecsGrid.tsx` (form), `useListingForm.ts` (validation), backend `CreateVehicleDto` has `engine_displ_l` as optional.

### Backend

- `core/backend/src/brands/entities/brand.entity.ts` — brand entity (`vehicle_types` added)
- `core/backend/src/brands/entities/vehicle-model.entity.ts` — model entity (`vehicle_type` added)
- `core/backend/src/brands/brands.service.ts` — brands service (filter by `vehicleType`)
- `core/backend/src/listings/listings.service.ts` — listings service (filtering and conditional logic)
- `core/backend/src/listings/dto/create-vehicle.dto.ts` — create vehicle DTO (`drive_type` optional, `engine_displ_l` optional when fuel is Electric)

### Scripts

- `core/backend/src/scripts/stage/add-brands.ts` — brand/model generation (uses `determineVehicleType` from `vehicle-classification.ts`)
- `core/backend/src/scripts/stage/sync-vehicle-types.ts` — sync types for existing data (uses `vehicle-classification.ts`)
- `core/backend/src/scripts/stage/audit-vehicle-types.ts` — audit and fix classification
- `core/backend/src/scripts/data/vehicle-classification.ts` — brand/model classification reference
- `core/backend/src/scripts/stage/seed.ts` — test data for cars only (`vehicle_type: 'car'`)
- `core/backend/src/scripts/stage/seed-trucks.ts` — 50 random truck listings
- `core/backend/src/scripts/stage/seed-motorcycles.ts` — 50 random moto listings

### Migrations

- `1779000000000-AddVehicleTypesToBrandsAndModels.ts`
- `1780000000000-AddMotorcycleAndBusBodyTypes.ts`
- `1782000000000-AddSemiTruckAndTractorBodyTypes.ts`

### Linter

- `core/backend/eslint-plugin-require-vehicle-type.cjs` — custom ESLint rule for required fields
- `core/backend/eslint.config.mjs` — enable the rule

## Styling

### Colors

- **Active icon**: `text-white`
- **Inactive icon**: `text-gray-400`
- **Indicator**: `bg-primary-400`
- **Hover background**: `bg-primary-500/5`

### Animation

- **Indicator**: `transition-all duration-300 ease-in-out`
- **Icon color**: `transition-colors duration-300`

### Responsive Breakpoints

- **Mobile/Tablet**: `< lg` (below 1024px)
- **Desktop**: `≥ lg` (1024px and up)

## Linter rules

### Required fields when creating entities

**Requirement:** Brands and models must have vehicle type when created.

**ESLint rule:** `require-vehicle-type`

**Checks:**

- `brandRepo.create()` / `brandRepository.create()` must include `vehicle_types` (array)
- `modelRepo.create()` / `modelRepository.create()` must include `vehicle_type` (string)

**Examples:**

```typescript
// ❌ Error: missing vehicle_types
const brand = brandRepo.create({
  name: 'Toyota',
  order: 1,
});

// ✅ Correct
const brand = brandRepo.create({
  name: 'Toyota',
  vehicle_types: ['car', 'truck'],
  order: 1,
});
```

```typescript
// ❌ Error: missing vehicle_type
const model = modelRepo.create({
  name: 'Camry',
  brand_id: brandId,
  order: 1,
});

// ✅ Correct
const model = modelRepo.create({
  name: 'Camry',
  brand_id: brandId,
  vehicle_type: 'car',
  order: 1,
});
```

**Implementation:** Custom rule in `eslint-plugin-require-vehicle-type.cjs`; enable in `eslint.config.mjs`.

## Usage examples

### Backend — get brands with filter

```typescript
const carBrands = await brandsService.findAll('car');
const motoBrands = await brandsService.findAll('moto');
```

### Backend — get models with filter

```typescript
const mercedesCarModels = await brandsService.findModelsByBrand(mercedesBrandId, 'car');
```

### Frontend — change vehicle type

```typescript
const handleVehicleTypeChange = (type: 'car' | 'truck' | 'moto') => {
  setVehicleType(type);
  resetAllFilters();
  updateURL({ vehicleType: type });
  refetchBrands(type);
  refetchListings({ vehicleType: type });
};
```

## Syncing existing data

### Vehicle type sync script

**Important:** Sync existing brands and models before using the new filtering.

Script `sync-vehicle-types.ts` sets vehicle types for all existing brands and models:

```bash
cd core/backend
COUNTRY=md npx ts-node src/scripts/stage/sync-vehicle-types.ts
```

**What it does:**

1. Finds brands without `vehicle_types` or with empty array
2. Finds models without `vehicle_type`
3. Sets type from model name (keywords), brand name (moto/truck brands), context
4. Updates `vehicle_type` on models
5. Updates `vehicle_types` on brands from their models
6. Outputs statistics

**Classification:** Car (default), Truck (keywords/brands), Moto (motorcycle brands/keywords).

**After sync:** All brands have `vehicle_types`, all models have `vehicle_type`; vehicle type filtering works.

## Test data generation

### Listing generation scripts

After syncing and populating brands/models with vehicle types, generate test listings:

#### Cars (50 listings)

```bash
cd core/backend
COUNTRY=md npx ts-node src/scripts/stage/seed.ts
```

**Note:** `seed.ts` now generates only cars (filters by `vehicle_type: 'car'`).

#### Trucks (50 listings)

```bash
cd core/backend
COUNTRY=md npx ts-node src/scripts/stage/seed-trucks.ts
```

**Truck params:** Engine 3.0–16.0 L, mileage 50k–800k km, price 15k–200k, body types Van/Truck/Bus/SemiTruck/Tractor/SpecialEquipment, uses `drive_type`, no `doors`. Category B vans/pickups are cars, not trucks (represented as `Minivan` in `body_type`, `Van` is normalized to `Minivan`).

#### Moto (50 listings)

```bash
cd core/backend
COUNTRY=md npx ts-node src/scripts/stage/seed-motorcycles.ts
```

**Moto params:** Engine 0.1–2.0 L, mileage 0–150k km, price 1k–50k, body types Naked/Sport/Touring/Cruiser/Adventure/Scooter/Enduro/Cross, no `drive_type` or `doors`.

### Execution order

1. **Run DB migrations** (new body types):

   ```bash
   cd core/backend
   COUNTRY=md NODE_ENV=stage npm run migration:run
   ```

2. **Sync existing data** (if DB already has brands/models):

   ```bash
   COUNTRY=md NODE_ENV=stage npx ts-node src/scripts/stage/sync-vehicle-types.ts --force
   ```

   This updates all models per `vehicle-classification.ts`.

3. **Audit classification** (optional):

   ```bash
   COUNTRY=md NODE_ENV=stage npx ts-node src/scripts/stage/audit-vehicle-types.ts
   ```

   To fix issues:

   ```bash
   COUNTRY=md NODE_ENV=stage npx ts-node src/scripts/stage/audit-vehicle-types.ts --fix
   ```

4. **Clear cache** (after sync):

   ```bash
   COUNTRY=md NODE_ENV=stage npx ts-node src/scripts/stage/clear-cache.ts
   ```

5. Run main seed for users and car listings:

   ```bash
   COUNTRY=md NODE_ENV=stage npx ts-node src/scripts/stage/seed.ts
   ```

6. Run truck seed (after adding truck brands/models):

   ```bash
   COUNTRY=md NODE_ENV=stage npx ts-node src/scripts/stage/seed-trucks.ts
   ```

7. Run moto seed (after adding moto brands/models):
   ```bash
   COUNTRY=md NODE_ENV=stage npx ts-node src/scripts/stage/seed-motorcycles.ts
   ```

**Important:** After reclassification/normalization (`Van` → `Minivan`; `Pickup` stays in `car`; `truck` keeps `Van` as a legacy alias for backward-compatible filters): run migration for new body types, run `1800000000000-ConvertVanBodyTypeToMinivan` (if upgrading an existing DB), run sync with `--force`, clear cache.

## Related docs

- [Architecture overview](../architecture/architecture-overview.md)
- [Frontend docs](../../frontend/docs/README.md)
- [Database schema](../architecture/technical.md)
- [Scripts](../../backend/docs/scripts.md)

---

[← Back to docs](../README.md)
