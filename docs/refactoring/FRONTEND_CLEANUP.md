# Frontend Cleanup Plan

> **Статус:** план утверждён, готов к выполнению
> **Область:** `core/frontend/` (Next.js, Zustand, Axios)
> **Подход:** прагматичные улучшения без церемоний DDD — убрать дубли, вынести константы, сделать страницы тоньше

---

## 1. Зачем это нужно

Фронтенд проекта — маркетплейс с ~15 страницами, ~90 компонентами, ~20 хуками и ~60 API-методами. Это **не enterprise SPA** уровня Figma или Notion, полноценный DDD со слоями здесь избыточен. Ядро бизнес-логики — на бэкенде.

Но есть конкретные проблемы, которые стоит решить:

| Проблема | Где | Последствия |
|----------|-----|-------------|
| Hardcoded бизнес-константы | `my-listings/page.tsx` — 48 часов в 3 местах | Рассинхрон с бэкендом, дублирование |
| Дублирование валидации | `useFilterHandlers.ts` и `useFilterValidation.ts` | Копипаст, правки в одном месте забывают в другом |
| Бизнес-логика в страницах | `my-listings/page.tsx` — 846 строк, правила статусов | Нечитаемый код, невозможно тестировать |
| Дублирование конвертаций | `lib/utils.ts:470-476` и `listingFormUtils.ts:83` | Два источника правды для кВт/л.с. |
| Правила статусов в UI | `my-listings/page.tsx:330-338` — сброс промо при закрытии | Фронт знает про внутреннюю логику, которая должна быть на бэке |

### Что НЕ является проблемой (оставляем как есть)

- Форматирование цен, дат, чисел — чистая презентация, не бизнес-логика
- Кеширование брендов в памяти (`useBrandsAndModels`) — оптимизация
- PWA, cookies, analytics хуки — инфраструктура
- `lib/api.ts` (~875 строк) — хорошо структурирован, инкапсулирует вызовы
- 3 стора Zustand — простые, не нуждаются в рефакторинге

---

## 2. Текущее состояние

### Статистика

| Категория | Количество | Примечание |
|-----------|------------|------------|
| Страницы | ~15 | `app/` — page.tsx файлы |
| Компоненты | ~90 | `components/` + `ui/` |
| Хуки | ~20 | `hooks/` |
| API-методы | ~60 | `lib/api.ts` |
| Zustand сторы | 3 | auth, favorites, comparison |
| lib/ утилиты | ~15 файлов | utils, validators, constants, i18n... |

### Проблемные файлы

**`app/my-listings/page.tsx`** — 846 строк, самая «толстая» страница:
- Строки 170–182: проверка 48-часового лимита (hardcoded `48 * 60 * 60 * 1000`)
- Строки 217–241: расчёт оставшегося времени + таймер обратного отсчёта
- Строки 252–321: маппинг действий на статусы (publish/pause/close)
- Строки 323–382: логика закрытия с ручным сбросом `is_promoted`, `promoted_until`
- Строки 384–411: валидация лимита перед refreshDates
- Строки 445–489: логика продвижения (getPromotionAccess + обработка ошибок)

**`hooks/useFilterHandlers.ts`** — 600 строк:
- Строки 181–197: валидация года (1940 – текущий год + 1)
- Строки 199–210: валидация цены (0 – 999999999)
- Строки 228–275: валидация всех диапазонов (год, цена, пробег, двигатель, мощность)
- Строки 300–457: построение query-параметров, base64-кодирование, localStorage fallback

**`hooks/useFilterValidation.ts`** — 62 строки:
- Строки 11–58: дубль валидации диапазонов из useFilterHandlers

**`lib/utils.ts`** — 503 строки:
- Строки 470–476: конвертация л.с. ↔ кВт (дублируется в listingFormUtils.ts:83)
- Строки 478–486: определение vehicleType из bodyType
- Строки 488–502: формирование заголовка объявления

### Дублирование между фронтом и бэком

| Что | Фронт | Бэк |
|-----|-------|-----|
| 48-часовой лимит обновления дат | `my-listings/page.tsx:175, 220, 398` | `ListingsService.refreshAllDates()` |
| Правила статусов при закрытии (сброс промо) | `my-listings/page.tsx:330-338` | `ListingsService.close()` |
| Валидация VIN (формат, 17 символов) | `BasicInfoSection.tsx:178-196` | `CreateListingDto` |
| Конвертация л.с. ↔ кВт | `utils.ts:470-476` | (возможно дублируется) |
| Валидация диапазонов (год, цена, пробег) | `useFilterHandlers.ts:228-275` | `SearchListingsDto` |

---

## 3. TODO-лист

Задачи упорядочены по приоритету и зависимостям. Каждая задача самодостаточна и может быть отдельным PR.

---

### TODO-F1: Бэкенд возвращает бизнес-константы — убрать hardcoded 48 часов

**Приоритет:** высокий
**Зависимости:** нет

**Проблема:**
Лимит обновления дат (48 часов) hardcoded на фронте в 3 местах. Если бэк изменит значение — фронт рассинхронится.

**Что сделать на бэкенде:**

1. В ответ `GET /api/listings/my` добавить поле `meta.refreshCooldownMs`:
```ts
{
  data: [...],
  meta: {
    total: 15,
    refreshCooldownMs: 172800000,
    lastRefreshAt: "2026-02-05T12:00:00Z"
  }
}
```

2. Константу `REFRESH_COOLDOWN_MS = 48 * 60 * 60 * 1000` определить в одном месте на бэке (в `common/constants.ts` или в domain listings).

**Что сделать на фронте:**

1. В `app/my-listings/page.tsx` убрать все `48 * 60 * 60 * 1000`.
2. Использовать `meta.refreshCooldownMs` из ответа API.
3. `lastRefreshAt` тоже брать из API-ответа, не запрашивать отдельно.

**Что убрать:**
```ts
// my-listings/page.tsx:175 — УБРАТЬ
const REFRESH_COOLDOWN = 48 * 60 * 60 * 1000;

// my-listings/page.tsx:220 — УБРАТЬ
const remaining = REFRESH_COOLDOWN - elapsed;

// my-listings/page.tsx:398 — УБРАТЬ
setRefreshCooldownEnd(Date.now() + 48 * 60 * 60 * 1000);
```

**Как проверить:** поиск по `48 * 60` и `172800` на фронте — 0 результатов. Обновление дат работает как раньше.

---

### TODO-F2: Единый файл валидационных правил

**Приоритет:** высокий
**Зависимости:** нет

**Проблема:**
Валидация диапазонов (год, цена, пробег, двигатель, мощность) дублируется в `useFilterHandlers.ts` и `useFilterValidation.ts`. Правки в одном месте забывают в другом.

**Что сделать:**

1. Создать `core/frontend/lib/validation-rules.ts`:
```ts
export const YEAR_RANGE = { min: 1940, max: new Date().getFullYear() + 1 };
export const PRICE_RANGE = { min: 0, max: 999_999_999 };
export const MILEAGE_RANGE = { min: 0, max: 9_999_999 };
export const ENGINE_RANGE = { min: 0, max: 99 };
export const POWER_RANGE = { min: 1, max: 9_999 };

export function clampToRange(value: number, range: { min: number; max: number }): number {
  return Math.max(range.min, Math.min(range.max, value));
}

export function isInRange(value: number, range: { min: number; max: number }): boolean {
  return value >= range.min && value <= range.max;
}

export function validateMinMax(min: number | null, max: number | null, range: { min: number; max: number }): {
  min: number | null;
  max: number | null;
} {
  // нормализация: если min > max — поменять местами; clamp к range
}
```

2. В `hooks/useFilterHandlers.ts` (строки 181–275) заменить хардкод на импорт из `validation-rules.ts`.
3. В `hooks/useFilterValidation.ts` (строки 11–58) заменить дублированную логику на импорт.
4. В `components/search-filters/AdvancedFilters.tsx` (строки 48–80) использовать те же константы.
5. В `lib/validators.ts` — использовать `YEAR_RANGE` вместо хардкода `1940`.

**Как проверить:** поиск `1940`, `999999999`, `9999999` на фронте — только в `validation-rules.ts`. Фильтры работают как раньше. `useFilterValidation.ts` и `useFilterHandlers.ts` импортируют из одного источника.

---

### TODO-F3: Единая функция конвертации кВт/л.с.

**Приоритет:** средний
**Зависимости:** нет

**Проблема:**
Конвертация `horsepower * 0.73549875` дублируется в `lib/utils.ts:470-476` и `components/ListingForm/listingFormUtils.ts:83`.

**Что сделать:**

1. Оставить функции `hpToKw()` и `kwToHp()` только в `lib/utils.ts`.
2. В `listingFormUtils.ts:83` заменить инлайн-формулу на импорт `hpToKw()` из `lib/utils.ts`.

**Как проверить:** поиск `0.73549875` на фронте — только в `lib/utils.ts`. Форма создания объявления корректно конвертирует мощность.

---

### TODO-F4: Хук useListingActions — вынести логику из my-listings

**Приоритет:** высокий
**Зависимости:** TODO-F1 (cooldown из API)

**Проблема:**
`app/my-listings/page.tsx` — 846 строк. Правила статусов, продвижения, обновления дат — всё в одном файле-странице. Невозможно тестировать, сложно читать.

**Что сделать:**

1. Создать `core/frontend/hooks/useListingActions.ts`:

```ts
interface ListingActionsConfig {
  refreshCooldownMs: number;
  lastRefreshAt: string | null;
  canPromote: boolean;
}

function useListingActions(config: ListingActionsConfig) {
  // Управление статусами
  async function publishListing(id: string): Promise<void>
  async function pauseListing(id: string): Promise<void>
  async function closeListing(id: string): Promise<void>

  // Обновление дат
  function canRefreshDates(): boolean
  function getRefreshCooldownRemaining(): number  // ms до разблокировки
  async function refreshAllDates(): Promise<void>

  // Продвижение
  async function togglePromotion(id: string, isPromoted: boolean, days?: number): Promise<void>

  return {
    publishListing, pauseListing, closeListing,
    canRefreshDates, getRefreshCooldownRemaining, refreshAllDates,
    togglePromotion,
  };
}
```

2. Перенести из `my-listings/page.tsx`:
   - Строки 252–321 (маппинг действий → статусы) → `publishListing`, `pauseListing`, `closeListing`
   - Строки 323–382 (логика закрытия + сброс промо) → `closeListing`
   - Строки 384–411 (валидация cooldown + refreshDates) → `canRefreshDates`, `refreshAllDates`
   - Строки 445–489 (логика продвижения) → `togglePromotion`

3. Страница `my-listings/page.tsx` вызывает хук и рендерит UI. Бизнес-логики в странице 0.

**Как проверить:**
- `my-listings/page.tsx` < 500 строк
- Все действия (publish, pause, close, refresh, promote) работают идентично
- Хук можно тестировать через `renderHook()` без рендера страницы

---

### TODO-F5: Убрать ручной сброс промо-полей при закрытии

**Приоритет:** средний
**Зависимости:** TODO-F4

**Проблема:**
При закрытии объявления фронт вручную сбрасывает `is_promoted: false`, `promoted_until: null` (строки 330–338). Эту логику должен делать бэкенд, а фронт — получать обновлённые данные из ответа API.

**Что сделать:**

1. Убедиться, что `POST /api/listings/:id/close` на бэке возвращает обновлённый listing с `is_promoted: false` и `promoted_until: null`.
2. На фронте в `closeListing()` (хук из TODO-F4) — использовать данные из ответа API вместо ручного сброса полей.

**Что убрать:**
```ts
// my-listings/page.tsx:330-338 — УБРАТЬ ручной сброс
is_promoted: false,
promoted_until: null,
```

**Целевой код:**
```ts
async function closeListing(id: string) {
  const updated = await api.listings.close(id);
  // обновить listing в стейте данными из API-ответа
  updateListingInState(updated);
}
```

**Как проверить:** закрытие объявления с промо — промо сбрасывается. Фронт не содержит `is_promoted: false` при закрытии.

---

### TODO-F6: Разбить useFilterHandlers на части

**Приоритет:** средний
**Зависимости:** TODO-F2

**Проблема:**
`hooks/useFilterHandlers.ts` — 600 строк. Содержит: валидацию, построение query-параметров, base64-кодирование, localStorage fallback, логику сброса фильтров.

**Что сделать:**

1. Вынести построение URL query из `useFilterHandlers.ts` (строки 300–457) в отдельную функцию `lib/search-params.ts` → `buildSearchQuery(filters, brands, models)`:
   - Конвертация brand_ids в slugs
   - Конвертация model_ids в slugs
   - Base64-кодирование длинных массивов
   - Fallback на localStorage

2. Вынести логику сброса фильтров в `lib/search-params.ts` → `getDefaultFilters(vehicleType)`.

3. `useFilterHandlers.ts` оставить только:
   - Обработчики onChange для полей формы
   - Вызов `buildSearchQuery()` при submit
   - Вызов `getDefaultFilters()` при сбросе

**Как проверить:**
- `useFilterHandlers.ts` < 300 строк
- `buildSearchQuery()` покрыт unit-тестами (чистая функция без React)
- Поиск и фильтрация работают идентично

---

### TODO-F7: Вынести generateListingTitle в общую утилиту

**Приоритет:** низкий
**Зависимости:** нет

**Проблема:**
`lib/utils.ts:488-502` — формирование заголовка объявления (бренд + модель + год + трансмиссия для авто, без трансмиссии для мото). Та же логика на бэке в `ListingsService.generateTitle()`.

**Что сделать:**

1. Оставить `generateListingTitle()` в `lib/utils.ts` (используется для отображения).
2. Убедиться, что фронт использует `title` из API-ответа, а `generateListingTitle()` — только для превью в форме создания до сохранения.
3. Добавить комментарий: title формируется на бэке, фронт использует для preview.

**Как проверить:** в компонентах объявлений используется `listing.title` из API, а не вызов `generateListingTitle()`.

---

## 4. Порядок выполнения

```
TODO-F1: Бэк отдаёт cooldown → фронт убирает hardcode
   ↓
TODO-F2: Единый файл валидационных правил (параллельно с F1)
   ↓
TODO-F3: Единая конвертация кВт/л.с. (параллельно с F1, F2)
   ↓
TODO-F4: Хук useListingActions (после F1)
   ↓
TODO-F5: Убрать ручной сброс промо (после F4)
   ↓
TODO-F6: Разбить useFilterHandlers (после F2)
   ↓
TODO-F7: generateListingTitle (в любое время)
```

Задачи F1, F2, F3 можно выполнять параллельно. F4–F6 зависят от предыдущих.

---

## 5. Что НЕ делаем и почему

| Подход | Почему не нужен |
|--------|----------------|
| Domain entities на фронте | Все бизнес-правила на бэке. Фронт — потребитель API |
| Frontend use cases | Хуки + API-вызовы уже выполняют эту роль |
| Bounded contexts / modules/ | 1 команда, ~90 компонентов — overhead не окупится |
| Отдельный infrastructure/ слой | `lib/api.ts` уже хорошо инкапсулирует API |
| Domain services на фронте | Недостаточно бизнес-логики для отдельного слоя |
| Рефакторинг Zustand сторов | 3 простых стора — работают хорошо |
| Рефакторинг lib/api.ts | 60 методов, хорошо сгруппированы — не трогаем |

---

## 6. Связь с другой документацией

- Бэкенд DDD-рефакторинг: [LAYERS_AND_DDD.md](./LAYERS_AND_DDD.md) — основной план архитектурного рефакторинга
- Архитектура: [ARCHITECTURE_OVERVIEW.md](../architecture/ARCHITECTURE_OVERVIEW.md)
- Мультирепозиторий: [MULTI_REPOSITORY.md](../architecture/MULTI_REPOSITORY.md)
