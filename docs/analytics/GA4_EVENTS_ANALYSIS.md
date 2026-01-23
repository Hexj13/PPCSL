# Google Analytics 4 - Текущее состояние системы

## Обзор

Документ описывает текущее состояние интеграции Google Analytics 4 в систему. Все события проверяют согласие пользователя перед отправкой через `checkConsent()`.

**Связанные документы:**
- **[SENTRY_SETUP.md](./SENTRY_SETUP.md)** - Настройка Sentry для отслеживания ошибок
- **[PLATFORM_CONFIGURATION.md](./PLATFORM_CONFIGURATION.md)** - Конфигурация аналитики и мониторинга для разных платформ

## Реализованные события

### Бизнес-события (E-commerce)

#### view_item
**Описание:** Просмотр детальной страницы объявления  
**Метод:** `analytics.viewItem(listingId, listing)`  
**Параметры:**
- `currency` - валюта из конфигурации
- `value` - цена объявления
- `items[]` - массив с информацией об объявлении

#### view_item_list
**Описание:** Просмотр списка объявлений  
**Метод:** `analytics.viewItemList(listings)`  
**Где используется:** `ListingGrid.tsx` - при загрузке результатов поиска и для `initialData` на главной странице  
**Параметры:**
- `currency` - валюта из конфигурации
- `items[]` - массив объявлений с id, title, price

#### add_to_wishlist / remove_from_wishlist
**Описание:** Добавление/удаление из избранного  
**Методы:** `analytics.addToWishlist()`, `analytics.removeFromWishlist()`

#### add_to_comparison / remove_from_comparison
**Описание:** Добавление/удаление к сравнению  
**Методы:** `analytics.addToComparison()`, `analytics.removeFromComparison()`

#### contact_seller
**Описание:** Контакт с продавцом  
**Метод:** `analytics.contactSeller(listingId, method, listing)`  
**Методы контакта:** `phone`, `viber`, `whatsapp`, `telegram`

#### create_listing
**Описание:** Создание объявления  
**Метод:** `analytics.createListing(listingId, listing)`

### Поиск и фильтрация

#### search
**Описание:** Выполнение поиска/фильтрации  
**Метод:** `analytics.search(query, filters)`

#### quick_filter_click
**Описание:** Клик по быстрому фильтру  
**Метод:** `analytics.quickFilterClick(filterType, value)`

#### save_filter
**Описание:** Сохранение фильтра поиска  
**Метод:** `analytics.saveFilter(filterName, filters)`

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
**Описание:** Просмотр главной страницы (конверсия)  
**Метод:** `analytics.conversionEventPageView()`

### Блок похожих объявлений

#### similar_block_impression
**Описание:** Показ блока похожих объявлений  
**Метод:** `analytics.similarBlockImpression(listingId)`

#### similar_card_click
**Описание:** Клик по карточке в блоке похожих  
**Метод:** `analytics.similarCardClick(listingId, clickedListingId, position)`

#### similar_scroll
**Описание:** Прокрутка блока похожих  
**Метод:** `analytics.similarScroll(listingId)`

#### similar_favorite_toggle
**Описание:** Переключение избранного в блоке похожих  
**Метод:** `analytics.similarFavoriteToggle(listingId, targetListingId, action)`

### Автоматические события GA4

#### page_view
**Описание:** Автоматически отслеживается через `gtag('config')` в `GoogleAnalytics.tsx`

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
- `complete_profile` - firstName, lastName, email
- `create_listing` / `edit_listing` - brand, model, year, price, city, description, images
- `register` - phone, password, type, messengers, companyName (для Business), email (для Business)
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

#### GoogleAnalytics.tsx
**Расположение:** `core/frontend/components/GoogleAnalytics.tsx`  
**Функция:** Инициализация GA4 и обработка согласия пользователя  
**Использует:** `process.env.NEXT_PUBLIC_GA_ID` (конфигурируется через переменные окружения)

#### analytics.ts
**Расположение:** `core/frontend/lib/analytics.ts`  
**Функция:** Централизованная утилита для отправки событий  
**Методы:** Все методы отслеживания событий

#### PageScrollTracker.tsx
**Расположение:** `core/frontend/components/PageScrollTracker.tsx`  
**Функция:** Отслеживание прокрутки страницы  
**Использует:** Хук `usePageScroll.ts`

#### ExternalLinkTracker.tsx
**Расположение:** `core/frontend/components/ExternalLinkTracker.tsx`  
**Функция:** Отслеживание кликов по внешним ссылкам

### Хуки

#### usePageScroll.ts
**Расположение:** `core/frontend/hooks/usePageScroll.ts`  
**Функция:** Отслеживание прокрутки с порогами 25%, 50%, 75%, 90%  
**Оптимизация:** Использует `requestAnimationFrame` для throttling

## Особенности реализации

### Проверка согласия
Все события проверяют согласие пользователя через `checkConsent()` перед отправкой. Согласие хранится в `localStorage` под ключом `cookie_consent`.

### Структура событий
- Используются стандартные имена событий GA4 где возможно
- Добавляются кастомные параметры для контекста
- Включаются `currency` и `value` для e-commerce событий
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
Форма `/complete-profile` запрашивает дополнительные данные после регистрации:
- **Имя** (firstName) - опционально
- **Фамилия** (lastName) - опционально
- **Email** (email) - опционально

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

1. `page_view` автоматически отслеживается через `gtag('config')` в `GoogleAnalytics.tsx`
2. Все события проверяют согласие пользователя перед отправкой
3. Структура событий соответствует стандартам GA4 E-commerce
4. Отслеживание ошибок (Exception events) вынесено в отдельный документ `SENTRY_SETUP.md`. Sentry предоставляет более детальную информацию об ошибках, чем GA4 exception events
5. Конфигурация GA4 и Sentry для разных платформ описана в `PLATFORM_CONFIGURATION.md`
