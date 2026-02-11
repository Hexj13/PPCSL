# Sitemap Generation

## Overview

The sitemap is generated dynamically as a valid XML file based on database data. It is used by search engines to discover and index site pages.

**Location:** `core/frontend/app/sitemap.xml/route.ts`
**Format:** XML (`Content-Type: application/xml`)
**URL:** `/sitemap.xml`
**Cache:** 1 hour (`Cache-Control: public, max-age=3600, s-maxage=3600`)

## What's Included

| Type | Included | Priority | changefreq | Notes |
|------|----------|----------|------------|-------|
| Static pages | Yes | 0.2–1.0 | daily/monthly | `/`, `/listings`, `/terms`, `/privacy`, `/faq`, `/cookie-settings` |
| Brand pages | Yes | 0.8 | daily | `/?brand=mercedes-benz` |
| Brand+Model pages | Yes | 0.7 | daily | `/?brand=mercedes-benz&model=c-class` |
| Body type pages (single) | Yes | 0.6 | weekly | `/?body_types=SUV` |
| Body type combinations | No | — | — | Removed to reduce sitemap bloat |
| Equipment filter pages | No | — | — | Not SEO-relevant |
| Individual listings | No | — | — | Indexed via internal links |

**Why no individual listings:** Listings are discovered by search engines through internal links on the site. Including them in the sitemap would require pagination and frequent updates.

**Why no body type combinations:** Previously, all 2^n subsets were generated (~157 URLs for popular types), most pointing to empty pages. Now only single body types are included (~22 URLs).

## URL Structure

### Static Pages

| URL | Priority | changefreq |
|-----|----------|------------|
| `/` | 1.0 | daily |
| `/listings` | 0.9 | daily |
| `/terms` | 0.3 | monthly |
| `/privacy` | 0.3 | monthly |
| `/faq` | 0.4 | monthly |
| `/cookie-settings` | 0.2 | monthly |

### Brand and Model URLs

#### vehicleType Rules

| Category | vehicleType param | Example URL |
|----------|-------------------|-------------|
| Cars (`car`) | Not added (default) | `/?brand=mercedes-benz` |
| Trucks (`truck`) | `&vehicleType=truck` | `/?brand=mercedes-benz&vehicleType=truck` |
| Motorcycles (`moto`) | `&vehicleType=moto` | `/?brand=yamaha&vehicleType=moto` |

#### Brand URL Examples

```
# Cars (vehicleType omitted)
https://kupito.club/?brand=mercedes-benz
https://kupito.club/?brand=bmw

# Trucks
https://kupito.club/?brand=mercedes-benz&vehicleType=truck
https://kupito.club/?brand=man&vehicleType=truck

# Motorcycles
https://kupito.club/?brand=yamaha&vehicleType=moto
https://kupito.club/?brand=ducati&vehicleType=moto
```

#### Model URL Examples

```
# Cars
https://kupito.club/?brand=mercedes-benz&model=c-class
https://kupito.club/?brand=bmw&model=3-series

# Trucks
https://kupito.club/?brand=mercedes-benz&model=actros&vehicleType=truck
https://kupito.club/?brand=man&model=tgx&vehicleType=truck

# Motorcycles
https://kupito.club/?brand=yamaha&model=yzf-r1&vehicleType=moto
https://kupito.club/?brand=ducati&model=panigale-v4&vehicleType=moto
```

### Body Type URLs

All body types from `BODY_TYPES_BY_VEHICLE_TYPE` are included as single entries:

#### Cars (no vehicleType param)
```
https://kupito.club/?body_types=Sedan
https://kupito.club/?body_types=Hatchback
https://kupito.club/?body_types=SUV
https://kupito.club/?body_types=Wagon
https://kupito.club/?body_types=Coupe
https://kupito.club/?body_types=Convertible
https://kupito.club/?body_types=Van
https://kupito.club/?body_types=Minivan
https://kupito.club/?body_types=Pickup
```

#### Trucks
```
https://kupito.club/?body_types=Truck&vehicleType=truck
https://kupito.club/?body_types=Bus&vehicleType=truck
https://kupito.club/?body_types=SemiTruck&vehicleType=truck
https://kupito.club/?body_types=Tractor&vehicleType=truck
https://kupito.club/?body_types=SpecialEquipment&vehicleType=truck
```

#### Motorcycles
```
https://kupito.club/?body_types=Naked&vehicleType=moto
https://kupito.club/?body_types=Sport&vehicleType=moto
https://kupito.club/?body_types=Touring&vehicleType=moto
https://kupito.club/?body_types=Cruiser&vehicleType=moto
https://kupito.club/?body_types=Adventure&vehicleType=moto
https://kupito.club/?body_types=Scooter&vehicleType=moto
https://kupito.club/?body_types=Enduro&vehicleType=moto
https://kupito.club/?body_types=Cross&vehicleType=moto
```

## XML Format

The sitemap generates standard XML with proper escaping:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://kupito.club</loc>
    <lastmod>2026-02-11T17:00:00.000Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://kupito.club/?brand=bmw&amp;model=3-series</loc>
    <lastmod>2026-02-11T17:00:00.000Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>
```

**Note:** `&` in URLs is escaped to `&amp;` as required by XML specification. The `escapeXml()` function handles this automatically.

## Data Sources

### `brands` table

```typescript
interface Brand {
  id: string;
  name: string;
  vehicle_types?: ('car' | 'truck' | 'moto')[];
}
```

`vehicle_types` is an array — a brand can belong to multiple categories (e.g., Mercedes-Benz: car + truck).

### `vehicle_models` table

```typescript
interface VehicleModel {
  id: string;
  name: string;
  brand_id: string;
  vehicle_type?: 'car' | 'truck' | 'moto';
}
```

`vehicle_type` is a single category. Each model belongs to exactly one category.

### API endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/brands` | GET | All brands with `vehicle_types` |
| `/api/brands/models/batch` | POST | Models by list of brand_ids |

## Generation Algorithm

### 1. Brand Classification

```typescript
const brandsByVehicleType = { car: [], truck: [], moto: [] };

allBrands.forEach((brand) => {
  const vehicleTypes = brand.vehicle_types || [];
  if (vehicleTypes.length === 0) {
    brandsByVehicleType.car.push(brand); // Default: cars
  } else {
    vehicleTypes.forEach((type) => {
      brandsByVehicleType[type].push(brand);
    });
  }
});
```

### 2. Brand URL Generation

```typescript
const vehicleTypeParam = vehicleType !== 'car' ? `&vehicleType=${vehicleType}` : '';
const brandUrl = `${siteUrl}/?brand=${brandSlug}${vehicleTypeParam}`;
```

### 3. Model vehicleType Resolution

```
model.vehicle_type exists and !== 'car'
    → use model.vehicle_type

else
    → use vehicleType from brand context (or empty for car)
```

## Multi-Category Brand Examples

### Mercedes-Benz (car + truck)

**DB data:**
```json
{ "name": "Mercedes-Benz", "vehicle_types": ["car", "truck"] }
```

**Models:**
```json
[
  { "name": "C-Class", "vehicle_type": "car" },
  { "name": "Actros", "vehicle_type": "truck" }
]
```

**Generated URLs:**
```
/?brand=mercedes-benz
/?brand=mercedes-benz&model=c-class
/?brand=mercedes-benz&vehicleType=truck
/?brand=mercedes-benz&model=actros&vehicleType=truck
```

### BMW (car + moto)

**Generated URLs:**
```
/?brand=bmw
/?brand=bmw&model=3-series
/?brand=bmw&vehicleType=moto
/?brand=bmw&model=s-1000-rr&vehicleType=moto
```

## Search Form Integration

When navigating to a sitemap URL, the search form should:

1. Detect vehicle category from `vehicleType` parameter
2. Switch to the correct tab (cars/trucks/motorcycles)
3. Set the selected brand
4. Set the selected model (if specified)
5. Set body types (if specified)
6. Load relevant results

### Testing Checklist

| URL | Expected Behavior |
|-----|-------------------|
| `/?brand=mercedes-benz` | "Cars" tab, Mercedes-Benz selected |
| `/?brand=mercedes-benz&model=c-class` | "Cars" tab, brand + model selected |
| `/?brand=mercedes-benz&vehicleType=truck` | "Trucks" tab, Mercedes-Benz selected |
| `/?brand=yamaha&vehicleType=moto` | "Moto" tab, Yamaha selected |
| `/?body_types=Truck&vehicleType=truck` | "Trucks" tab, Truck body type selected |
| `/?body_types=Naked,Sport&vehicleType=moto` | "Moto" tab, Naked and Sport selected |

## Troubleshooting

### Brand missing vehicleType in URL

**Cause:** `brand.vehicle_types` not populated in DB

**Fix:**
```bash
cd core/backend
COUNTRY=md npx ts-node -r tsconfig-paths/register src/scripts/stage/sync-vehicle-types.ts
```

### Model with wrong vehicleType

**Cause:** `model.vehicle_type` not set or incorrect

**Fix:**
```bash
COUNTRY=md npx ts-node -r tsconfig-paths/register src/scripts/stage/audit-vehicle-types.ts --fix
```

## Related Files

| File | Description |
|------|-------------|
| `core/frontend/app/sitemap.xml/route.ts` | XML sitemap generation |
| `core/frontend/app/robots.ts` | robots.txt generation |
| `core/frontend/lib/api/server-api.ts` | Server-side API for brands/models |
| `core/frontend/lib/api/api.ts` | Brand, VehicleModel types |
| `core/frontend/lib/constants.ts` | `BODY_TYPES_BY_VEHICLE_TYPE` |
| `core/backend/src/brands/brands.service.ts` | Backend brands service |

---

[← Back to documentation](../README.md)
