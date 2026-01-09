# Модалка просмотра фото (Photo Viewer Modal)

Документ описывает **актуальную реализацию** модалки просмотра фото на странице объявления: как работает загрузка текущего фото, фоновая предзагрузка следующего, обработка ошибок и управление.

## Где реализовано

- **Страница объявления (клиентская часть)**: `core/frontend/app/listings/[id]/ListingPageClient.tsx`

## Цели UX

- **Первое отображаемое фото в модалке не должно "ждать" фоновые загрузки**.
- **Следующее фото должно подгружаться в фоне** так, чтобы переход "вперёд" был максимально быстрым.
- Лоудер в модалке показывается **только для текущего фото**, которое пользователь должен увидеть сейчас.
- На медленных сетях пользователь всегда получает предсказуемый фидбек (лоудер), но интерфейс не "зависает".

## Термины

- **Текущее фото**: фото по индексу `modalImageIndex`.
- **Следующее фото**: фото по индексу `(modalImageIndex + 1) % images.length`.
- **Фоновая предзагрузка (preload)**: загрузка "следующего фото" через `<link rel="preload" as="image">` без блокировки отображения текущего.

## Состояния и refs (актуальная реализация)

Модалка управляется следующими состояниями и refs:

### Состояния (state)

- `isImageModalOpen: boolean` - открыта/закрыта модалка
- `modalImageIndex: number` - индекс текущего отображаемого фото
- `modalImageLoading: boolean` - состояние загрузки текущего фото
- `imageErrors: Set<number>` - индексы фото с ошибками загрузки

### Refs для кеширования

- `modalImageLoadedRef: Set<number>` - кеш загруженных фото по индексам
- `preloadedImagesRef: Set<string>` - кеш предзагруженных URL (оптимизированные URL)
- `modalImageElementRef: RefObject<HTMLImageElement>` - ref для обычного `<img>` элемента
- `modalImageContainerRef: RefObject<HTMLDivElement>` - ref для контейнера изображения (для поиска img внутри Next.js Image)

### Refs для предзагрузки

- `modalPreloadQueueRef: Array<{ url: string; originalUrl: string; priority: number }>` - очередь предзагрузки
- `modalActivePreloadsRef: number` - количество активных preload операций
- `modalPreloadTimeoutsRef: Array<ReturnType<typeof setTimeout>>` - таймеры для cleanup
- `preloadLinksRef: Map<string, HTMLLinkElement>` - созданные `<link>` элементы для preload

### Константы

- `maxConcurrentPreloads = 2` - максимальное количество параллельных preload операций

## Основной сценарий (как работает сейчас)

### 1) Открытие модалки

При вызове `openImageModal(index)`:

1. Устанавливается `modalImageIndex = index`
2. Устанавливается `isImageModalOpen = true`
3. Запускается `useEffect` для определения `modalImageLoading`:
   - Если фото уже в кеше (`modalImageLoadedRef` или `preloadedImagesRef`) → `modalImageLoading = false`
   - Иначе → `modalImageLoading = true` и запускается quick-check через 100мс
4. Параллельно запускается `useEffect` для фоновой предзагрузки следующего фото `(index + 1) % images.length`

**Ключевое требование**: предзагрузка следующего фото **не блокирует** показ текущего.

### 2) Определение лоудера текущего фото

Логика в `useEffect` (строки ~1091-1142):

1. Если модалка закрыта или нет listing → `modalImageLoading = false`, очищается `modalImageLoadedRef`
2. Если текущее фото отсутствует/placeholder/в ошибках → `modalImageLoading = false`
3. Вычисляется `optimizedUrl = getOptimizedImageUrl(currentImage, 85, 1920)`
4. Проверяется кеш:
   - Если индекс в `modalImageLoadedRef` → `modalImageLoading = false`
   - Если URL в `preloadedImagesRef` → `modalImageLoading = false`
5. Иначе → `modalImageLoading = true`
6. Запускается quick-check через 100мс:
   - Проверяется `modalImageElementRef.current.complete || naturalWidth > 0`
   - Или ищется `img` в `modalImageContainerRef.current` и проверяется его готовность
   - Если готово → вызывается `handleModalImageLoad(modalImageIndex)`

### 3) Обработка загрузки изображения

`handleModalImageLoad(loadedIndex)` (строки ~1078-1089):

1. Если индекс уже в `modalImageLoadedRef` → ничего не делать
2. Добавить индекс в `modalImageLoadedRef`
3. Если `loadedIndex === modalImageIndex` (всё ещё актуален) → `setModalImageLoading(false)`

Вызывается:
- При `onLoad` событиях (с проверкой `img.complete || img.naturalWidth > 0`)
- При quick-check для кешированных изображений

### 4) Фоновая предзагрузка следующего фото

Логика в `useEffect` (строки ~939-1063):

1. Вычисляется `nextIndex = (modalImageIndex + 1) % images.length`
2. Если `images.length <= 1` → ничего не делать
3. Если `nextIndex` в ошибках или `placeholder` → ничего не делать
4. Вычисляется `nextOptimizedUrl = getOptimizedImageUrl(imageUrl, 85, 1920)`
5. Если URL уже в `preloadedImagesRef` → ничего не делать
6. Иначе:
   - Если `modalActivePreloadsRef < maxConcurrentPreloads` (2) → запускается `preloadModalImage(imageUrl)`
   - Иначе → добавляется в очередь `modalPreloadQueueRef`

#### Функция `preloadModalImage` (строки ~945-1012):

1. Создаётся `<link rel="preload" as="image" href="{optimizedUrl}">`
2. Добавляется `crossOrigin="anonymous"`
3. Добавляется в `document.head`
4. Увеличивается `modalActivePreloadsRef`
5. Сохраняется в `preloadLinksRef`
6. Устанавливается timeout на 2 секунды для cleanup
7. На `onload`: добавляется URL в `preloadedImagesRef`, cleanup, продолжается очередь
8. На `onerror`: cleanup, продолжается очередь

#### Обработка очереди `processModalPreloadQueue` (строки ~1014-1027):

- Пока `modalActivePreloadsRef < maxConcurrentPreloads` и очередь не пуста:
  - Берется элемент из очереди
  - Запускается `preloadModalImage`
  - При ошибке уменьшается счетчик и продолжается обработка

### 5) Очистка при переключениях

При каждом изменении `modalImageIndex`:

1. Очищаются все таймеры из `modalPreloadTimeoutsRef`
2. Очищается очередь `modalPreloadQueueRef`
3. Запускается предзагрузка нового следующего фото

При закрытии модалки:

1. Очищаются таймеры
2. Очищается очередь
3. `modalImageLoading = false`
4. Очищается `modalImageLoadedRef`

## Лоудер (useLoadingState)

Лоудер управляется через `useLoadingState`:

```typescript
const { visible: showModalImageLoader } = useLoadingState({
  isLoading: modalImageLoading,
  showDelay: 200,
  minDisplayTime: 1000,
});
```

- **showDelay: 200мс** - задержка перед показом лоудера
- **minDisplayTime: 1000мс** - минимальное время показа лоудера

### Лоудер показывается, когда:

- `showModalImageLoader = true` (после задержки 200мс)
- Модалка открыта
- Есть валидное текущее фото (не placeholder)
- Фото не в кеше (не в `modalImageLoadedRef` и не в `preloadedImagesRef`)

### Лоудер не показывается, когда:

- Модалка закрыта
- Текущее фото отсутствует / `placeholder`
- Для текущего индекса есть ошибка в `imageErrors`
- Фото уже загружено/предзагружено

## Обработка ошибок

При `onError` текущего изображения (строки ~2731-2737, ~2750-2756):

1. Индекс добавляется в `imageErrors`
2. Если индекс всё ещё актуален → `setModalImageLoading(false)`
3. UI показывает fallback (иконка битого изображения)

Ошибки фоновой предзагрузки не влияют на UX текущего фото.

## Управление и доступность

### Клавиатура (строки ~540-573)

- **Escape** → закрывает модалку (`setIsImageModalOpen(false)`)
- **ArrowLeft** → предыдущее фото (`(prev - 1 + imagesLength) % imagesLength`)
- **ArrowRight** → следующее фото (`(prev + 1) % imagesLength`)

### Мышь/тач

- **Клик по overlay** (затемнение) → закрывает модалку
- **Клик по контенту** → не закрывает (через `stopPropagation`)
- **Свайпы** → переключение фото (через `onTouchStart/Move/End`)

### Блокировка скролла

При открытии модалки:
- `document.body.style.overflow = 'hidden'`
- `document.body.style.position = 'fixed'`
- `document.body.style.width = '100%'`
- Предотвращается `touchmove` для предотвращения скролла

При закрытии все стили восстанавливаются.

## Quick-check для кешированных изображений

Для предотвращения "вечного лоудера" на кешированных изображениях:

1. После установки `modalImageLoading = true` запускается `setTimeout(checkImageLoaded, 100)`
2. `checkImageLoaded` проверяет:
   - `modalImageElementRef.current.complete || naturalWidth > 0` (для обычного `<img>`)
   - Или ищет `img` в `modalImageContainerRef.current` и проверяет его готовность (для Next.js Image)
3. Если изображение готово → вызывается `handleModalImageLoad(modalImageIndex)`

Также проверка выполняется в `onLoad` обработчиках:
- Для обычного `<img>`: `if (imgElement.complete || imgElement.naturalWidth > 0)`
- Для Next.js Image: `if (imgElement.complete || imgElement.naturalWidth > 0)`

## Оптимизация изображений

- **Для модалки**: `getOptimizedImageUrl(imageUrl, 85, 1920)` - качество 85%, ширина до 1920px
- **Для превью**: `getOptimizedImageUrl(imageUrl, 75, 1200)` - качество 75%, ширина до 1200px

## Инварианты (гарантии реализации)

- **Предзагрузка следующего фото никогда не блокирует** показ текущего
- **Одновременно показывается максимум один лоудер** в модалке — только для текущего фото
- Переходы по фото не приводят к бесконечному лоудеру (учитывается кеш и quick-check)
- Параллелизм preload ограничен (`maxConcurrentPreloads = 2`)
- Очередь предзагрузки очищается при каждом переключении фото

## Чеклист тестирования

- **Открытие модалки на фото N**:
  - ✅ Фото N показывается
  - ✅ Фото N+1 начинает грузиться фоном (видно в Network tab)
- **Переход на фото N+1**:
  - ✅ Лоудер либо отсутствует (если успело предзагрузиться), либо кратковременно
  - ✅ Фото N+2 начинает грузиться фоном
- **Быстрые клики "вперёд/назад"**:
  - ✅ UI остаётся отзывчивым
  - ✅ Активных preload не больше 2 (проверить в Network tab)
  - ✅ Очередь не раздувается
- **Ошибочное изображение**:
  - ✅ Лоудер исчезает
  - ✅ Показывается fallback (иконка битого изображения)
- **Хард ресет страницы**:
  - ✅ Нет "вечного" лоудера на уже кешированных изображениях (quick-check работает)
- **Клавиатура**:
  - ✅ Escape закрывает модалку
  - ✅ Стрелки переключают фото
- **Скролл**:
  - ✅ При открытии модалки скролл страницы блокируется
  - ✅ При закрытии скролл восстанавливается
