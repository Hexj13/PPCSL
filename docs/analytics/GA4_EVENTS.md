# Google Analytics 4 — события и архитектура

## Обзор

Документ описывает текущее состояние интеграции Google Analytics 4 в систему. События из `analytics.ts` проверяют согласие через `checkConsent()`; компоненты (`GoogleAnalytics`, `ConversionEventTrigger`) — через `useCookieConsent`; оба опираются на `localStorage['cookie_consent']`.

**Связанные документы:**
- **[SENTRY.md](../guides/SENTRY.md)** — настройка и мониторинг
- **[PLATFORM_GUIDE.md](../guides/PLATFORM_GUIDE.md#6-конфигурация-аналитики-и-мониторинга-ga-gtm-sentry)** — конфигурация GA, GTM, Sentry

## Реализованные события

### Бизнес-события (E-commerce)

#### view_item
**Описание:** Просмотр детальной страницы объявления  
**Метод:** `analytics.viewItem(listingId, listing)`  
**Где используется:** `useListingData.ts` (страница объявления)  
**Параметры:**
- `currency` — валюта из конфигурации
- `value` — цена объявления
- `items[]` — массив с `item_id`, `item_name`, `price`, `item_brand`, `item_category: 'Vehicle'`

#### view_item_list
**Описание:** Просмотр списка объявлений  
**Метод:** `analytics.viewItemList(items)`  
**Где используется:** `ListingGrid.tsx` — при загрузке результатов поиска и для `initialData` на главной странице  
**Параметры:**
- `item_list_id` — `'search_results'`
- `item_list_name` — `'Search Results'`
- `items[]` — массив с `item_id`, `item_name`, `price`, `item_category: 'Vehicle'`

#### add_to_wishlist / remove_from_wishlist
**Описание:** Добавление/удаление из избранного  
**Методы:** `analytics.addToWishlist(listingId, listing)`, `analytics.removeFromWishlist(listingId)`  
**Где используется:** `ListingCard.tsx`, `ListingPageClient.tsx` (страница объявления)

#### add_to_comparison / remove_from_comparison
**Описание:** Добавление/удаление к сравнению  
**Методы:** `analytics.addToComparison(listingId, listing)`, `analytics.removeFromComparison(listingId)`  
**Где используется:** `ListingPageClient.tsx` (страница объявления)

#### contact_seller
**Описание:** Контакт с продавцом  
**Метод:** `analytics.contactSeller(listingId, method, listing?)`  
**Где используется:** `ListingPageSeller.tsx`  
**Методы контакта:** `phone`, `viber`, `whatsapp`, `telegram`

#### create_listing
**Описание:** Создание объявления  
**Метод:** `analytics.createListing(listingId, listing)`  
**Где используется:** `ListingForm.tsx` (при успешной публикации)

### Поиск и фильтрация

#### search
**Описание:** Выполнение поиска/фильтрации  
**Метод:** `analytics.search(searchTerm?, filters?)`  
**Где используется:** `SearchFilters.tsx`  
**Параметры:** `search_term`, плюс поля фильтров из `filters` (brand, model, city и т.д.)

#### quick_filter_click
**Описание:** Клик по быстрому фильтру (популярные бренды/модели)  
**Метод:** `analytics.quickFilter(brand, model?)`  
**Где используется:** `SearchFilters.tsx`  
**Параметры:**
- `filter_type` — `'brand'` или `'brand_model'`
- `brand` — название бренда
- `model` — название модели (опционально)

#### save_filter
**Описание:** Сохранение фильтра поиска  
**Метод:** `analytics.saveFilter(filterName, filters?)`  
**Где используется:** `SaveFilterModal.tsx`

#### select_content
**Описание:** Отслеживание выбора контента (фильтры, категории, тип транспорта)  
**Методы:** 
- `analytics.selectContent(contentType, contentId, category?)` - выбор из категорий и фильтров
- `analytics.selectVehicleType(vehicleType)` - переключение типа транспорта

**Где используется:**
- `SearchFilters.tsx` - переключение типа транспорта и выбор фильтров из категорий
- Отслеживается выбор брендов, моделей, городов из категорий "Популярные"/"Другие"
- Передается информация о категории при выборе из категории

**Типы контента:** `brand`, `model`, `city`, `body_type`, `transmission`, `vehicle_type`

### Аутентификация

#### login
**Описание:** Вход в систему  
**Метод:** `analytics.login(method)`  
**Методы:** `email`, `phone`

#### sign_up
**Описание:** Регистрация  
**Метод:** `analytics.signUp(method)`  
**Методы:** `email`, `phone`

### Конверсии

#### conversion_event_page_view
**Описание:** Просмотр главной страницы или страницы каталога (конверсия)  
**Реализация:** компонент `ConversionEvent` → `ConversionEventTrigger`; событие отправляется через `gtag('event', 'conversion_event_page_view')` при наличии согласия  
**Где используется:** `app/page.tsx` (главная), `app/listings/page.tsx` (каталог)  
**Примечание:** метод в `analytics.ts` отсутствует; `ConversionEventTrigger` вызывает `gtag` напрямую после проверки `useCookieConsent`

### Блок похожих объявлений

#### similar_block_impression
**Описание:** Показ блока похожих объявлений  
**Метод:** `analytics.similarBlockImpression(listingId, similarCount)`  
**Где используется:** `SimilarListings.tsx`  
**Параметры:**
- `listing_id` — ID объявления, на странице которого показан блок
- `similar_count` — количество карточек в блоке

#### similar_card_click
**Описание:** Клик по карточке в блоке похожих  
**Метод:** `analytics.similarCardClick(listingId, clickedListingId, position)`  
**Где используется:** `SimilarListings.tsx`

#### similar_scroll
**Описание:** Прокрутка блока похожих  
**Метод:** `analytics.similarScroll(listingId)`  
**Где используется:** `SimilarListings.tsx`

#### similar_favorite_toggle
**Описание:** Переключение избранного в блоке похожих  
**Метод:** `analytics.similarFavoriteToggle(listingId, targetListingId, action)`  
**Где используется:** `SimilarListings.tsx`  
**Параметры:** `action` — `'add'` | `'remove'`

### Автоматические события GA4

#### page_view
**Описание:** Отправляется при смене маршрута через `gtag('config', gaId, { page_path: pathname })` в `GoogleAnalytics.tsx`; срабатывает только при `consent === 'granted'` и в production

### Базовые события GA4

#### scroll
**Описание:** Отслеживание глубины прокрутки страницы  
**Метод:** `analytics.pageScroll(percent)`  
**Где используется:** 
- Хук `usePageScroll.ts` с порогами 25%, 50%, 75%, 90%
- Компонент `PageScrollTracker.tsx` интегрирован в `app/layout.tsx`
- Использует `requestAnimationFrame` для оптимизации

**Параметры:**
- `percent_scrolled` - процент прокрученной страницы

#### form_start
**Описание:** Начало заполнения формы  
**Метод:** `analytics.formStart(formName)`  
**Где используется:**
- `complete-profile/page.tsx` - при первом фокусе на любом поле
- `ListingForm.tsx` - при первом фокусе на поле года
- `register/page.tsx` - при первом фокусе на поле телефона
- `login/page.tsx` - при первом фокусе на поле логина

**Параметры:**
- `form_name` - название формы (`complete_profile`, `create_listing`, `edit_listing`, `register`, `login`)

#### form_submit
**Описание:** Отправка формы  
**Метод:** `analytics.formSubmit(formName, success, fields?)`  
**Где используется:** Все формы при отправке (успешно/с ошибкой)

**Параметры:**
- `form_name` - название формы
- `success` - успешность отправки (true/false)
- `filled_fields` - список заполненных полей (через запятую)
- `fields_count` - количество заполненных полей

**Формы:**
- `complete_profile` - для физ. лиц: firstName, lastName, email; для юр. лиц: companyWebsiteUrl, email, emailNotifications
- `create_listing` / `edit_listing` - brand, model, year, price, city, description, images
- `register` - phone, password, type, messengers, companyName (для Business)
- `login` - login, password

#### complete_profile_skip
**Описание:** Пропуск формы завершения профиля (кастомное событие)  
**Метод:** `analytics.completeProfileSkip(filledFields?)`  
**Где используется:** `complete-profile/page.tsx` - при пропуске формы

**Параметры:**
- `filled_fields` - список заполненных полей перед пропуском
- `fields_count` - количество заполненных полей
- `had_partial_data` - были ли частично заполненные данные

#### click
**Описание:** Отслеживание кликов по внешним ссылкам  
**Метод:** `analytics.click(url, linkText?)`  
**Где используется:** 
- Компонент `ExternalLinkTracker.tsx` интегрирован в `app/layout.tsx`
- Отслеживает клики по ссылкам с другим hostname

**Параметры:**
- `link_url` - URL ссылки
- `link_text` - текст ссылки (опционально)

## Не реализованные события

### file_download
**Описание:** Отслеживание скачивания файлов  
**Статус:** Не реализовано (ожидает появления функционала скачивания)

### share
**Описание:** Отслеживание шаринга контента  
**Статус:** Не реализовано (ожидает появления функционала шаринга)

## Структура системы

### Компоненты

#### GoogleAnalyticsConsent.tsx
**Расположение:** `core/frontend/components/analytics/GoogleAnalyticsConsent.tsx`  
**Функция:** Инициализация `dataLayer` и `gtag` до загрузки GA; задаёт consent по умолчанию `analytics_storage: 'denied'`, `ad_storage: 'denied'`  
**Загрузка:** `strategy="beforeInteractive"` — выполняется до интерактивности страницы  
**Важно:** должен быть подключён в `layout.tsx` **до** `GoogleAnalytics` для корректной работы согласия (GDPR)

#### GoogleAnalytics.tsx
**Расположение:** `core/frontend/components/analytics/GoogleAnalytics.tsx`  
**Функция:** Подключение gtag.js и отправка `page_view` при смене `pathname`; обновление `consent` через `gtag('consent', 'update')` при смене выбора пользователя  
**Условия:** загрузка только в production (не localhost/127.0.0.1/приватные сети); скрипт не подключается и `config` не вызывается, пока `useCookieConsent` не вернёт `granted`  
**Использует:** `process.env.NEXT_PUBLIC_GA_ID`, хук `useCookieConsent`

#### GoogleTagManager.tsx
**Расположение:** `core/frontend/components/analytics/GoogleTagManager.tsx`  
**Функция:** Загрузка GTM-контейнера в production; `GoogleTagManagerNoscript` — iframe для noscript  
**Конфигурация:** `GTM_ID` захардкожен в компоненте; для мультиплатформы рекомендуется вынести в `NEXT_PUBLIC_GTM_ID`

#### ConversionEvent.tsx / ConversionEventTrigger.tsx
**Расположение:** `core/frontend/components/analytics/ConversionEvent.tsx`, `ConversionEventTrigger.tsx`  
**Функция:** `ConversionEvent` — обёртка с событием `conversion_event_page_view`; `ConversionEventTrigger` — универсальный триггер конверсии: один раз вызывает `gtag('event', eventName)` при `consent === 'granted'` и готовности `gtag`  
**Использует:** `useCookieConsent`, ожидание появления `window.gtag`

#### analytics.ts
**Расположение:** `core/frontend/lib/analytics.ts`  
**Функция:** Централизованная утилита для отправки событий  
**Методы:** Все методы отслеживания событий

#### PageScrollTracker.tsx
**Расположение:** `core/frontend/components/PageScrollTracker.tsx`  
**Функция:** Отслеживание прокрутки страницы  
**Использует:** Хук `usePageScroll.ts`

#### ExternalLinkTracker.tsx
**Расположение:** `core/frontend/components/analytics/ExternalLinkTracker.tsx`  
**Функция:** Отслеживание кликов по внешним ссылкам

### Хуки

#### useCookieConsent.ts
**Расположение:** `core/frontend/hooks/useCookieConsent.ts`  
**Функция:** Чтение и обновление согласия из `localStorage` (`cookie_consent`); при `updateConsent` вызывает `gtag('consent', 'update')` и пушит `consent_update` в `dataLayer`  
**Возвращает:** `consent`, `isLoading`, `hasConsent`, `grantConsent`, `denyConsent`

#### usePageScroll.ts
**Расположение:** `core/frontend/hooks/usePageScroll.ts`  
**Функция:** Отслеживание прокрутки с порогами 25%, 50%, 75%, 90%  
**Оптимизация:** Использует `requestAnimationFrame` для throttling

## Особенности реализации

### Проверка согласия
- **analytics.ts:** перед каждым `trackEvent` вызывается `checkConsent()` — проверка `localStorage['cookie_consent']` → `parsed.analytics === 'granted'`.
- **GoogleAnalyticsConsent:** до загрузки GA задаёт `gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied' })`, чтобы до выбора пользователя ничего не отправлялось.
- **useCookieConsent:** при смене выбора обновляет `localStorage` и вызывает `gtag('consent', 'update', { analytics_storage, ad_storage })`; `CookieConsent` использует этот хук для UI.
- **Порядок в layout.tsx:** `GoogleTagManager` → `GoogleTagManagerNoscript` → `GoogleAnalyticsConsent` → `GoogleAnalytics` (Consent до GA обязательно).

### Структура событий
- Используются стандартные имена событий GA4 где возможно
- Добавляются кастомные параметры для контекста
- В e-commerce: `currency` и `value` — в `view_item`, `add_to_wishlist`, `contact_seller`, `create_listing`; `view_item_list` передаёт только `item_list_id`, `item_list_name`, `items[]`
- Используется структура `items[]` для товарных событий

### Производительность
- Прокрутка страницы использует `requestAnimationFrame` для оптимизации
- События не блокируют основной поток
- Используется throttling для событий прокрутки

### Отслеживание форм
- `form_start` отправляется только один раз при первом фокусе на поле (используется `useRef`)
- `form_submit` отправляется при успешной/неуспешной отправке с информацией о заполненных полях
- Для формы завершения профиля добавлено кастомное событие `complete_profile_skip`

## Специфика поиска и фильтров

### Структура категорий

#### Бренды
- Категория "Популярные" - популярные бренды
- Категория "Другие" - остальные бренды
- Каждый бренд имеет поле `category` с названием категории

#### Модели
- Группировка по брендам
- Каждый бренд является категорией для своих моделей
- Модели имеют поле `category` с названием бренда

#### Города
- Категория "Популярные" - популярные города
- Категория "Другие" - остальные города
- Каждый город имеет поле `category` с названием категории

### Отслеживание выбора
При выборе из категории отправляется событие `select_content` с параметром `item_category`, что позволяет анализировать использование категорий "Популярные" или "Другие".

### Типы транспорта
Отслеживается переключение типа транспорта (`car`, `truck`, `moto`) через событие `select_content` с `content_type: 'vehicle_type'`.

## Специфика формы завершения профиля

### Описание
Форма `/complete-profile` показывается после подтверждения телефона по SMS и запрашивает дополнительные данные (можно пропустить или заполнить позже в профиле).

**Для физических лиц (Individual):**
- Имя (firstName) — опционально
- Фамилия (lastName) — опционально
- Email (email) — опционально

**Для юридических лиц (Business):**
- Ссылка на сайт продавца (companyWebsiteUrl) — опционально
- Email (email) — опционально
- Чекбокс уведомлений по почте (emailNotifications)

### События
1. **form_start** - при первом фокусе на любом поле
2. **form_submit** - при сохранении данных (успешно/с ошибкой) с информацией о заполненных полях
3. **complete_profile_skip** - при пропуске формы с информацией о частично заполненных полях

### Метрики для анализа
- Конверсия формы: `form_submit` / `form_start`
- Процент пропусков: `complete_profile_skip` / `form_start`
- Популярность полей: какие поля заполняются чаще всего
- Поведение при пропуске: сколько пользователей заполняют частично перед пропуском

## Примечания

1. `page_view` отправляется при смене маршрута через `gtag('config')` в `GoogleAnalytics.tsx` (при согласии и в production)
2. Все события проверяют согласие пользователя перед отправкой
3. Структура событий соответствует стандартам GA4 E-commerce
4. Отслеживание ошибок (Exception events) вынесено в отдельный документ `SENTRY.md`. Sentry предоставляет более детальную информацию об ошибках, чем GA4 exception events
5. Конфигурация GA4, GTM и Sentry для платформ — в [PLATFORM_GUIDE.md](../guides/PLATFORM_GUIDE.md#6-конфигурация-аналитики-и-мониторинга-ga-gtm-sentry)
