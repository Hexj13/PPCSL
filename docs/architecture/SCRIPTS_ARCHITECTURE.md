# Архитектура скриптов для multi-platform

## Обзор

Все скрипты хранятся в **core** репозитории. Доступ к platform-specific скриптам контролируется через переменную окружения `COUNTRY` и функцию `checkPlatform()`.

## Структура

```
core/backend/src/scripts/
├── platforms/                    # Конфигурации платформ
│   ├── index.ts                  # Экспорт getPlatformConfig()
│   └── md/
│       └── config.ts             # Конфиг платформы (города, описания, телефоны)
│
├── production/                   # Production скрипты
│   ├── backup-database.ts
│   ├── make-admin.ts
│   ├── remove-admin.ts
│   ├── update-listing-titles.ts
│   └── upload-robots-txt.ts
│
├── stage/                        # Stage/Development скрипты
│   ├── seed.ts                   # ⚠️ Platform-specific (checkPlatform)
│   ├── seed-vin-test.ts          # ⚠️ Platform-specific
│   ├── create-test-listing.ts    # ⚠️ Platform-specific
│   ├── generate-listings-*.ts    # ⚠️ Platform-specific
│   ├── reset-and-seed.ts         # Универсальный (сброс + seed)
│   ├── add-brands.ts             # Универсальный
│   ├── add-*-brands-models.ts    # Универсальный
│   ├── check-*.ts                # Универсальный
│   ├── clear-*.ts                # Универсальный
│   └── ...
│
└── script-guard.ts               # checkEnvironment() + checkPlatform()
```

---

## Система защиты платформы

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

### Использование в скриптах

```typescript
checkPlatform(['md']);
const config = getPlatformConfig();
const { cities, descriptions } = config;

checkPlatform(['common']);
```

---

## Конфигурация платформы

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

## Запуск скриптов

### С указанием платформы

```bash
COUNTRY=md npx ts-node src/scripts/stage/seed.ts
```

### В package.json платформы

```json
{
  "scripts": {
    "seed": "COUNTRY=md npm run prepare:build && cd core/backend && COUNTRY=md npx ts-node -r tsconfig-paths/register src/scripts/stage/seed.ts",
    "add-brands": "cd core/backend && npx ts-node -r tsconfig-paths/register src/scripts/stage/add-brands.ts"
  }
}
```

Замените `md` на код вашей страны при добавлении новой платформы.

---

## Категории скриптов

### ⚠️ Platform-Specific (требуют checkPlatform)

Скрипты, использующие локализованные данные:

| Скрипт                                | Описание                              |
| ------------------------------------- | ------------------------------------- |
| `seed.ts`                             | Генерация пользователей и объявлений  |
| `seed-vin-test.ts`                    | Тестовые данные с VIN                 |
| `create-test-listing.ts`              | Создание тестового объявления         |
| `generate-listings-for-all-models.ts` | Генерация объявлений для всех моделей |

### ✅ Универсальные (без checkPlatform)

Скрипты, работающие с общими данными:

| Скрипт                   | Описание                       |
| ------------------------ | ------------------------------ |
| `add-brands.ts`          | Добавление брендов и моделей   |
| `add-*-brands-models.ts` | Добавление брендов по регионам |
| `check-*.ts`             | Проверки и диагностика         |
| `clear-*.ts`             | Очистка кэша/данных            |
| `reset-and-seed.ts`      | Сброс БД + seed                |
| `remove-duplicates.ts`   | Удаление дубликатов            |
| `backup-database.ts`     | Бэкап БД                       |
| `make-admin.ts`          | Создание админа                |

---

## Добавление новой страны (платформы)

1. Создать конфиг `platforms/{code}/config.ts` по образцу `platforms/md/config.ts`:

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

2. Добавить платформу в `platforms/index.ts` и тип в `script-guard.ts` (`Platform = 'md' | 'xx' | 'common'`).

3. В репозитории платформы в `package.json` указать `COUNTRY={code}` в скриптах (seed, reset-and-seed и т.д.).

---

## Преимущества архитектуры

1. ✅ **Все скрипты в одном месте** - легко поддерживать
2. ✅ **Нет дублирования** - один скрипт для всех платформ
3. ✅ **Защита от ошибок** - нельзя запустить неправильный скрипт
4. ✅ **Легко добавлять платформы** - только конфиг
5. ✅ **Единая логика** - изменения применяются ко всем платформам

---

## Дополнительные ресурсы

- [MULTI_REPOSITORY.md](./MULTI_REPOSITORY.md) - Общая архитектура
- [../guides/PLATFORM_CHECKLIST.md](../guides/PLATFORM_CHECKLIST.md) - Чеклист создания платформы
- [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) - Другие улучшения
