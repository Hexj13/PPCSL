# Sitemap Generation - Документация

## Обзор

Sitemap генерируется динамически на основе данных из базы данных. Используется поисковыми системами для индексации страниц сайта.

**Расположение**: `core/frontend/app/sitemap.ts`

**Основной формат**: `sitemap.txt` (приоритетный)

**URL доступа**: `/sitemap.txt`

## Что включается в sitemap

| Тип | Включается | Примечание |
|-----|------------|------------|
| Базовые страницы | ✅ | /, /listings, /terms, /privacy, /faq |
| URL марок | ✅ | /?brand=mercedes-benz |
| URL марок + моделей | ✅ | /?brand=mercedes-benz&model=c-class |
| URL типов кузовов | ✅ | /?body_types=SUV&vehicleType=truck |
| Конкретные объявления | ❌ | /listings/{id} — НЕ добавляются |

**Почему объявления не включаются**: Конкретные объявления индексируются поисковыми системами самостоятельно через внутренние ссылки на сайте.

## Структура URL

### Базовые страницы

| URL | Приоритет | Частота обновления |
|-----|-----------|-------------------|
| `/` | 1.0 | daily |
| `/listings` | 0.9 | hourly |
| `/terms` | 0.8 | monthly |
| `/privacy` | 0.8 | monthly |
| `/faq` | 0.8 | monthly |

### URL марок и моделей

#### Правила формирования vehicleType

| Категория | Параметр vehicleType | Пример URL |
|-----------|---------------------|------------|
| Легковые (`car`) | НЕ добавляется (по умолчанию) | `/?brand=mercedes-benz` |
| Грузовые (`truck`) | `&vehicleType=truck` | `/?brand=mercedes-benz&vehicleType=truck` |
| Мото (`moto`) | `&vehicleType=moto` | `/?brand=yamaha&vehicleType=moto` |

#### Примеры URL марок

```
# Легковые (vehicleType опускается)
https://kupito.club/?brand=mercedes-benz
https://kupito.club/?brand=bmw

# Грузовые
https://kupito.club/?brand=mercedes-benz&vehicleType=truck
https://kupito.club/?brand=man&vehicleType=truck

# Мото
https://kupito.club/?brand=yamaha&vehicleType=moto
https://kupito.club/?brand=ducati&vehicleType=moto
```

#### Примеры URL моделей

```
# Легковые
https://kupito.club/?brand=mercedes-benz&model=c-class
https://kupito.club/?brand=bmw&model=3-series

# Грузовые
https://kupito.club/?brand=mercedes-benz&model=actros&vehicleType=truck
https://kupito.club/?brand=man&model=tgx&vehicleType=truck

# Мото
https://kupito.club/?brand=yamaha&model=yzf-r1&vehicleType=moto
https://kupito.club/?brand=ducati&model=panigale-v4&vehicleType=moto
```

### URL типов кузовов

#### Грузовые

```
https://kupito.club/?body_types=Truck&vehicleType=truck
https://kupito.club/?body_types=Bus&vehicleType=truck
https://kupito.club/?body_types=SemiTruck&vehicleType=truck
https://kupito.club/?body_types=Tractor&vehicleType=truck
```

#### Мото

```
https://kupito.club/?body_types=Naked&vehicleType=moto
https://kupito.club/?body_types=Sport&vehicleType=moto
https://kupito.club/?body_types=Touring&vehicleType=moto
```

## Источники данных

### Таблица `brands`

```typescript
interface Brand {
  id: string;
  name: string;
  vehicle_types?: ('car' | 'truck' | 'moto')[];
}
```

Поле `vehicle_types` — массив категорий. Марка может относиться к нескольким категориям (например, Mercedes-Benz: легковые + грузовые).

### Таблица `vehicle_models`

```typescript
interface VehicleModel {
  id: string;
  name: string;
  brand_id: string;
  vehicle_type?: 'car' | 'truck' | 'moto';
}
```

Поле `vehicle_type` — одна категория. Каждая модель относится только к одной категории.

### API endpoints

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/api/brands` | GET | Все марки с `vehicle_types` |
| `/api/brands/models/batch` | POST | Модели по списку brand_ids |

## Алгоритм генерации

### 1. Классификация марок

```typescript
const brandsByVehicleType = { car: [], truck: [], moto: [] };

allBrands.forEach((brand) => {
  const vehicleTypes = brand.vehicle_types || [];
  
  if (vehicleTypes.length === 0) {
    brandsByVehicleType.car.push(brand);  // По умолчанию — легковые
  } else {
    vehicleTypes.forEach((type) => {
      brandsByVehicleType[type].push(brand);
    });
  }
});
```

### 2. Генерация URL марки

```typescript
const vehicleTypeParam = vehicleType ? `&vehicleType=${vehicleType}` : '';
const brandUrl = `${siteUrl}/?brand=${brandSlug}${vehicleTypeParam}`;
```

### 3. Определение vehicleType для модели

```
model.vehicle_type существует и !== 'car'
    → использовать model.vehicle_type

иначе
    → использовать vehicleType из марки (или пусто для car)
```

## Примеры мультикатегорийных марок

### Mercedes-Benz (car + truck)

**Данные в БД:**
```json
{ "name": "Mercedes-Benz", "vehicle_types": ["car", "truck"] }
```

**Модели:**
```json
[
  { "name": "C-Class", "vehicle_type": "car" },
  { "name": "Actros", "vehicle_type": "truck" }
]
```

**Генерируемые URL:**
```
/?brand=mercedes-benz
/?brand=mercedes-benz&model=c-class
/?brand=mercedes-benz&vehicleType=truck
/?brand=mercedes-benz&model=actros&vehicleType=truck
```

### BMW (car + moto)

**Данные в БД:**
```json
{ "name": "BMW", "vehicle_types": ["car", "moto"] }
```

**Генерируемые URL:**
```
/?brand=bmw
/?brand=bmw&model=3-series
/?brand=bmw&vehicleType=moto
/?brand=bmw&model=s-1000-rr&vehicleType=moto
```

## Проверка работы формы поиска

При переходе по URL из sitemap форма поиска должна корректно:

1. **Определить категорию транспорта** по параметру `vehicleType`
2. **Переключить вкладку** на соответствующую категорию (легковые/грузовые/мото)
3. **Установить выбранную марку** в фильтр
4. **Установить выбранную модель** в фильтр (если указана)
5. **Установить типы кузовов** в фильтр (если указаны)
6. **Загрузить релевантные результаты** для выбранной категории

### Чек-лист тестирования

| URL | Ожидаемое поведение |
|-----|---------------------|
| `/?brand=mercedes-benz` | Вкладка "Легковые", марка Mercedes-Benz выбрана |
| `/?brand=mercedes-benz&model=c-class` | Вкладка "Легковые", марка + модель выбраны |
| `/?brand=mercedes-benz&vehicleType=truck` | Вкладка "Грузовые", марка Mercedes-Benz выбрана |
| `/?brand=mercedes-benz&model=actros&vehicleType=truck` | Вкладка "Грузовые", марка + модель выбраны |
| `/?brand=yamaha&vehicleType=moto` | Вкладка "Мото", марка Yamaha выбрана |
| `/?brand=yamaha&model=yzf-r1&vehicleType=moto` | Вкладка "Мото", марка + модель выбраны |
| `/?body_types=Truck&vehicleType=truck` | Вкладка "Грузовые", тип кузова Truck выбран |
| `/?body_types=Naked,Sport&vehicleType=moto` | Вкладка "Мото", типы кузова Naked и Sport выбраны |

### Критические сценарии

1. **URL без vehicleType, но с мото-маркой**: 
   - URL: `/?brand=ducati`
   - Ожидание: Должна определиться категория "Мото" на основе `brand.vehicle_types`
   
2. **URL без vehicleType, но с мото типом кузова**:
   - URL: `/?body_types=Naked`
   - Ожидание: Должна определиться категория "Мото" на основе типа кузова

3. **URL с мультикатегорийной маркой без vehicleType**:
   - URL: `/?brand=bmw` (BMW = car + moto)
   - Ожидание: По умолчанию категория "Легковые"

## Типичные проблемы

### Мото/грузовая марка без vehicleType в URL

**Причина**: `brand.vehicle_types` не заполнено в БД

**Решение**:
```bash
cd core/backend
COUNTRY=mk npx ts-node src/scripts/stage/sync-vehicle-types.ts
```

### Модель с неправильным vehicleType

**Причина**: `model.vehicle_type` не заполнено или неверное

**Решение**:
```bash
COUNTRY=mk npx ts-node src/scripts/stage/audit-vehicle-types.ts --fix
```

## Связанные файлы

| Файл | Описание |
|------|----------|
| `core/frontend/app/sitemap.ts` | Генерация sitemap |
| `core/frontend/lib/server-api.ts` | API для получения марок/моделей |
| `core/frontend/lib/api.ts` | Типы Brand, VehicleModel |
| `core/backend/src/brands/brands.service.ts` | Backend сервис марок |

---

[← Назад к документации фич](./README.md)
