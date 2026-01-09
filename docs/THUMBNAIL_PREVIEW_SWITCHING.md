# Переключение фото через тамбы (Thumbnail Preview Switching)

Документ описывает **актуальную реализацию** переключения фото через тамбы на странице объявления.

## Где реализовано

- **Страница объявления**: `core/frontend/app/listings/[id]/ListingPageClient.tsx`

## Принцип работы

### Простая логика

1. **Тамбы и превью используют одинаковый URL** → один кеш браузера
2. **Клик по тамбе** → если фото в кеше (а оно там, т.к. тамба уже загружена) — мгновенный переход
3. **Лоудер** → показывается напрямую без задержек, только пока фото реально грузится

### Унификация качества изображений

Все изображения (тамбы и превью) используют одинаковые параметры:

```typescript
const IMAGE_QUALITY = 75;
const IMAGE_WIDTH = 1200;

const optimizedUrl = getOptimizedImageUrl(imageUrl, IMAGE_QUALITY, IMAGE_WIDTH);
```

**Почему это важно:**
- Один URL = один запрос к серверу
- Браузер кеширует изображение один раз
- Клик по тамбе → превью отображается мгновенно из кеша

### Предзагрузка соседних фото

При переключении на новое фото — фоном предзагружаем следующее:

```typescript
const nextIndex = (currentImageIndex + 1) % images.length;
const optimizedUrl = getOptimizedImageUrl(nextImageUrl, IMAGE_QUALITY, IMAGE_WIDTH);

if (!preloadedImagesRef.current.has(optimizedUrl)) {
  const img = new Image();
  img.onload = () => {
    preloadedImagesRef.current.add(optimizedUrl);
  };
  img.src = optimizedUrl;
}
```

- Используется простой `new Image()` — надёжно и видно в Network tab
- URL добавляется в кеш `preloadedImagesRef` после загрузки

### Лоудер

Лоудер использует `useLoadingState` с `minDisplayTime: 1000`:

```typescript
const { visible: showMainImageLoader } = useLoadingState({
  isLoading: mainImageLoading,
  minDisplayTime: 1000,
});
```

- Появляется **сразу**, когда фото грузится (без `showDelay`)
- Если появился — показывается **минимум 1 секунду** (избегаем мерцания)

## Состояния

- `currentImageIndex: number` — индекс текущего фото
- `mainImageLoading: boolean` — состояние загрузки превью
- `mainImageLoadedRef: Set<number>` — кеш загруженных фото (по индексам)
- `preloadedImagesRef: Set<string>` — кеш предзагруженных URL

## Управление

- **Клик по тамбе** — переключает превью
- **ArrowLeft/ArrowRight** — переключает фото (когда фокус не в модалке)
- **Hover на тамбе** — предзагружает фото

## Оптимизация изображений

- Качество: 75%
- Максимальная ширина: 1200px
- URL: `getOptimizedImageUrl(imageUrl, 75, 1200)`
- Тамбы и превью используют **одинаковый URL**

## Чеклист тестирования

- ✅ Клик по тамбе — превью меняется мгновенно (из кеша)
- ✅ Переключение туда-обратно — без задержек
- ✅ В Network tab — каждое фото грузится только один раз
- ✅ Нет "подвисания" — лоудер появляется/исчезает без задержек
- ✅ Hover на тамбе — в Network видна предзагрузка
