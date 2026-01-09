# Модалка просмотра фото (Photo Viewer Modal)

Документ описывает **актуальную реализацию** модалки просмотра фото на странице объявления.

## Где реализовано

- **Страница объявления**: `core/frontend/app/listings/[id]/ListingPageClient.tsx`

## Принцип работы

### Простая логика

1. **Открытие модалки** → показываем текущее фото, фоном предзагружаем следующее
2. **Переход на следующее фото** → показываем его (если предзагружено — мгновенно), фоном предзагружаем следующее
3. **Лоудер** → показывается только пока фото грузится, без задержек

### Предзагрузка следующего фото

При открытии модалки и при каждом переходе на новое фото:

```typescript
const nextIndex = (modalImageIndex + 1) % images.length;
const optimizedUrl = getOptimizedImageUrl(nextImageUrl, 85, 1920);

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

Лоудер показывается напрямую: `showModalImageLoader = modalImageLoading`

**Без задержек** — показывается сразу, когда фото грузится, и скрывается сразу, когда загрузилось.

## Состояния

- `isImageModalOpen: boolean` — открыта/закрыта модалка
- `modalImageIndex: number` — индекс текущего фото
- `modalImageLoading: boolean` — состояние загрузки текущего фото
- `modalImageLoadedRef: Set<number>` — кеш загруженных фото (по индексам)
- `preloadedImagesRef: Set<string>` — кеш предзагруженных URL

## Управление

- **Escape** — закрывает модалку
- **ArrowLeft/ArrowRight** — переключает фото
- **Клик по overlay** — закрывает модалку
- **Свайпы** — переключает фото на мобильных

## Оптимизация изображений

- Качество: 85%
- Максимальная ширина: 1920px
- URL: `getOptimizedImageUrl(imageUrl, 85, 1920)`

## Чеклист тестирования

- ✅ Открытие модалки — фото показывается
- ✅ Переход на следующее — если предзагружено, переход мгновенный
- ✅ В Network tab видно предзагрузку следующего фото
- ✅ Нет "подвисания" — лоудер появляется/исчезает без задержек
