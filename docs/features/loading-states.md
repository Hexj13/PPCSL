---
title: Loading states
owner: platform
tags:
  - type/guide
  - domain/engineering
  - scope/core
  - status/active
---

# Loading states — requirements

## Overview

This document describes requirements for unifying and improving the loading state system in the application. Goal: smooth user experience without flicker, layout jumps, or conflicts between different loading indicators.

## Context and architecture principles

### Next.js App Router and sources of loading state

The project has several loading levels that can overlap:

- **Route-level loading**: segment `loading.tsx` and Suspense fallbacks
- **Page-level loading**: local `loading`/`isInitialLoading`/`showSkeleton` in pages and components
- **Component-level loading**: loaders on buttons, modals, "load more".
- **Network-level errors**: `toast.error` from Axios interceptor (`core/frontend/lib/api/api-client.ts`)

Document requirement: align behavior to consistent rules per level and avoid conflicts between levels (e.g. when route-level fallback causes layout flicker and page-level immediately rebuilds content).

### Main UX goals

- **No flicker**: indicator either does not show (too fast) or is clearly visible and readable.
- **No layout jumps/CLS**: skeletons and real content share the same geometry.
- **Никаких “лишних миллисекундных футеров”**: при загрузке должен быть стабильный layout, без промежуточного состояния “пустая страница + футер”.
- **No toasts and loaders at the same time** where it hurts UX: notification appears after the loader is gone.

## Simplicity (required)

The feature should be simple, quick to implement, and safe to change. Therefore:

- Do not introduce a heavy "global manager" layer in the first phase.
- Provide a minimal set of primitives (`useLoadingState`, `LoadingButton`, `SkeletonContainer`) and migrate key call sites.
- Any "global" layer (e.g. notification queue) is **optional follow-up** only if MVP does not suffice.

## MVP scope

### MVP-1 (required)

- `useLoadingState` (200ms delay, 1000ms min display) + a way to run an action **after hide**.
- `SkeletonContainer` with 1000ms min display and stable geometry (min-height/grid).
- `LoadingButton` for main submit buttons (login/register/reset-password/listing form/profile).
- Where toasts are used: show notification **after** the loader is hidden.

### MVP-2 (if issues remain)

- Targeted `loading.tsx`/Suspense fallbacks only where "footer flicker" is confirmed.
- Further unification of spinners/fallbacks and broader coverage.

## Current implementation issues

### 1. Flicker and layout jumps

**Problem:**

- Skeletons and loaders appear and disappear too quickly
- Footer flashes briefly before page reflows
- Content "jumps" when data loads
- Layout shift (CLS) from sudden size changes

**Examples:**

- `ListingGrid.tsx` — skeletons show as soon as `loading = true`, hide as soon as `loading = false`
- `my-listings/page.tsx` — same issue
- `ListingPageClient.tsx` — skeleton has 500ms delay but no minimum display time

### 2. Button loaders

**Problem:**

- Button loaders appear and disappear too quickly
- User cannot read the loading state
- No consistent pattern for button loaders

**Examples:**

- `ListingForm.tsx` — button text changes but no visual indicator
- `login/page.tsx` — text change only, no spinner
- `register/page.tsx`, `reset-password/page.tsx` — same

### 3. Toast vs loader conflict

**Problem:**

- Toasts show while loaders are still visible
- User sees both loader and notification
- Notifications appear before loading finishes

**Examples:**

- `ListingForm.tsx:419` — `toast.success()` runs right after `setLoading(false)` but loader may still be visible
- `my-listings/page.tsx` — toasts (including from useListingActions) show right after API call while loading may still be active
- Any place where `toast.success/error` is called in `finally` or right after `setLoading(false)`

### 4. Page reflow and footer

**Problem:**

- After load, footer flashes briefly on navigation
- Page reflows after load completes
- Layout shift between states

**Examples:**

- `ListingForm.tsx:420` — `router.push()` runs right after `toast.success()` but loader may still be active
- `verify-phone/page.tsx` — multiple redirects after load
- `login/page.tsx` — redirect after successful login

## Requirements

### 1. Generic loading state hook

**1.1** Implement `useLoadingState` with configurable params:

- `isLoading: boolean` — current loading state
- `showDelay?: number` — delay before showing (default 200ms)
- `minDisplayTime?: number` — minimum display time (default 1000ms)
- `immediate?: boolean` — show immediately (default false)

**Behavior:**

- If `isLoading = true` and `showDelay` ms passed → show loader
- If `isLoading = false` → hide loader no earlier than `minDisplayTime` ms after it was shown
- If loading ends before `showDelay` → do not show loader at all

**1.2 (required):** Robustness — handle rapid toggles; clear timers on unmount; no setState after unmount.

**1.3 (required):** Run side-effects (toast/redirect) only **after** the indicator is actually hidden (after `minDisplayTime`).

Preferred: `useLoadingState` returns `{ visible, afterHidden }` with `afterHidden(fn)` called after hide; or `{ visible, hiddenPromise }` and `await hiddenPromise` before toast/redirect.

**File:** `core/frontend/hooks/useLoadingState.ts`

### 2. LoadingButton component

**Requirement 2.1:** Create a unified button component with loading state support

**Params:**

- `loading?: boolean` — loading state
- `loadingText?: string` — kept for backward compatibility, not used (only spinner shown)
- `showSpinner?: boolean` — whether to show spinner (default true)
- `spinnerSize?: 'sm' | 'md' | 'lg'` — spinner size (default 'sm')
- All standard button props

**Behavior:**

- Использовать `useLoadingState` с параметрами: `showDelay: 200ms`, `minDisplayTime: 1000ms`
- При загрузке показывать только спиннер (текст скрывается)
- Когда загрузки нет — показывать только `children` (обычный текст кнопки)
- Кнопка должна быть disabled во время загрузки
- Спиннер должен быть виден минимум 1 секунду

**Требование 2.2 (обязательное):** отсутствие layout shift внутри кнопки

- При включении loading ширина/высота кнопки не должна “дёргаться”.
- Внутренний контент должен быть организован так, чтобы спиннер и текст не меняли геометрию (например, `inline-flex`, фиксированная высота, стабильный gap).

**File:** `core/frontend/ui/LoadingButton.tsx`

### 3. SkeletonContainer component

**Requirement 3.1:** Create a wrapper for skeletons with minimum display time

**Params:**

- `isLoading: boolean` — loading state
- `children: ReactNode` — skeleton content to show
- `minDisplayTime?: number` — minimum display time (default 1000ms)

**Behavior:**

- Use `useLoadingState` with `immediate: true`, `showDelay: 0`, `minDisplayTime: 1000ms`
- Show skeletons as soon as `isLoading = true`
- Ensure minimum display time of 1 second
- Avoid flicker on fast load

**Requirement 3.2 (required):** Skeleton preserves page geometry

- Skeletons must match the structure and size of real content.
- Для страниц/блоков, где сейчас “мигает футер”, скелетон обязан занимать эквивалентную высоту контента (через корректную сетку и/или `min-height`).

**File:** `core/frontend/components/SkeletonContainer.tsx`

### 4. Spinner component unification

**Requirement 4.1:** Unify spinner components

**Actions:**

- Keep only `Spinner` from `ui/Spinner.tsx`
- Remove `LoadingSpinner` from `components/LoadingSpinner.tsx`
- Add `inline?: boolean` to `Spinner` for use inside buttons
- Update all imports

**File:** `core/frontend/ui/Spinner.tsx`

### 5. Coordinating toasts and loaders

**Requirement 5.1:** Toasts must show only after the loader is done

**Rules:**

- If a loader is active, delay the toast
- Show toast only after the loader is hidden (after `minDisplayTime`)
- For buttons: show toast after the button loader's `minDisplayTime`
- For pages: show toast after the page skeleton/loader's `minDisplayTime`

**Implementation:**

- Add hook `useDelayedToast` for delayed toasts, or use callback from `useLoadingState`

**File:** `core/frontend/hooks/useDelayedToast.ts` (optional)

**Requirement 5.2 (MVP, required):** Do not show interceptor toast where there is an explicit loader

The Axios interceptor in `core/frontend/lib/api/api-client.ts` can show `toast.error()` on its own, which can conflict with an active loader/skeleton.

MVP requirements:

- For requests started from UI with a loader/skeleton and custom feedback, **disable** interceptor `toast.error` via header `X-Skip-Error-Handling: true` (already used in code).
- Handle errors/success **locally** and show **after** the loader is hidden (via `afterHidden`/`hiddenPromise` from `useLoadingState`).
- This avoids toasts and loaders at the same time without a global queue.

**Optional after MVP:** If conflicts remain (e.g. global network errors during page load), consider a central notification layer/queue. Not part of MVP.

### 6. Preventing layout shift

**Requirement 6.1:** Minimize Cumulative Layout Shift (CLS)

**Rules:**

- Skeletons must match real content size
- Footer must not show before page content is loaded
- Use `min-height` for skeleton containers
- Avoid sudden size changes when switching from skeleton to content

**Implementation:**

- Ensure all skeletons match real content dimensions
- Add `min-height` where needed
- Use `SkeletonContainer` for all skeletons

**Requirement 6.2 (required):** Suspense/`loading.tsx` and stable layout

- Для страниц/сегментов, где подтвержден сценарий “пустой main + футер”, нужно внедрить route-level fallback (`loading.tsx`) или единый page-level skeleton, который сохраняет геометрию.
- Это **не обязательный** шаг для MVP: сначала закрываем проблему через корректные скелетоны/`min-height` в самих страницах. `loading.tsx` добавляем точечно только если артефакт сохраняется.

### 7. Навигация после загрузки

**Requirement 7.1:** Navigation must happen only after the loader is done

**Rules:**

- `router.push()` должен вызываться только после завершения `minDisplayTime` лоудера
- Toast уведомления должны показываться перед навигацией (если применимо)
- Навигация должна быть плавной, без скачков

**Implementation:**

- Использовать callback из `useLoadingState` для навигации
- Или использовать `useDelayedToast` с callback для навигации

**Требование 7.2 (обязательное):** определить политику “toast vs redirect”

Define and implement a single standard:

- **If redirecting right after action:** show notification on the target page (e.g. via query/sessionStorage) to avoid races and lost toasts.
- **If staying on the same page:** show notification after the relevant loader is hidden (after `minDisplayTime`).

## Where to apply

### Skeletons (SkeletonContainer)

1. **ListingGrid.tsx**
   - Replace `if (loading)` with `<SkeletonContainer isLoading={loading}>`
   - Line ~620

2. **my-listings/page.tsx**
   - Replace `if (loading || !hasLoadedRef.current)` with `<SkeletonContainer isLoading={loading || !hasLoadedRef.current}>`

3. **favorites/page.tsx**
   - Replace `if (isInitialLoading || loading)` with `<SkeletonContainer isLoading={isInitialLoading || loading}>`
   - Line ~208

4. **admin/page.tsx**
   - Replace `if (loading)` with `<SkeletonContainer isLoading={loading}>` in ListingsTab
   - Line ~361

5. **ListingPageClient.tsx**
   - Use `useLoadingState` for `showSkeleton`
   - Line ~84, ~1169
  - **Add loader for full-screen image in modal** ✅
    - Show loader when loading image in modal
    - Do not show loader if image is cached/preloaded
    - Use `useLoadingState` with `showDelay: 200ms`, `minDisplayTime: 1000ms`
    - Track load via `onLoad` for `img` and Next.js `Image`
    - On image change (`modalImageIndex`), show loader if image not loaded
  - **Add loader for main image preview when switching tabs** ✅
    - Show loader when loading new image on tab/thumbnail change
    - Do not show loader if image already loaded or cached
    - Use `useLoadingState` with `showDelay: 200ms`, `minDisplayTime: 1000ms`
    - Track load via `onLoad` for images

### Buttons (LoadingButton)

1. **ListingForm.tsx**
   - Replace кнопку submit на `<LoadingButton>`
   - Line ~1620

2. **login/page.tsx**
   - Replace кнопку submit на `<LoadingButton>`
   - Line ~349

3. **register/page.tsx**
   - Replace кнопку submit на `<LoadingButton>`
   - Line ~1140

4. **reset-password/page.tsx**
   - Replace все кнопки submit на `<LoadingButton>`
   - Строки ~714, ~496, ~410

5. **profile/page.tsx**
   - Replace кнопку сохранения на `<LoadingButton>`
   - Line ~584

6. **profile/verify-phone-change/page.tsx**
   - Replace кнопку submit на `<LoadingButton>`
   - Line ~309

7. **verify-phone/page.tsx**
   - Replace кнопку submit на `<LoadingButton>`
   - Line ~520

8. **SearchFilters.tsx**
   - ✅ Replace кнопку поиска на `<LoadingButton>` (done)
   - Button is in component `SearchFormActions.tsx`

### Spinners (Spinner with useLoadingState)

1. **profile/page.tsx**
   - Use `useLoadingState` for `loadingProfile`
   - Line ~218

2. **listings/[id]/edit/page.tsx**
   - Use `useLoadingState` for `loadingListing`
   - Line ~110

### Toast coordination

1. **ListingForm.tsx**
   - Defer `toast.success()` после завершения лоудера кнопки
   - Строки ~419, ~426, ~439, ~445

2. **my-listings/page.tsx**
   - Defer все `toast.success/error` после завершения лоудера (вызовы на странице и в `useListingActions`)

3. **Все места с toast уведомлениями после API вызовов**
   - Check coordination with loaders

## Examples (what to do and how)

### Example A: Скелетоны грида (список объявлений)

**Цель:** убрать мерцание скелетона и “мигание футера”, сохранить стабильную высоту.

**Было (типично):**

- Есть `loading` boolean
- При `loading=true` сразу рендерим скелетоны
- Как только данные пришли — скелетоны исчезают мгновенно

**Должно стать:**

- Заворачиваем скелетон в `SkeletonContainer` с `minDisplayTime=1000ms`
- Скелетон повторяет геометрию реального грида:
  - та же сетка (`grid-cols-*`, `gap-*`)
  - сопоставимая высота карточек
  - достаточное количество “плиток”, чтобы высота контента была близка к реальной
- После прихода данных:
  - скелетон не исчезает мгновенно, а держится минимум 1 секунду (если уже был показан)
  - затем плавно заменяется контентом (при необходимости — через лёгкий fade)

**Проверка:**

- При быстром ответе API скелетон либо вообще не показывается (если это page/action лоудер с delay), либо если показывается — заметен минимум 1 секунду (для скелетонов в MVP мы показываем сразу, но держим минимум).
- Футер не “подскакивает” вверх/вниз при загрузке.

### Example B: Скелетон страницы “Мои объявления”

**Цель:** не показывать “пустую страницу” и избежать скачка при первом заходе.

**Должно стать:**

- Использовать `SkeletonContainer` на условии “нет данных/первичная загрузка”.
- Скелетон должен включать элементы, которые создают высоту страницы:
  - хлебные крошки/заголовок
  - несколько skeleton-карточек управления
- Реальный контент после загрузки должен занимать близкую высоту (схожая сетка/отступы).

### Example C: Кнопка submit (login/register/reset-password/listing form)

**Цель:** лоудер на кнопке читаемый и без “дёргания” кнопки.

**Должно стать:**

- Replace ручную логику на `LoadingButton`:
  - `loading` задаётся тем же стейтом, что и сейчас (не меняем бизнес-логику)
- Внутри кнопки:
  - при загрузке появляется только спиннер (маленький, inline), текст скрывается
  - когда загрузки нет — показывается только текст (`children`)
  - кнопка disabled на время загрузки
- Кнопка не меняет ширину/высоту при переходе в loading:
  - "дёргание" считается багом
  - спиннер центрируется абсолютно, текст становится невидимым для сохранения размера

**Важное правило по времени:**

- Показ кнопочного лоудера: delay 200ms (чтобы не мелькал), min display 1000ms (чтобы можно было увидеть).

### Example D: Toast не должен появляться одновременно с лоудером кнопки

**Цель:** пользователь сначала видит завершение действия (уходит лоудер), потом toast.

**Должно стать:**

- Там, где после API вызывается `toast.success/error`, переносим показ уведомления на “после скрытия”:
  - выполняем `setLoading(false)`
  - ждём “barrier” скрытия (через `afterHidden`/`hiddenPromise`)
  - показываем toast

**Примечание:** если действие заканчивается редиректом на другую страницу — см. пример E.

### Example E: Redirect после успешного действия (например, создание объявления)

**Цель:** избежать гонок “toast + router.push + лоудер” и не потерять уведомление.

**Должно стать (MVP‑стандарт):**

- Если по завершении действия есть немедленный редирект:
  - не показываем toast перед редиректом
  - сохраняем “сообщение для toast” (тип + текст/translation key) в `sessionStorage`
  - делаем `router.push(...)`
  - на целевой странице: после готовности UI показываем toast и очищаем `sessionStorage`

**Почему так:** это проще и надёжнее, чем пытаться синхронизировать лоудер на старой странице с показом toast прямо перед уходом.

### Example F: Axios interceptor errors and local loader

**Goal:** No double toasts and no toast during loader.

**After (MVP):** For requests from UI with explicit loader/skeleton and custom error handling: add `X-Skip-Error-Handling: true` to the request; in catch show toast locally (and after loader is hidden if applicable).

### Пример G: “Load more” (дозагрузка следующей страницы)

**Цель:** не блокировать весь экран скелетоном и не создавать скачков.

**Должно стать:**

- Не использовать `SkeletonContainer` для `loadingMore`, если контент уже есть.
- Показывать небольшой inline спиннер/индикатор внизу списка.
- Не применять `minDisplayTime=1000ms` для `loadingMore`, если это ухудшает ощущение скорости.

### Example H: Модалка со списком объявлений пользователя

**Цель:** не мерцать спиннером и не конфликтовать с toast’ом о timeout.

**Должно стать:**

- Использовать `useLoadingState` для показа спиннера в модалке:
  - delay 200ms, min display 1000ms
- Если срабатывает timeout и показывается toast:
  - сначала скрывается спиннер (или гарантируется завершение показа)
  - затем показывается toast

## Технические детали

### Значения по умолчанию

```typescript
const DEFAULT_SHOW_DELAY = 200; // мс
const DEFAULT_MIN_DISPLAY_TIME = 1000; // мс
```

### Конфигурация и единая точка правды

Чтобы не размазывать “200/1000” по коду:

- Вынести дефолты в один модуль (например, `core/frontend/lib/loading-config.ts`) и импортировать оттуда.
- Все компоненты (`LoadingButton`, `SkeletonContainer`, спиннеры) используют эти значения по умолчанию, с возможностью override.

### Best Practices (Google, Meta, GitHub)

- **Задержка показа:** 200-300мс (используем 200ms)
- **Минимальное время показа:** 1000ms
- **Скелетоны:** показывать сразу (immediate: true)
- **Лоудеры на кнопках:** задержка 200ms, минимум 1000ms

### Анимации

- Плавные переходы: 200-300мс для fade-in/out
- Использовать CSS transitions для плавности

## Реализация

### Этап 1: Создание базовых компонентов

- [x] Создать `useLoadingState` хук (`core/frontend/hooks/useLoadingState.ts`)
- [x] Обновить `Spinner` компонент (добавить `inline` параметр)
- [x] Создать `LoadingButton` компонент (`core/frontend/ui/LoadingButton.tsx`)
- [x] Создать `SkeletonContainer` компонент (`core/frontend/components/SkeletonContainer.tsx`)
- [x] Добавить экспорт `LoadingButton` в `ui/index.ts`

### Этап 2: Миграция скелетонов

- [x] Мигрировать `ListingGrid.tsx` на `SkeletonContainer`
- [x] Мигрировать `my-listings/page.tsx` на `SkeletonContainer`
- [x] Мигрировать `favorites/page.tsx` на `SkeletonContainer`
- [x] Мигрировать `admin/page.tsx` (ListingsTab) на `SkeletonContainer`
- [x] Мигрировать `ListingPageClient.tsx` на `useLoadingState` для `showSkeleton`
- [x] Добавить лоудер для полноэкранного просмотра фото в модалке (`ListingPageClient.tsx`)
- [x] Добавить лоудер для главного превью изображения при переключении табов (`ListingPageClient.tsx`)

### Этап 3: Миграция кнопок

- [x] Мигрировать `login/page.tsx` на `LoadingButton`
- [x] Мигрировать `register/page.tsx` на `LoadingButton`
- [x] Мигрировать `reset-password/page.tsx` на `LoadingButton`
- [x] Мигрировать `profile/page.tsx` на `LoadingButton`
- [x] Мигрировать `profile/verify-phone-change/page.tsx` на `LoadingButton`
- [x] Мигрировать `verify-phone/page.tsx` на `LoadingButton`
- [x] Мигрировать `ListingForm.tsx` на `LoadingButton` с координацией toast
- [x] Мигрировать кнопку поиска в `SearchFilters.tsx` на `LoadingButton`

### Этап 4: Координация уведомлений

- [x] Основная координация реализована через `useLoadingState` и `LoadingButton`

### Этап 5: Очистка

- [x] Удалить `LoadingSpinner` компонент (`core/frontend/components/LoadingSpinner.tsx`)
- [x] Найти и обновить все импорты `LoadingSpinner` (если есть)
- [x] Провести тестирование всех мигрированных компонентов (unit тесты пройдены)

## Критерии приемки

1. ✅ Нет мерцания скелетонов (минимум 1 секунда показа)
2. ✅ Нет мерцания лоудеров на кнопках (минимум 1 секунда показа)
3. ✅ Уведомления не показываются одновременно с лоудерами
4. ✅ Нет скачков футера при загрузке
5. ✅ Нет Layout Shift при переходе от скелетона к контенту
6. ✅ Плавные переходы между состояниями
7. ✅ Единообразное поведение во всем приложении

## Тестирование (обязательное для реализации)

### Unit/Component tests ✅ (P0/P1 только)

- `useLoadingState` ✅ (7 тестов):
  - ✅ Не показывает индикатор при завершении раньше `showDelay` (P1)
  - ✅ Показывает индикатор после `showDelay` (P0)
  - ✅ Держит индикатор минимум `minDisplayTime` (P0)
  - ✅ Скрывает индикатор сразу, если прошло больше `minDisplayTime` (P1)
  - ✅ Показывает индикатор сразу при `immediate=true` (P0)
  - ✅ Вызывает callback после скрытия индикатора (P0)
  - ✅ Корректно очищает таймеры при unmount (P1)

- `LoadingButton` ✅ (5 тестов):
  - ✅ Отображает children когда не загружается (P0)
  - ✅ Показывает только spinner при загрузке (без текста) (P0)
  - ✅ Не меняет размеры при включении/выключении loading (P1)
  - ✅ Блокирует повторные клики во время loading (P0)
  - ✅ Применяет disabled prop (P1)

- `SkeletonContainer` ✅ (3 теста):
  - ✅ Показывает children сразу при isLoading=true (P0)
  - ✅ Скрывает children после minDisplayTime (P0)
  - ✅ Не показывает children при isLoading=false с самого начала (P1)

### Integration/E2E (минимальный набор)

> **Примечание**: Integration/E2E тесты требуют ручного тестирования или настройки E2E фреймворка (Playwright/Cypress). Основные сценарии для проверки:

- ✅ Страница со скелетоном (например, грид) не показывает "мигание футера" - **проверено вручную**
- ✅ Быстрый ответ API не вызывает мерцания индикаторов - **проверено вручную**
- ✅ Toast появляется после завершения лоудера (кнопочного/страничного) в релевантных сценариях - **проверено вручную**

## Безопасность изменений (чтобы фича была “безопасной”)

- Изменения должны быть локализованы: добавляем новые примитивы и мигрируем места по одному, не ломая остальное.
- По возможности не меняем бизнес-логику запросов, меняем только отображение состояний.
- В местах, где отключаем интерцепторный `toast.error` (`X-Skip-Error-Handling: true`), обязательно добавляем локальную обработку ошибок.

## Дополнительные улучшения (опционально)

1. **Оптимистичные обновления** — показывать результат сразу, откатывать при ошибке
2. **Прогресс-индикаторы** — для длительных операций (> 2 сек)
3. **Адаптивность** — учитывать медленные сети, увеличивать минимальное время показа
4. **Аналитика** — отслеживать время загрузки для оптимизации

## Примечания

- Все значения времени должны быть настраиваемыми через параметры
- Необходимо учитывать производительность и не создавать лишних ре-рендеров
- Тестирование должно покрывать различные сценарии загрузки (быстрая, медленная, ошибка)
- Документация должна быть обновлена после реализации

## Non-goals (чтобы не расползлось)

- Не замедлять загрузку данных ради “красоты”: мы не задерживаем данные, мы управляем только видимостью индикаторов.
- Не вводить новые системы уведомлений: используем `react-hot-toast` как единый механизм, но централизуем вызовы.
