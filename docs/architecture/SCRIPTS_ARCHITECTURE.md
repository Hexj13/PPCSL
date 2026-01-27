# Архитектура скриптов для multi-platform

## Обзор

Все скрипты хранятся в **core** репозитории. Доступ к platform-specific скриптам контролируется через переменную окружения `COUNTRY` и функцию `checkPlatform()`.

## Структура

```
core/backend/src/scripts/
├── platforms/                    # Конфигурации платформ
│   ├── index.ts                  # Экспорт getPlatformConfig()
│   ├── mk/
│   │   └── config.ts             # 🇲🇰 Македонские города, описания, телефоны
│   └── al/
│       └── config.ts             # 🇦🇱 Албанские города, описания, телефоны
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
export type Platform = 'mk' | 'al' | 'common';

export function checkPlatform(allowedPlatforms: Platform[]): void {
  const currentPlatform = process.env.COUNTRY || 'mk';
  
  if (allowedPlatforms.includes('common')) {
    return; // Доступен всем
  }
  
  if (!allowedPlatforms.includes(currentPlatform)) {
    console.error('❌ PLATFORM MISMATCH');
    console.error(`   Current: ${currentPlatform}`);
    console.error(`   Allowed: ${allowedPlatforms.join(', ')}`);
    process.exit(1);
  }
}

export function getPlatform(): Platform {
  return process.env.COUNTRY || 'mk';
}
```

### Использование в скриптах

```typescript
// Platform-specific скрипт (только MK и AL)
checkPlatform(['mk', 'al']);
const config = getPlatformConfig();
const { cities, descriptions } = config;

// Универсальный скрипт (доступен всем)
// checkPlatform не нужен или:
checkPlatform(['common']);
```

---

## Конфигурации платформ

### platforms/mk/config.ts

```typescript
const config: PlatformSeedConfig = {
  cities: ['Скопје', 'Битола', 'Прилеп', ...],
  descriptions: ['Отлично одржан автомобил...', ...],
  phonePrefix: '+373',
  testUserFirstName: 'Тест',
  testUserLastName: 'Корисник',
  testCompanyName: 'Тест Компанија',
  transmissionLabels: {
    automatic: 'Автоматска',
    manual: 'Мануелна',
    cvt: 'Варијатор',
  },
};
```

### platforms/al/config.ts

```typescript
const config: PlatformSeedConfig = {
  cities: ['Tiranë', 'Durrës', 'Vlorë', ...],
  descriptions: ['Automobil në gjendje të shkëlqyer...', ...],
  phonePrefix: '+355',
  testUserFirstName: 'Test',
  testUserLastName: 'Përdorues',
  testCompanyName: 'Test Kompania',
  transmissionLabels: {
    automatic: 'Automatike',
    manual: 'Manuale',
    cvt: 'CVT',
  },
};
```

---

## Запуск скриптов

### С указанием платформы

```bash
# Moldova
COUNTRY=md npx ts-node src/scripts/stage/seed.ts

# Albania
COUNTRY=al npx ts-node src/scripts/stage/seed.ts
```

### В package.json платформы

```json
{
  "scripts": {
    "seed": "COUNTRY=mk cd core/backend && npx ts-node -r tsconfig-paths/register src/scripts/stage/seed.ts",
    "add-brands": "cd core/backend && npx ts-node -r tsconfig-paths/register src/scripts/stage/add-brands.ts"
  }
}
```

---

## Категории скриптов

### ⚠️ Platform-Specific (требуют checkPlatform)

Скрипты, использующие локализованные данные:

| Скрипт | Описание |
|--------|----------|
| `seed.ts` | Генерация пользователей и объявлений |
| `seed-vin-test.ts` | Тестовые данные с VIN |
| `create-test-listing.ts` | Создание тестового объявления |
| `generate-listings-for-all-models.ts` | Генерация объявлений для всех моделей |

### ✅ Универсальные (без checkPlatform)

Скрипты, работающие с общими данными:

| Скрипт | Описание |
|--------|----------|
| `add-brands.ts` | Добавление брендов и моделей |
| `add-*-brands-models.ts` | Добавление брендов по регионам |
| `check-*.ts` | Проверки и диагностика |
| `clear-*.ts` | Очистка кэша/данных |
| `reset-and-seed.ts` | Сброс БД + seed |
| `remove-duplicates.ts` | Удаление дубликатов |
| `backup-database.ts` | Бэкап БД |
| `make-admin.ts` | Создание админа |

---

## Добавление новой платформы

1. Создать конфиг `platforms/{code}/config.ts`:

```typescript
import { PlatformSeedConfig } from '../mk/config';

const config: PlatformSeedConfig = {
  cities: ['City1', 'City2', ...],
  descriptions: ['Description 1...', ...],
  phonePrefix: '+XXX',
  // ...
};

export default config;
```

2. Добавить в `platforms/index.ts`:

```typescript
import newConfig from './{code}/config';

const configs: Record<Platform, PlatformSeedConfig> = {
  mk: mkConfig,
  al: alConfig,
  {code}: newConfig,  // Добавить
  common: mkConfig,
};
   ```

3. Добавить тип в `script-guard.ts`:

```typescript
export type Platform = 'mk' | 'al' | '{code}' | 'common';
   ```

4. Обновить `package.json` в platform-repo:

   ```json
   {
     "scripts": {
    "seed": "COUNTRY={code} cd core/backend && npx ts-node -r tsconfig-paths/register src/scripts/stage/seed.ts"
     }
   }
   ```

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
