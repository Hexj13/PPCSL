# Refactoring Plan: Layered Architecture + DDD

> **Статус:** план утверждён, готов к выполнению
> **Область:** `core/backend/src/` (NestJS, TypeORM, Redis)
> **Подход:** Strangler Fig — новый код по новой архитектуре, старый мигрируется поэтапно

---

## 1. Ценность для проекта

### Текущие проблемы

| Проблема | Где проявляется | Последствия |
|----------|----------------|-------------|
| **«Толстые» сервисы** | `ListingsService` — 1437 строк, 27 методов | Невозможно тестировать бизнес-логику изолированно; один метод `findAll` — 248 строк |
| **Бизнес-логика в контроллерах** | `ListingsController.getPromotionAccess()`, `togglePromotion()` — правила доступа к промо | Дублирование логики, невозможно переиспользовать |
| **Анемичные сущности** | `Listing`, `User`, `Vehicle` — только поля, нет методов | Правила размазаны по сервисам, нет единого места для инвариантов |
| **Прямая привязка к ORM** | Все сервисы напрямую используют TypeORM `Repository` | Нельзя тестировать без БД, нельзя сменить хранилище |
| **Смешение слоёв** | `AuthService` (454 строки) — и координация, и хеширование, и JWT, и бизнес-правила | Сложно поддерживать, сложно вносить изменения |
| **Тесная связанность модулей** | `BrandsModule` регистрирует entities из Listings, Favorites; `AuthModule` зависит от `ListingsModule` | Изменение одного модуля ломает другие |

### Что даст рефакторинг

1. **Тестируемость.** Бизнес-логика в домене без зависимостей от фреймворков — unit-тесты за секунды, без поднятия БД.
2. **Предсказуемость.** Все правила в одном месте (domain) — нет «размазанных» проверок по контроллерам и сервисам.
3. **Скорость разработки.** Новый разработчик видит чёткую структуру: controller → use case → domain → infrastructure. Порог входа снижается.
4. **Масштабируемость.** Bounded contexts готовы к выделению в микросервисы при необходимости. Мультиплатформенность (PPCSL) получает чистые интерфейсы.
5. **Безопасность изменений.** Изменение бизнес-правил (лимиты, статусы, промо) не затрагивает слои HTTP, кеша и БД.

### Метрики успеха

- Контроллеры: 0 строк бизнес-логики (только вызов use case и возврат ответа)
- Сервисы: ни один метод > 50 строк
- Domain entities: все инварианты и переходы состояний — методы сущностей
- Покрытие unit-тестами domain layer: > 80%

---

## 2. Текущее состояние (AS-IS)

### Архитектура

```
Controller (NestJS) → Service (бизнес + оркестрация + кеш + БД) → TypeORM Repository
```

Один «толстый» слой Service делает всё: валидирует бизнес-правила, строит запросы, кеширует, отправляет SMS/email.

### Граф зависимостей модулей

```
AppModule
├── CommonModule (Global) — RedisService, I18nService
├── AuthModule → UsersModule, ListingsModule
├── ListingsModule → UsersModule, BrandsModule
├── BrandsModule (регистрирует чужие entities: Vehicle, Listing, ListingView, Favorite)
├── BoardModule → UsersModule, ListingsModule
├── AdminModule → AuthModule, ListingsModule
├── FavoritesModule
├── SavedFiltersModule
├── CitiesModule
└── UploadModule
```

### Статистика кодовой базы

| Модуль | Контроллер (строк) | Сервис (строк) | Entities | Сложность |
|--------|-------------------|----------------|----------|-----------|
| **Listings** | 500 | 1437 | 4 (Listing, Vehicle, ListingView, PromotionHistory) | Высокая |
| **Auth** | 815 | 454 + 4 sub-services (553) | 1 (RefreshToken) | Высокая |
| **Users** | 96 | 117 | 1 (User) | Низкая |
| **Brands** | ~200 | ~400 | 2 (Brand, VehicleModel) | Средняя |
| **Admin** | ~400 | ~600 | 0 (использует чужие) | Средняя |
| **Favorites** | ~200 | ~300 | 1 (Favorite) | Низкая |
| **SavedFilters** | ~150 | ~200 | 1 (SavedFilter) | Низкая |
| **Upload** | ~150 | ~530 | 0 | Средняя |
| **Board** | ~70 | 0 (проксирует) | 0 | Низкая |
| **Cities** | ~50 | ~130 | 0 (in-memory) | Низкая |

### Конкретные нарушения

#### A. Бизнес-логика в контроллерах

**`ListingsController.getPromotionAccess()`** (строки 216–234) — правила доступа к промо:
```ts
const isDevelopment = process.env.NODE_ENV !== 'production';
const promotionAccess = process.env.PROMOTION_ACCESS || 'disabled';
const isAdmin = req.user?.type === 'Admin';
let canPromote = false;
if (promotionAccess === 'all') canPromote = true;
else if (promotionAccess === 'admin') canPromote = isAdmin;
else if (isDevelopment && isAdmin) canPromote = true;
```

**`ListingsController.togglePromotion()`** (строки 484–495) — дубль той же логики.

**`ListingsController.closeOldListings()`** (строки 457–460) — проверка CRON_SECRET.

**`ListingsController.findOne()`** (строки 296–303) — генерация visitorId из IP и User-Agent.

**`AuthController`** — нормализация телефона и проверка дубликатов в нескольких эндпоинтах.

#### B. «Толстые» сервисы

**`ListingsService.findAll()`** — 248 строк: построение query, 30+ фильтров, сортировка, маскировка данных, кеширование.

**`ListingsService.fetchSimilarCandidates()`** — 182 строки: алгоритм ранжирования с приоритетами, бакетами, диверсификацией.

**`ListingsService.togglePromotion()`** — 81 строка: валидация, проверка лимитов, расчёт дат, сохранение истории.

**`ListingsService.create()`** — смешаны: генерация title, проверка лимитов, санитизация HTML, создание Vehicle, создание Listing, инвалидация кеша, Sentry metrics.

**`AuthService`** — и координация регистрации/логина, и bcrypt, и JWT, и очистка данных.

#### C. Анемичные сущности

`Listing` — 30 полей, 0 методов. Нет `isPromoted()`, `canBeEdited()`, `publish()`, `pause()`, `close()`.

`User` — 20 полей, 0 методов. Нет `getDisplayName()`, `canCreateListing()`, `deactivate()`.

`Vehicle` — 12 полей, 0 методов.

#### D. Доменная логика в утилитах common/

- `common/utils/validation.utils.ts` — `validateRegistrationDate()` относится к Listings
- `common/utils/data-cleanup.utils.ts` — `cleanUserData()` относится к Users
- `common/utils/query-builder.utils.ts` — `applyCitiesFilter()` относится к Listings/Cities

---

## 3. Целевая архитектура (TO-BE)

### Слои

```
Presentation (Controllers, DTO)
      ↓
Application (Use Cases, Ports)
      ↓
Domain (Entities, Value Objects, Domain Services)
      ↑
Infrastructure (TypeORM repos, Redis cache, SMS, Email, S3)
```

**Зависимости:** только вниз. Infrastructure реализует интерфейсы (порты) из Application/Domain.

### Целевая структура модуля (на примере Listings)

```
core/backend/src/listings/
├── presentation/
│   ├── listings.controller.ts          # HTTP → use case → response
│   └── dto/
│       ├── create-listing.dto.ts
│       ├── update-listing.dto.ts
│       ├── search-listings.dto.ts
│       ├── similar-listings.dto.ts
│       └── toggle-promotion.dto.ts
├── application/
│   ├── use-cases/
│   │   ├── create-listing.use-case.ts
│   │   ├── update-listing.use-case.ts
│   │   ├── search-listings.use-case.ts
│   │   ├── publish-listing.use-case.ts
│   │   ├── pause-listing.use-case.ts
│   │   ├── close-listing.use-case.ts
│   │   ├── toggle-promotion.use-case.ts
│   │   ├── find-similar.use-case.ts
│   │   ├── record-view.use-case.ts
│   │   └── refresh-dates.use-case.ts
│   └── ports/
│       ├── listing.repository.port.ts   # интерфейс репозитория
│       └── listing-cache.port.ts        # интерфейс кеша
├── domain/
│   ├── entities/
│   │   ├── listing.entity.ts            # доменная модель с методами
│   │   └── vehicle.entity.ts
│   ├── value-objects/
│   │   └── price.vo.ts                  # Price = amount + currency
│   ├── services/
│   │   ├── listing-title.service.ts     # генерация заголовка
│   │   ├── promotion-rules.service.ts   # правила промо
│   │   └── similar-ranking.service.ts   # алгоритм ранжирования
│   └── types.ts                         # доменные типы и перечисления
├── infrastructure/
│   ├── persistence/
│   │   ├── typeorm-listing.entity.ts    # TypeORM entity (mapping)
│   │   ├── typeorm-vehicle.entity.ts
│   │   ├── typeorm-listing-view.entity.ts
│   │   ├── typeorm-promotion-history.entity.ts
│   │   └── typeorm-listing.repository.ts  # реализация порта
│   └── cache/
│       └── redis-listing-cache.ts       # реализация кеш-порта
└── listings.module.ts
```

### Bounded Contexts

| Контекст | Ответственность | Агрегат |
|----------|----------------|---------|
| **Listings** | Объявления, транспорт, поиск, продвижение, просмотры | Listing (root) → Vehicle, Promotion, Views |
| **Auth** | Регистрация, логин, JWT, refresh, верификация | — (координирует User) |
| **Users** | Профиль, лимиты, board_slug | User (root) |
| **Catalog** | Марки и модели ТС (справочники) | Brand → VehicleModel |
| **Favorites** | Избранные объявления | Favorite |
| **SavedFilters** | Сохранённые поиски | SavedFilter |
| **Admin** | Админ-функции (координация) | — |
| **Upload** | Загрузка и обработка изображений | — |
| **Geography** | Города платформы | City |

---

## 4. TODO-лист рефакторинга

Все задачи упорядочены по зависимостям: каждый следующий шаг опирается на предыдущий.

---

### Фаза 0: Подготовка (без изменения поведения)

#### TODO-0.1: Создать структуру папок для слоёв в модуле Listings

**Что сделать:**
Внутри `core/backend/src/listings/` создать подпапки:
- `presentation/` — переместить `listings.controller.ts` и `dto/`
- `application/use-cases/` — пустая пока
- `application/ports/` — пустая пока
- `domain/entities/` — пустая пока
- `domain/value-objects/` — пустая пока
- `domain/services/` — пустая пока
- `infrastructure/persistence/` — пустая пока
- `infrastructure/cache/` — пустая пока

**Как проверить:** `npm run build` проходит. Все import-пути обновлены. Тесты проходят.

**Файлы:**
- `core/backend/src/listings/` — реструктуризация
- `core/backend/src/listings/listings.module.ts` — обновить пути импортов

---

#### TODO-0.2: Создать структуру папок для слоёв в модуле Auth

**Что сделать:**
Внутри `core/backend/src/auth/`:
- `presentation/` — переместить `auth.controller.ts` и `dto/`
- `application/` — переместить `auth.service.ts`
- `domain/` — пустая пока
- `infrastructure/` — переместить `services/email.service.ts`, `services/sms.service.ts`, `services/refresh-token.service.ts`, `services/ip-block.service.ts`, `strategies/`, `guards/`

**Как проверить:** `npm run build` проходит. Тесты проходят.

---

#### TODO-0.3: Создать структуру папок для слоёв в модуле Users

**Что сделать:**
Внутри `core/backend/src/users/`:
- `presentation/` — переместить `users.controller.ts`
- `application/` — переместить `users.service.ts`
- `domain/entities/` — пустая пока
- `infrastructure/` — пустая пока

**Как проверить:** `npm run build` проходит. Тесты проходят.

---

### Фаза 1: Вынос бизнес-логики из контроллеров

#### TODO-1.1: Вынести логику promotion access из ListingsController

**Что сделать:**
1. В `ListingsService` создать метод `getPromotionAccessStatus(userType: string): { canPromote: boolean }` — перенести логику из `ListingsController.getPromotionAccess()` (строки 216–234) и `ListingsController.togglePromotion()` (строки 484–495).
2. В контроллере оставить только вызов сервиса.
3. Убрать дублирование проверки промо-доступа — оба эндпоинта используют один метод сервиса.

**Текущий код (контроллер, убрать):**
```ts
const isDevelopment = process.env.NODE_ENV !== 'production';
const promotionAccess = process.env.PROMOTION_ACCESS || 'disabled';
const isAdmin = req.user?.type === 'Admin';
let canPromote = false;
// ...
```

**Целевой код (контроллер):**
```ts
@Get('promotion-access')
getPromotionAccess(@Request() req) {
  return this.listingsService.getPromotionAccessStatus(req.user?.type);
}
```

**Как проверить:** бизнес-логики в контроллере 0 строк. Эндпоинты `GET /api/listings/promotion-access` и `PATCH /api/listings/:id/promote` работают идентично.

---

#### TODO-1.2: Вынести генерацию visitorId из ListingsController

**Что сделать:**
1. Переместить логику извлечения IP и генерации visitorId из `ListingsController.findOne()` (строки 296–303) в `ListingsService`.
2. Контроллер передаёт `req.ip`, `req.headers['user-agent']` и `userId` в сервис.

**Текущий код (контроллер, убрать):**
```ts
if (!userId) {
  const ip = req.ip || req.headers['x-forwarded-for'] || '...';
  const userAgent = req.headers['user-agent'] || 'unknown';
  visitorId = this.listingsService.generateVisitorId(ip, userAgent);
}
```

**Целевой код (контроллер):**
```ts
return this.listingsService.findOne(id, {
  userId: req.user?.id,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  acceptLanguage: req.headers['accept-language'],
});
```

**Как проверить:** `GET /api/listings/:id` работает идентично. Тест `listings.controller.spec.ts` проходит.

---

#### TODO-1.3: Вынести проверку CRON_SECRET из ListingsController

**Что сделать:**
1. Создать `CronSecretGuard` в `common/guards/` — NestJS guard, который проверяет заголовок `x-cron-secret` против `process.env.CRON_SECRET`.
2. Применить guard к эндпоинту `POST /api/listings/cron/close-old` вместо проверки в теле контроллера (строки 457–460).

**Как проверить:** эндпоинт отвечает `403` без секрета и `200` с секретом.

---

#### TODO-1.4: Вынести бизнес-логику из AuthController

**Что сделать:**
1. Перенести нормализацию телефона из `AuthController.checkPhone()` и `AuthController.sendSms()` в `AuthService`.
2. Контроллер передаёт DTO напрямую, сервис нормализует.

**Как проверить:** `POST /api/auth/check-phone`, `POST /api/auth/send-sms` работают идентично. Тесты проходят.

---

### Фаза 2: Доменные сущности с поведением

#### TODO-2.1: Listing — добавить доменные методы

**Что сделать:**
В `Listing` entity добавить методы, перенеся логику из `ListingsService`:

```ts
isActive(): boolean
isPromoted(): boolean
canBeEdited(): boolean
canBePublished(): boolean

publish(): void          // status = Active, обновить last_published_at
pause(): void            // status = Paused, если промо — paused
close(): void            // status = Closed, closed_at = now
startPromotion(days: number): void
pausePromotion(): void
resumePromotion(): void
stopPromotion(): void
```

**Откуда перенести:**
- `publish()` — из `ListingsService.publish()` (строки 657–705), правила статусов и промо
- `pause()` — из `ListingsService.pause()` (строки 707–730)
- `close()` — из `ListingsService.close()` (строки 732–763)
- `startPromotion()` / `stopPromotion()` — из `ListingsService.togglePromotion()` (строки 1027–1108)

**Правила:**
- `publish()` бросает исключение если status === 'Closed'
- `startPromotion()` устанавливает `is_promoted = true`, `promoted_started_at = now`, `promoted_until = now + days`
- `pausePromotion()` сохраняет `promoted_paused_at = now`
- `resumePromotion()` восстанавливает оставшееся время промо

**Как проверить:** unit-тесты доменной сущности без зависимостей. `npm run test` проходит.

---

#### TODO-2.2: User — добавить доменные методы

**Что сделать:**
В `User` entity добавить методы:

```ts
getDisplayName(): string    // перенести из UsersService.getSellerDisplayName()
canCreateListing(activeCount: number, limit: number): boolean
deactivate(): void          // active = false, очистить персональные данные
isAdmin(): boolean
```

**Откуда перенести:**
- `getDisplayName()` — из `UsersService.getSellerDisplayName()` — Business + companyName → companyName, иначе firstName, иначе phone
- `deactivate()` — из `AuthService.deleteAccount()` — очистка email, phone, firstName, lastName, companyName, companyWebsiteUrl, active = false

**Как проверить:** unit-тесты доменной сущности.

---

#### TODO-2.3: Создать Value Object Price

**Что сделать:**
Создать `core/backend/src/listings/domain/value-objects/price.vo.ts`:

```ts
export class Price {
  constructor(
    readonly amount: number,
    readonly currency: Currency,
  ) {
    if (amount < 0 || amount > 999999999) throw new Error('Invalid price');
    if (!['EUR', 'MDL'].includes(currency)) throw new Error('Invalid currency');
  }

  equals(other: Price): boolean
  toString(): string
}
```

**Как проверить:** unit-тесты: валидация, сравнение, невалидные значения.

---

### Фаза 3: Domain Services

#### TODO-3.1: Создать ListingTitleService

**Что сделать:**
Создать `core/backend/src/listings/domain/services/listing-title.service.ts`.
Перенести логику из `ListingsService.generateTitle()` (строки 510–535).

**Интерфейс:**
```ts
interface BrandModelResolver {
  getBrandName(brandId: string): Promise<string | null>;
  getModelName(modelId: string): Promise<string | null>;
}

class ListingTitleService {
  async generate(vehicle: Vehicle, resolver: BrandModelResolver): Promise<string>
}
```

**Логика:** бренд + модель + год + трансмиссия → title. Если бренд/модель не найдены — fallback.

**Как проверить:** unit-тест с mock `BrandModelResolver`.

---

#### TODO-3.2: Создать PromotionRulesService

**Что сделать:**
Создать `core/backend/src/listings/domain/services/promotion-rules.service.ts`.
Перенести логику промо-правил:

```ts
class PromotionRulesService {
  canUserPromote(userType: string): boolean
  getMaxPromotedListings(): number   // лимит промо-объявлений
  calculatePromotionEnd(startDate: Date, days: number): Date
  calculateRemainingDays(pausedAt: Date, until: Date): number
}
```

**Откуда перенести:**
- Из `ListingsController.getPromotionAccess()` и `ListingsController.togglePromotion()`
- Из `ListingsService.togglePromotion()` — расчёт дат, лимиты

**Как проверить:** unit-тесты всех методов без зависимостей.

---

#### TODO-3.3: Создать SimilarListingsRankingService

**Что сделать:**
Создать `core/backend/src/listings/domain/services/similar-ranking.service.ts`.
Перенести алгоритм из `ListingsService.fetchSimilarCandidates()` (182 строки) и `applySellerDiversification()`.

```ts
class SimilarListingsRankingService {
  rank(current: ListingForRanking, candidates: ListingForRanking[]): ListingForRanking[]
  diversifyBySeller(listings: ListingForRanking[]): ListingForRanking[]
}
```

Использовать чистые доменные типы (без TypeORM entities).

**Как проверить:** unit-тесты с набором кандидатов — проверить порядок, диверсификацию.

---

#### TODO-3.4: Перенести нормализацию телефона в domain

**Что сделать:**
Создать `core/backend/src/auth/domain/services/phone.service.ts` (или `common/domain/`):

```ts
class PhoneService {
  normalize(phone: string): string       // перенести из SmsService.normalizePhoneNumber()
  isValid(phone: string): boolean
  equals(a: string, b: string): boolean
}
```

Обновить `SmsService` и `AuthService` — они вызывают `PhoneService.normalize()` вместо `SmsService.normalizePhoneNumber()`.

**Как проверить:** unit-тесты нормализации. Существующие тесты `auth.service.spec.ts` проходят.

---

### Фаза 4: Порты и интерфейсы репозиториев

#### TODO-4.1: Создать интерфейс ListingRepository

**Что сделать:**
Создать `core/backend/src/listings/application/ports/listing.repository.port.ts`:

```ts
export interface IListingRepository {
  findById(id: string): Promise<Listing | null>;
  save(listing: Listing): Promise<Listing>;
  search(criteria: SearchCriteria): Promise<{ data: Listing[]; total: number }>;
  countActiveByUser(userId: string): Promise<number>;
  findByVin(vin: string): Promise<Listing | null>;
  findSimilarCandidates(listing: Listing): Promise<Listing[]>;
}
```

**Как проверить:** интерфейс компилируется. Тип используется в use cases (TODO-5.x).

---

#### TODO-4.2: Создать интерфейс ListingCachePort

**Что сделать:**
Создать `core/backend/src/listings/application/ports/listing-cache.port.ts`:

```ts
export interface IListingCache {
  getSearchResults(key: string): Promise<{ data: Listing[]; total: number } | null>;
  setSearchResults(key: string, results: { data: Listing[]; total: number }, ttl: number): Promise<void>;
  getSingle(id: string): Promise<Listing | null>;
  setSingle(id: string, listing: Listing, ttl: number): Promise<void>;
  invalidateSearch(): Promise<void>;
  invalidateSingle(id: string): Promise<void>;
}
```

---

#### TODO-4.3: Реализовать TypeOrmListingRepository

**Что сделать:**
Создать `core/backend/src/listings/infrastructure/persistence/typeorm-listing.repository.ts`:
- Класс реализует `IListingRepository`
- Использует `@InjectRepository(Listing)` и TypeORM QueryBuilder
- Перенести логику построения запросов из `ListingsService.findAll()` (248 строк) — разбить на приватные методы

**Как проверить:** integration-тест с тестовой БД. Существующие e2e-тесты проходят.

---

#### TODO-4.4: Реализовать RedisListingCache

**Что сделать:**
Создать `core/backend/src/listings/infrastructure/cache/redis-listing-cache.ts`:
- Реализует `IListingCache`
- Использует `RedisService` из `CommonModule`
- Перенести логику кеширования из `ListingsService` (ключи, TTL, инвалидация)

**Как проверить:** integration-тест с Redis. Кеширование работает как раньше.

---

### Фаза 5: Use Cases

#### TODO-5.1: CreateListingUseCase

**Что сделать:**
Создать `core/backend/src/listings/application/use-cases/create-listing.use-case.ts`:

```ts
class CreateListingUseCase {
  constructor(
    private listingRepo: IListingRepository,
    private listingCache: IListingCache,
    private titleService: ListingTitleService,
  ) {}

  async execute(dto: CreateListingInput, userId: string): Promise<Listing>
}
```

**Логика (перенести из `ListingsService.create()`):**
1. Валидировать дату регистрации
2. Создать Vehicle
3. Сгенерировать title через `ListingTitleService`
4. Проверить лимит активных через domain (`User.canCreateListing()`)
5. Создать Listing
6. Сохранить через `IListingRepository.save()`
7. Инвалидировать кеш через `IListingCache.invalidateSearch()`

**Как проверить:** unit-тест с mock-репозиторием и mock-кешем.

---

#### TODO-5.2: SearchListingsUseCase

**Что сделать:**
Создать `core/backend/src/listings/application/use-cases/search-listings.use-case.ts`:

```ts
class SearchListingsUseCase {
  constructor(
    private listingRepo: IListingRepository,
    private listingCache: IListingCache,
  ) {}

  async execute(criteria: SearchCriteria): Promise<PaginatedResult<Listing>>
}
```

**Логика (перенести из `ListingsService.findAll()`, 248 строк):**
1. Проверить кеш
2. Если промах — вызвать `IListingRepository.search(criteria)`
3. Маскировать данные пользователей
4. Сохранить в кеш
5. Вернуть результат

Построение запросов (фильтры, сортировка) — в `TypeOrmListingRepository.search()`.

**Как проверить:** unit-тест use case. Integration-тест repository.

---

#### TODO-5.3: PublishListingUseCase, PauseListingUseCase, CloseListingUseCase

**Что сделать:**
Для каждого — отдельный use case. Пример `PublishListingUseCase`:

```ts
class PublishListingUseCase {
  async execute(listingId: string, userId: string): Promise<Listing> {
    const listing = await this.listingRepo.findById(listingId);
    if (!listing) throw new NotFoundException();
    if (listing.user_id !== userId) throw new ForbiddenException();

    const activeCount = await this.listingRepo.countActiveByUser(userId);
    listing.publish(); // доменный метод (TODO-2.1)

    await this.listingRepo.save(listing);
    await this.listingCache.invalidateSearch();
    return listing;
  }
}
```

**Как проверить:** unit-тест: listing.publish() вызван, сохранение через репозиторий, кеш инвалидирован.

---

#### TODO-5.4: TogglePromotionUseCase

**Что сделать:**
Создать use case. Перенести из `ListingsService.togglePromotion()` (81 строка):

1. Проверить права через `PromotionRulesService.canUserPromote()`
2. Найти listing
3. Вызвать `listing.startPromotion(days)` или `listing.stopPromotion()`
4. Сохранить через репозиторий
5. Создать/обновить PromotionHistory
6. Инвалидировать кеш

**Как проверить:** unit-тест с mock-ами.

---

#### TODO-5.5: FindSimilarUseCase

**Что сделать:**
Создать use case:

1. Найти listing
2. Получить кандидатов через `IListingRepository.findSimilarCandidates()`
3. Ранжировать через `SimilarListingsRankingService.rank()` (TODO-3.3)
4. Кешировать результат
5. Вернуть

**Как проверить:** unit-тест с mock-ами. Алгоритм ранжирования — отдельные unit-тесты (TODO-3.3).

---

### Фаза 6: Разделение AuthService

#### TODO-6.1: Выделить PasswordService

**Что сделать:**
Создать `core/backend/src/auth/domain/services/password.service.ts`:

```ts
class PasswordService {
  async hash(password: string): Promise<string>
  async verify(password: string, hash: string): Promise<boolean>
}
```

Перенести использование `bcrypt` из `AuthService.register()` и `AuthService.resetPassword()`.

**Как проверить:** unit-тест. `AuthService` использует `PasswordService` вместо прямого `bcrypt`.

---

#### TODO-6.2: Разделить AuthService на use cases

**Что сделать:**
Вместо монолитного `AuthService` (454 строки) — отдельные use cases:

- `RegisterUserUseCase` — из `AuthService.register()`
- `LoginUserUseCase` — из `AuthService.login()`
- `RefreshTokensUseCase` — из `AuthService.refreshTokens()`
- `ResetPasswordUseCase` — из `AuthService.requestPasswordReset()` + `verifyResetCode()` + `resetPassword()`
- `DeleteAccountUseCase` — из `AuthService.deleteAccount()`
- `UpdateProfileUseCase` — из `AuthService.updateProfile()`

Каждый use case — отдельный файл, одна ответственность.

**Как проверить:** все эндпоинты auth работают идентично. Тесты `auth.service.spec.ts` адаптированы.

---

### Фаза 7: Очистка и оптимизация

#### TODO-7.1: Убрать дублирование entities в BrandsModule

**Что сделать:**
`BrandsModule` регистрирует `Vehicle`, `Listing`, `ListingView`, `Favorite` — чужие entities.
Перенести логику `BrandsService.deleteAll()` (каскадное удаление) в отдельный скрипт или admin use case. `BrandsModule` должен работать только с `Brand` и `VehicleModel`.

**Как проверить:** `BrandsModule` не импортирует entities из других модулей. `npm run build` проходит.

---

#### TODO-7.2: Переместить доменные утилиты из common/ в модули

**Что сделать:**
- `validateRegistrationDate()` → `listings/domain/`
- `cleanUserData()` → `users/domain/`
- `applyCitiesFilter()` → `listings/infrastructure/`

**Как проверить:** `npm run build` проходит. Import-пути обновлены.

---

#### TODO-7.3: Унифицировать кеширование

**Что сделать:**
1. Каждый модуль с кешем реализует свой `CachePort` (Listings, Brands, Cities).
2. Все TTL, ключи, инвалидация — в одном месте (infrastructure).
3. Убрать разбросанные `redisService.del()` / `redisService.invalidateByPrefix()` из сервисов.

**Как проверить:** кеширование работает как раньше. Все ключи/TTL определены в infrastructure.

---

#### TODO-7.4: Удалить «толстый» ListingsService

**Что сделать:**
После выполнения TODO-5.1–5.5 `ListingsService` должен остаться тонким фасадом (если нужен для обратной совместимости) или быть полностью заменён use cases. Контроллер вызывает use cases напрямую.

**Как проверить:** `ListingsService` удалён или содержит < 50 строк (делегирование). Все эндпоинты работают.

---

## 5. Порядок выполнения и зависимости

```
Фаза 0: Структура папок (0.1 → 0.2 → 0.3)
   ↓
Фаза 1: Вынос из контроллеров (1.1, 1.2, 1.3, 1.4 — параллельно)
   ↓
Фаза 2: Доменные сущности (2.1, 2.2, 2.3 — параллельно)
   ↓
Фаза 3: Domain Services (3.1, 3.2, 3.3, 3.4 — параллельно)
   ↓
Фаза 4: Порты и репозитории (4.1 → 4.3, 4.2 → 4.4)
   ↓
Фаза 5: Use Cases (5.1, 5.2, 5.3, 5.4, 5.5 — после фаз 2–4)
   ↓
Фаза 6: Разделение Auth (6.1 → 6.2)
   ↓
Фаза 7: Очистка (7.1, 7.2, 7.3, 7.4 — после фаз 5–6)
```

Каждая фаза может быть выполнена отдельным PR. Код компилируется и работает после каждого TODO.

---

## 6. Правила для нового кода (действуют с момента утверждения)

1. **Контроллер** — только DTO-валидация → вызов use case → возврат ответа. Ноль бизнес-логики.
2. **Use case** — оркестрация: вызывает domain, repository, cache. Не содержит бизнес-правил.
3. **Domain entity** — содержит инварианты и переходы состояний. Не зависит от NestJS, TypeORM, Redis.
4. **Domain service** — логика, не принадлежащая одной сущности. Чистые функции.
5. **Infrastructure** — реализует порты. TypeORM, Redis, SMS, Email, S3 — только здесь.
6. **Ни один новый метод сервиса** не должен превышать 50 строк.
7. **Тесты:** каждый domain entity/service — unit-тест. Каждый use case — unit-тест с mock-ами.

---

## 7. Связь с остальной документацией

- Мультирепозиторий и платформы: [MULTI_REPOSITORY.md](../architecture/MULTI_REPOSITORY.md), [ARCHITECTURE_OVERVIEW.md](../architecture/ARCHITECTURE_OVERVIEW.md)
- Скрипты и платформенные конфиги: [SCRIPTS_ARCHITECTURE.md](../architecture/SCRIPTS_ARCHITECTURE.md)
- Деплой и окружение: [DEPLOYMENT.md](../guides/DEPLOYMENT.md), [LOCAL_DEVELOPMENT.md](../guides/LOCAL_DEVELOPMENT.md)

Слои и DDD применяются к коду в `core/backend/`; платформенные репозитории содержат конфиг, локали, тему, ассеты и не дублируют бизнес-логику.
