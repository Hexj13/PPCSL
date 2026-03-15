---
title: Scripts architecture
owner: platform
tags:
  - type/architecture
  - domain/scripts
  - scope/core
  - status/active
---

# Scripts architecture for multi-platform

## Overview

All scripts live in the **core** repository. Access to platform-specific scripts is controlled via the `COUNTRY` environment variable and the `checkPlatform()` function.

## Structure

```
core/backend/src/scripts/
├── platforms/                    # Platform configs
│   ├── index.ts                  # Exports getPlatformConfig()
│   └── md/
│       └── config.ts             # Platform config (cities, descriptions, phones)
│
├── production/                   # Production scripts
│   ├── backup-database.ts
│   ├── make-admin.ts
│   ├── remove-admin.ts
│   ├── update-listing-titles.ts
│   └── upload-robots-txt.ts
│
├── stage/                        # Stage/Development scripts
│   ├── seed.ts                   # Platform-specific (checkPlatform)
│   ├── seed-vin-test.ts          # Platform-specific
│   ├── create-test-listing.ts    # Platform-specific
│   ├── generate-listings-*.ts    # Platform-specific
│   ├── reset-and-seed.ts         # Universal (reset + seed)
│   ├── add-brands.ts             # Universal
│   ├── add-*-brands-models.ts    # Universal
│   ├── check-*.ts                # Universal
│   ├── clear-*.ts                # Universal
│   └── ...
│
└── script-guard.ts               # checkEnvironment() + checkPlatform()
```

---

## Platform guard

### script-guard.ts

```typescript
export type Platform = 'md' | 'common';

export function checkPlatform(allowedPlatforms: Platform[]): void {
  const currentPlatform = process.env.COUNTRY || process.env.NEXT_PUBLIC_COUNTRY || 'md';

  if (allowedPlatforms.includes('common')) {
    return;
  }

  if (!allowedPlatforms.includes(currentPlatform)) {
    console.error('❌ PLATFORM MISMATCH');
    console.error(`   Current: ${currentPlatform}`);
    console.error(`   Allowed: ${allowedPlatforms.join(', ')}`);
    process.exit(1);
  }
}

export function getPlatform(): Platform {
  return (process.env.COUNTRY || process.env.NEXT_PUBLIC_COUNTRY || 'md') as Platform;
}
```

### Usage in scripts

```typescript
checkPlatform(['md']);
const config = getPlatformConfig();
const { cities, descriptions } = config;

checkPlatform(['common']);
```

---

## Platform configuration

### platforms/md/config.ts

```typescript
const config: PlatformSeedConfig = {
  cities: ['Chișinău', 'Bălți', ...],
  descriptions: ['Mașină în stare foarte bună...', ...],
  phonePrefix: '+373',
  testUserFirstName: 'Test',
  testUserLastName: 'Utilizator',
  testCompanyName: 'Test SRL',
  transmissionLabels: {
    automatic: 'Automată',
    manual: 'Manuală',
    cvt: 'CVT',
  },
};
```

---

## Running scripts

### With platform set

```bash
COUNTRY=md npx ts-node src/scripts/stage/seed.ts
```

### In platform package.json

```json
{
  "scripts": {
    "seed": "COUNTRY=md npm run prepare:build && cd core/backend && COUNTRY=md npx ts-node -r tsconfig-paths/register src/scripts/stage/seed.ts",
    "add-brands": "cd core/backend && npx ts-node -r tsconfig-paths/register src/scripts/stage/add-brands.ts"
  }
}
```

Replace `md` with your country code when adding a new platform.

---

## Script categories

### Platform-specific (require checkPlatform)

Scripts that use localized data:

| Script                                | Description                          |
| ------------------------------------- | ------------------------------------ |
| `seed.ts`                             | Generate users and listings          |
| `seed-vin-test.ts`                    | Test data with VIN                   |
| `create-test-listing.ts`              | Create a test listing                |
| `generate-listings-for-all-models.ts` | Generate listings for all models     |

### Universal (no checkPlatform)

Scripts that work with shared data:

| Script                   | Description                    |
| ------------------------ | ------------------------------ |
| `add-brands.ts`          | Add brands and models          |
| `add-*-brands-models.ts` | Add brands by region           |
| `check-*.ts`             | Checks and diagnostics         |
| `clear-*.ts`             | Clear cache/data                |
| `reset-and-seed.ts`      | DB reset + seed                 |
| `remove-duplicates.ts`   | Remove duplicates               |
| `backup-database.ts`     | DB backup                       |
| `make-admin.ts`          | Create admin                    |

---

## Adding a new country (platform)

1. Create config `platforms/{code}/config.ts` following `platforms/md/config.ts`:

```typescript
export interface PlatformSeedConfig {
  cities: string[];
  descriptions: string[];
  phonePrefix: string;
  testUserFirstName: string;
  testUserLastName: string;
  testCompanyName: string;
  transmissionLabels: { automatic: string; manual: string; cvt: string };
}

const config: PlatformSeedConfig = {
  cities: ['City1', 'City2', ...],
  descriptions: ['Description 1...', ...],
  phonePrefix: '+XXX',
  // ...
};

export default config;
```

2. Add platform to `platforms/index.ts` and to type in `script-guard.ts` (`Platform = 'md' | 'xx' | 'common'`).

3. In platform repo `package.json`, set `COUNTRY={code}` in scripts (seed, reset-and-seed, etc.).

---

## Architecture benefits

1. All scripts in one place — easy to maintain
2. No duplication — one script for all platforms
3. Guard against mistakes — cannot run wrong script for platform
4. Easy to add platforms — config only
5. Single logic — changes apply to all platforms

---

## Further reading

- [multi-repository.md](./multi-repository.md) — Overall architecture
- [../guides/platform-checklist.md](../guides/platform-checklist.md) — Platform creation checklist
- [known-issues.md](./known-issues.md) — Other improvements
