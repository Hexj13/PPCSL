# Vehicle Type Toggles - Implementation Documentation

## Overview

Система переключения типа транспорта (легковой, грузовой, мотоцикл) для фильтрации объявлений на странице поиска и создания объявлений. Фича включает изменения в базе данных, скрипты для генерации и синхронизации данных, а также UI компоненты для поиска и создания объявлений.

**Статус**: ✅ UI реализовано, ⏳ Backend и фильтрация в разработке

**Расположение**: 
- Форма поиска (`SearchFilters`), верхняя часть, над основными вкладками фильтров
- Форма создания объявления (планируется)

## Суть фичи

### Цель

Обеспечить правильную фильтрацию объявлений по типу транспорта (легковой, грузовой, мототехника) на всех этапах работы с системой: поиск, создание объявления, просмотр результатов.

### Основные требования

1. **База данных - Марки (Brands)**
   - Добавить поле `vehicle_types` (массив типов транспорта)
   - У марки может быть несколько типов (например, Mercedes - легковые и грузовые)
   - Типы: `'car' | 'truck' | 'moto'`

2. **База данных - Модели (VehicleModel)**
   - Добавить обязательное поле `vehicle_type` (один тип)
   - У модели может быть только один тип транспорта
   - Типы: `'car' | 'truck' | 'moto'`

3. **Скрипт генерации данных**
   - Обновить скрипт `add-brands.ts` для проставления типов транспорта
   - Для марок: указать все типы, к которым относится марка
   - Для моделей: указать один тип транспорта для каждой модели

4. **Синхронизация существующих данных**
   - Создать скрипт для синхронизации уже существующих марок и моделей
   - Не зачищать данные, только добавлять/обновлять типы транспорта
   - Миграция должна быть безопасной и обратимой

5. **Создание объявления**
   - Добавить переключатели типов транспорта в форму создания
   - При выборе типа транспорта ограничивать доступные марки и модели
   - Показывать только марки и модели, соответствующие выбранному типу

6. **Поиск на главной**
   - При выборе типа транспорта ограничивать доступные марки и модели в фильтрах
   - Показывать только марки и модели, соответствующие выбранному типу

7. **Сброс фильтров при переключении типа**
   - При выборе типа транспорта на поиске сбрасывать все выбранные фильтры
   - Очищать выбранные марки, модели, типы кузова и другие параметры

8. **Фильтрация результатов поиска**
   - При выборе типа транспорта сразу ограничивать выдачу объявлений
   - Показывать только объявления с соответствующим типом транспорта
   - Синхронизировать с URL параметрами (`?vehicleType=car`)

9. **Анализ и оптимизация БД**
   - Проанализировать текущую структуру хранения марок и моделей
   - Определить необходимость оптимизации индексов
   - Оценить производительность запросов с учетом новых полей

10. **Наполнение данными - Мототехника**
    - Создать скрипт для наполнения мотоциклами и мопедами
    - Добавить марки мототехники (Yamaha, Honda, Kawasaki, Suzuki, Ducati, etc.)
    - Добавить модели для каждой марки

11. **Динамические изменения UI**
    - При выборе типа транспорта изменять плитки популярных типов кузова
    - Для мототехники скрывать/изменять некоторые поля (например, нет вариатора)
    - Адаптировать выпадающие списки под выбранный тип транспорта

12. **Применение фильтрации**
    - Использовать фильтрацию по типу транспорта на странице поиска
    - В будущем применять на других страницах (каталог, избранное, etc.)

## Текущая реализация

### UI Компоненты

#### Переключатели типов транспорта

Три иконки-переключателя:
- 🚗 **Легковой** (`car`) - активен по умолчанию
- 🚛 **Грузовой** (`truck`)
- 🏍️ **Мотоцикл** (`moto`)

**Визуальные состояния:**
- **Активная иконка**: Белый цвет (`text-white`), зеленый индикатор снизу, фон `bg-primary-500/5`
- **Неактивная иконка**: Серый цвет (`text-gray-400`), без индикатора
- **Hover**: Закругленные углы сверху (`rounded-t-lg`), легкий фон при наведении

**Размеры:**
- Высота кнопки: `48px` (`h-12`)
- Размер иконки: `40px` (`w-10 h-10`)
- Иконки отзеркалены горизонтально (`scale-x-[-1]`)

#### Анимация

- Плавная анимация переключения зеленого индикатора снизу (аналогично основным вкладкам)
- Длительность: `300ms` (`duration-300`)
- Easing: `ease-in-out`

### Адаптивный дизайн

**Мобильные и планшеты (< lg):**
- Переключатели расположены **над** основными вкладками фильтров
- Выравнивание по левому краю (`justify-start`)
- Горизонтальная прокрутка при переполнении
- Fade-эффект справа при наличии прокрутки

**Десктоп (≥ lg):**
- Переключатели расположены **справа** от основных вкладок
- Выравнивание по правому краю (`lg:justify-end`)
- Абсолютное позиционирование (`lg:absolute lg:right-4`)
- Вертикальное центрирование относительно вкладок

### Технические детали

#### Компоненты

**Иконки** (`core/frontend/ui/icons.tsx`):
- `CarIcon` - компонент иконки легкового авто
- `TruckIcon` - компонент иконки грузового авто
- `MotoIcon` - компонент иконки мотоцикла

**SVG файлы** (`core/frontend/public/icons/`):
- `car.svg`
- `truck.svg`
- `moto.svg`

**Оптимизация viewBox:**
- Все иконки используют оптимизированный `viewBox`, который соответствует реальному размеру path
- Это позволяет отображать крупные иконки без выхода за границы кнопки
- Пример: `viewBox="250 1150 1050 450"` вместо `viewBox="0 0 1536 2752"`

#### State Management

```typescript
const [vehicleType, setVehicleType] = useState<'car' | 'moto' | 'truck'>('car');
```

**По умолчанию**: `'car'` (легковой)

#### Индикатор активного состояния

```typescript
const [vehicleIndicatorStyle, setVehicleIndicatorStyle] = useState({ left: 0, width: 0 });
```

Динамически вычисляется позиция и ширина зеленого индикатора на основе активной кнопки.

#### Scroll Detection

```typescript
const [showVehicleFade, setShowVehicleFade] = useState(false);
```

Определяет, нужно ли показывать fade-эффект справа при горизонтальной прокрутке.

### Интеграция в SearchFilters

**Расположение в DOM:**
```tsx
<div className="mb-6 border-b border-primary-500/20 -mx-4 md:-mx-5 px-4 md:px-5 relative">
  {/* Переключатели типов транспорта */}
  <div ref={vehicleIconsContainerRef} className="flex justify-start lg:justify-end ...">
    {/* Кнопки с иконками */}
  </div>
  
  {/* Основные вкладки фильтров */}
  <div ref={tabsContainerRef} className="relative flex gap-1 ...">
    {/* Вкладки */}
  </div>
</div>
```

## База данных

### Текущая структура

**Brand (Марки):**
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

**VehicleModel (Модели):**
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

**Vehicle (Транспорт в объявлениях):**
```typescript
@Entity('vehicles')
export class Vehicle {
  id: string;
  brand_id: string;
  brand: Brand;
  model_id: string;
  model: VehicleModel;
  year: number;
  // ... другие поля
}
```

### Необходимые изменения

#### 1. Добавить поле в Brand

```typescript
@Entity('brands')
export class Brand {
  // ... существующие поля
  
  @Column('simple-array', { nullable: true })
  vehicle_types: ('car' | 'truck' | 'moto')[];
}
```

**Особенности:**
- Тип: массив строк (`simple-array`)
- Может быть `null` (для обратной совместимости)
- Примеры значений: `['car', 'truck']`, `['car']`, `['moto']`

#### 2. Добавить поле в VehicleModel

```typescript
@Entity('vehicle_models')
export class VehicleModel {
  // ... существующие поля
  
  @Column({
    type: 'enum',
    enum: ['car', 'truck', 'moto'],
    nullable: false, // Обязательное поле
  })
  vehicle_type: 'car' | 'truck' | 'moto';
}
```

**Особенности:**
- Тип: enum (один из трех значений)
- Обязательное поле (`nullable: false`)
- Каждая модель имеет только один тип транспорта

#### 3. Миграция базы данных

**Создать миграцию:**
```bash
npm run migration:generate -- AddVehicleTypesToBrandsAndModels
```

**Содержание миграции:**
1. Добавить колонку `vehicle_types` в таблицу `brands` (nullable)
2. Добавить колонку `vehicle_type` в таблицу `vehicle_models` (nullable сначала)
3. Заполнить данные через скрипт синхронизации
4. Сделать `vehicle_type` NOT NULL после заполнения

### Индексы

**Рекомендуемые индексы:**
```typescript
// Для быстрого поиска марок по типу транспорта
@Index(['vehicle_types'])

// Для быстрого поиска моделей по типу транспорта
@Index(['vehicle_type'])

// Композитный индекс для фильтрации объявлений
@Index(['brand_id', 'vehicle_type'])
```

## Скрипты

### 1. Обновление скрипта генерации данных

**Файл:** `core/backend/src/scripts/stage/add-brands.ts`

**Изменения:**
- Добавить маппинг марок к типам транспорта
- Добавить маппинг моделей к типам транспорта
- При создании/обновлении марок проставлять `vehicle_types`
- При создании/обновлении моделей проставлять `vehicle_type`

**Пример структуры данных:**
```typescript
const BRANDS_VEHICLE_TYPES: Record<string, ('car' | 'truck' | 'moto')[]> = {
  'Mercedes-Benz': ['car', 'truck'],
  'BMW': ['car', 'moto'],
  'Toyota': ['car', 'truck'],
  'Honda': ['car', 'moto'],
  'Yamaha': ['moto'],
  // ...
};

const MODELS_VEHICLE_TYPES: Record<string, 'car' | 'truck' | 'moto'> = {
  'Mercedes-Benz': {
    'C-Class': 'car',
    'Sprinter': 'truck',
    // ...
  },
  // ...
};
```

### 2. Скрипт синхронизации существующих данных

**Файл:** `core/backend/src/scripts/stage/sync-vehicle-types.ts`

**Функциональность:**
- Прочитать все существующие марки и модели из БД
- Определить тип транспорта на основе названия/контекста
- Обновить записи в БД
- Логировать изменения
- Поддерживать откат изменений

**Алгоритм:**
1. Получить все марки без `vehicle_types`
2. Для каждой марки определить типы транспорта
3. Обновить марку
4. Получить все модели без `vehicle_type`
5. Для каждой модели определить тип транспорта на основе марки и названия
6. Обновить модель

### 3. Скрипт наполнения мототехникой

**Файл:** `core/backend/src/scripts/stage/add-motorcycles.ts`

**Функциональность:**
- Добавить марки мототехники (Yamaha, Honda, Kawasaki, Suzuki, Ducati, KTM, etc.)
- Добавить модели для каждой марки
- Установить `vehicle_type: 'moto'` для всех моделей
- Установить `vehicle_types: ['moto']` для всех марок

**Структура данных:**
```typescript
const MOTORCYCLE_BRANDS: Record<string, string[]> = {
  'Yamaha': ['YZF-R1', 'YZF-R6', 'MT-07', 'MT-09', 'Ténéré 700', ...],
  'Honda': ['CBR1000RR', 'CBR600RR', 'CB650R', 'Africa Twin', ...],
  'Kawasaki': ['Ninja ZX-10R', 'Ninja ZX-6R', 'Z900', 'Versys 650', ...],
  // ...
};
```

## Backend API

### Изменения в BrandsService

**Метод получения марок с фильтрацией:**
```typescript
async findAll(vehicleType?: 'car' | 'truck' | 'moto'): Promise<Brand[]> {
  const query = this.brandRepository.createQueryBuilder('brand');
  
  if (vehicleType) {
    query.where('brand.vehicle_types @> ARRAY[:vehicleType]', { vehicleType });
  }
  
  return query.getMany();
}
```

**Метод получения моделей с фильтрацией:**
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

### Изменения в ListingsService

**Фильтрация объявлений по типу транспорта:**
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
  
  // ... остальные фильтры
  
  return query.getMany();
}
```

## Frontend

### Поиск (SearchFilters)

#### Текущая реализация

**Реализовано:**
- ✅ Визуальные переключатели типов транспорта
- ✅ Состояние активного типа (по умолчанию: легковой)
- ✅ Плавная анимация переключения
- ✅ Адаптивный дизайн (мобильный/планшет/десктоп)
- ✅ Горизонтальная прокрутка при переполнении
- ✅ Fade-эффект при прокрутке

#### Планируемая реализация

**1. Синхронизация с URL:**
```typescript
useEffect(() => {
  const params = new URLSearchParams(searchParams);
  if (vehicleType === 'car') {
    params.delete('vehicleType');
  } else {
    params.set('vehicleType', vehicleType);
  }
  router.push(`?${params.toString()}`);
}, [vehicleType]);
```

**2. Восстановление из URL:**
```typescript
useEffect(() => {
  const vehicleTypeParam = searchParams.get('vehicleType');
  if (vehicleTypeParam && ['car', 'truck', 'moto'].includes(vehicleTypeParam)) {
    setVehicleType(vehicleTypeParam as 'car' | 'truck' | 'moto');
  }
}, [searchParams]);
```

**3. Сброс фильтров при переключении:**
```typescript
const handleVehicleTypeChange = (type: 'car' | 'truck' | 'moto') => {
  setVehicleType(type);
  
  // Сброс всех фильтров
  setSelectedBrands([]);
  setSelectedModels([]);
  setSelectedBodyTypes([]);
  // ... сброс других фильтров
  
  // Обновление URL
  const params = new URLSearchParams();
  if (type !== 'car') {
    params.set('vehicleType', type);
  }
  router.push(`?${params.toString()}`);
};
```

**4. Фильтрация марок и моделей:**
```typescript
// При загрузке марок
const fetchBrands = async () => {
  const response = await brandsApi.findAll(vehicleType);
  setBrands(response.data);
};

// При выборе марки - загрузка моделей
const fetchModels = async (brandId: string) => {
  const response = await brandsApi.findModelsByBrand(brandId, vehicleType);
  setModels(response.data);
};
```

**5. Динамическое изменение популярных типов кузова:**
```typescript
const getBodyTypesForVehicleType = (type: 'car' | 'truck' | 'moto') => {
  switch (type) {
    case 'car':
      return ['SUV', 'Hatchback', 'Wagon', 'Minivan', 'Sedan', 'Convertible'];
    case 'truck':
      return ['Pickup', 'Van', 'Truck'];
    case 'moto':
      return ['Naked', 'Sport', 'Touring', 'Cruiser', 'Adventure', 'Scooter'];
    default:
      return [];
  }
};
```

**6. Условное отображение полей:**
```typescript
// Скрыть поле "Коробка передач" для мотоциклов (нет вариатора)
{vehicleType !== 'moto' && (
  <Select
    label="Пренос"
    options={transmissionOptions}
    // ...
  />
)}

// Адаптировать опции коробки передач
const transmissionOptions = vehicleType === 'moto' 
  ? ['Manual', 'Automatic'] // Без вариатора
  : ['Manual', 'Automatic', 'CVT'];
```

### Создание объявления

#### Планируемая реализация

**1. Добавить переключатели типов транспорта:**
- Использовать те же компоненты, что и в поиске
- Расположить в начале формы создания
- Обязательный выбор типа транспорта

**2. Ограничение марок и моделей:**
```typescript
// При выборе типа транспорта
useEffect(() => {
  if (vehicleType) {
    // Загрузить только марки с соответствующим типом
    fetchBrands(vehicleType);
    // Сбросить выбранную марку и модель
    setSelectedBrand(null);
    setSelectedModel(null);
  }
}, [vehicleType]);

// При выборе марки
useEffect(() => {
  if (selectedBrand && vehicleType) {
    // Загрузить только модели с соответствующим типом
    fetchModels(selectedBrand.id, vehicleType);
    // Сбросить выбранную модель
    setSelectedModel(null);
  }
}, [selectedBrand, vehicleType]);
```

**3. Валидация:**
```typescript
const validateForm = () => {
  if (!vehicleType) {
    return { error: 'Моля изберете тип на возило' };
  }
  // ... остальная валидация
};
```

## Оптимизация БД

### Анализ текущей структуры

**Текущие индексы:**
- `brands`: `['order']`
- `vehicle_models`: `['brand_id']`, `['order']`
- `vehicles`: `['brand_id']`, `['model_id']`, `['brand_id', 'model_id']`, `['year']`, `['fuel']`, `['transmission']`, `['body_type']`, `['mileage_km']`, `['engine_displ_l']`

### Рекомендации

**1. Добавить индексы для новых полей:**
```sql
CREATE INDEX idx_brands_vehicle_types ON brands USING GIN(vehicle_types);
CREATE INDEX idx_vehicle_models_vehicle_type ON vehicle_models(vehicle_type);
CREATE INDEX idx_vehicle_models_brand_type ON vehicle_models(brand_id, vehicle_type);
```

**2. Композитные индексы для запросов:**
```sql
-- Для поиска моделей по марке и типу
CREATE INDEX idx_models_brand_type ON vehicle_models(brand_id, vehicle_type);

-- Для фильтрации объявлений
CREATE INDEX idx_vehicles_model_type ON vehicles(model_id) 
  INCLUDE (vehicle_type) -- если поддерживается
```

**3. Анализ производительности:**
- Проверить планы выполнения запросов с `EXPLAIN ANALYZE`
- Оптимизировать запросы с фильтрацией по типу транспорта
- Рассмотреть денормализацию (добавить `vehicle_type` в таблицу `vehicles`)

## Файлы

### Компоненты

- `core/frontend/components/SearchFilters.tsx` - основной компонент с переключателями
- `core/frontend/ui/icons.tsx` - компоненты иконок (CarIcon, TruckIcon, MotoIcon)
- `core/frontend/ui/index.ts` - экспорты иконок

### Ресурсы

- `core/frontend/public/icons/car.svg` - SVG иконка легкового авто
- `core/frontend/public/icons/truck.svg` - SVG иконка грузового авто
- `core/frontend/public/icons/moto.svg` - SVG иконка мотоцикла

### Backend

- `core/backend/src/brands/entities/brand.entity.ts` - сущность марки (требует изменений)
- `core/backend/src/brands/entities/vehicle-model.entity.ts` - сущность модели (требует изменений)
- `core/backend/src/brands/brands.service.ts` - сервис марок (требует изменений)
- `core/backend/src/listings/listings.service.ts` - сервис объявлений (требует изменений)

### Скрипты

- `core/backend/src/scripts/stage/add-brands.ts` - скрипт генерации марок и моделей (требует изменений)
- `core/backend/src/scripts/stage/sync-vehicle-types.ts` - скрипт синхронизации типов (создать)
- `core/backend/src/scripts/stage/add-motorcycles.ts` - скрипт наполнения мототехникой (создать)

### Миграции

- `core/backend/src/migrations/XXXXXX-AddVehicleTypesToBrandsAndModels.ts` - миграция БД (создать)

## Стилизация

### Цвета

- **Активная иконка**: `text-white`
- **Неактивная иконка**: `text-gray-400`
- **Индикатор**: `bg-primary-400` (зеленый)
- **Фон при hover**: `bg-primary-500/5`

### Анимации

- **Переключение индикатора**: `transition-all duration-300 ease-in-out`
- **Цвет иконки**: `transition-colors duration-300`

### Responsive Breakpoints

- **Мобильный/Планшет**: `< lg` (до 1024px)
- **Десктоп**: `≥ lg` (от 1024px)

## TODO

### Backend

- [ ] Создать миграцию для добавления полей `vehicle_types` и `vehicle_type`
- [ ] Обновить сущности `Brand` и `VehicleModel`
- [ ] Обновить скрипт `add-brands.ts` для проставления типов транспорта
- [ ] Создать скрипт `sync-vehicle-types.ts` для синхронизации существующих данных
- [ ] Создать скрипт `add-motorcycles.ts` для наполнения мототехникой
- [ ] Обновить `BrandsService` для фильтрации по типу транспорта
- [ ] Обновить `ListingsService` для фильтрации объявлений
- [ ] Добавить индексы для оптимизации запросов
- [ ] Протестировать производительность запросов

### Frontend - Поиск

- [ ] Синхронизировать с URL параметрами
- [ ] Восстановление состояния из URL/storage
- [ ] Сброс фильтров при переключении типа транспорта
- [ ] Фильтрация марок и моделей по типу транспорта
- [ ] Фильтрация результатов поиска
- [ ] Динамическое изменение популярных типов кузова
- [ ] Условное отображение полей (коробка передач, etc.)
- [ ] Тесты компонента

### Frontend - Создание объявления

- [ ] Интеграция переключателей типов транспорта
- [ ] Ограничение марок и моделей по типу транспорта
- [ ] Валидация обязательного выбора типа
- [ ] Условное отображение полей формы
- [ ] Тесты формы

### Тестирование

- [ ] Unit тесты для сервисов
- [ ] Integration тесты для API
- [ ] E2E тесты для поиска
- [ ] E2E тесты для создания объявления
- [ ] Тесты производительности БД

## Примеры использования

### Backend - Получение марок с фильтрацией

```typescript
// Получить все марки легковых авто
const carBrands = await brandsService.findAll('car');

// Получить все марки мототехники
const motoBrands = await brandsService.findAll('moto');
```

### Backend - Получение моделей с фильтрацией

```typescript
// Получить модели Mercedes только для легковых авто
const mercedesCarModels = await brandsService.findModelsByBrand(
  mercedesBrandId,
  'car'
);
```

### Frontend - Переключение типа транспорта

```typescript
const handleVehicleTypeChange = (type: 'car' | 'truck' | 'moto') => {
  setVehicleType(type);
  
  // Сброс фильтров
  resetAllFilters();
  
  // Обновление URL
  updateURL({ vehicleType: type });
  
  // Перезагрузка данных
  refetchBrands(type);
  refetchListings({ vehicleType: type });
};
```

## Связанные документы

- [Search Filters Architecture](../architecture/README.md)
- [UI Components Documentation](../../frontend/docs/README.md)
- [Database Schema](../architecture/TECHNICAL.md)
- [Scripts Documentation](../../backend/docs/SCRIPTS.md)

---

[← Назад к списку фич](./README.md)
