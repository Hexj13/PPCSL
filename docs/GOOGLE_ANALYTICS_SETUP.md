# Google Analytics Setup

## Обзор

Google Analytics интегрирован в приложение для отслеживания пользователей, поведения и конверсий.

## Реализация

### Компонент

Создан компонент `frontend/components/GoogleAnalytics.tsx`:
- Использует Next.js Script для оптимизированной загрузки
- Автоматически отслеживает изменения страниц (page views)
- Загружается после интерактивности страницы (strategy: "afterInteractive")
- Работает только если указан `NEXT_PUBLIC_GA_ID`

### Интеграция

Компонент добавлен в `frontend/app/layout.tsx`:
- Загружается на всех страницах
- Расположен в корневом layout для глобального покрытия

## Настройка

### Шаг 1: Создать Google Analytics аккаунт

1. Перейти на https://analytics.google.com/
2. Войти в аккаунт Google
3. Нажать "Start measuring" или "Create account"

### Шаг 2: Создать свойство

1. **Account Name**: `Kupito`
2. **Property Name**: `Kupito Website`
3. **Timezone**: `(GMT+01:00) Skopje` или `(GMT+02:00) Skopje` (в зависимости от летнего времени)
4. **Currency**: `MKD` (Македонски денар)

### Шаг 3: Создать Data Stream

1. Выбрать **Web**
2. **Website URL**: `https://kupito.mk` (или ваш домен)
3. **Stream Name**: `Kupito Website`
4. Нажать **Create stream**

### Шаг 4: Получить Measurement ID

После создания stream, скопировать **Measurement ID** (формат: `G-XXXXXXXXXX`)

### Шаг 5: Добавить в переменные окружения

Добавить в `frontend/.env.local`:

```env
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

**Важно:**
- Использовать `.env.local` для локальной разработки
- Для production добавить переменную в настройки деплоя (Vercel, etc.)
- Переменная должна начинаться с `NEXT_PUBLIC_` для доступности в браузере

### Шаг 6: Перезапустить сервер

```bash
cd frontend
npm run dev
```

### Шаг 7: Проверить работу

1. Открыть сайт в браузере
2. Перейти в Google Analytics → **Reports** → **Real-time**
3. Должны появиться активные пользователи

## Отслеживание событий (опционально)

Для отслеживания кастомных событий можно использовать:

```typescript
// В любом компоненте
if (typeof window !== 'undefined' && window.gtag) {
  window.gtag('event', 'event_name', {
    event_category: 'category',
    event_label: 'label',
    value: 1,
  });
}
```

### Примеры событий:

**Клик на объявление:**
```typescript
window.gtag('event', 'listing_click', {
  event_category: 'engagement',
  event_label: listingId,
});
```

**Создание объявления:**
```typescript
window.gtag('event', 'listing_created', {
  event_category: 'conversion',
  event_label: 'new_listing',
});
```

**Поиск:**
```typescript
window.gtag('event', 'search', {
  event_category: 'engagement',
  search_term: searchQuery,
});
```

## Проверка работы

### В браузере (DevTools):

1. Открыть **Network** tab
2. Найти запросы к `googletagmanager.com` и `google-analytics.com`
3. Должны быть успешные запросы (статус 200)

### В Google Analytics:

1. **Real-time** → Должны быть активные пользователи
2. **Reports** → **Engagement** → Должны быть page views
3. **Reports** → **Acquisition** → Должны быть источники трафика

## Безопасность и приватность

### GDPR Compliance

Для соответствия GDPR рекомендуется:

1. **Cookie Consent Banner**: Добавить уведомление о cookies
2. **Anonymize IP**: Включить анонимизацию IP (уже включено по умолчанию в GA4)
3. **Privacy Policy**: Указать использование Google Analytics в политике конфиденциальности

### Настройка анонимизации (опционально):

```typescript
gtag('config', 'G-XXXXXXXXXX', {
  anonymize_ip: true,
  allow_google_signals: false,
  allow_ad_personalization_signals: false,
});
```

## Troubleshooting

### Проблема: Google Analytics не работает

**Проверка:**
1. Убедиться, что `NEXT_PUBLIC_GA_ID` установлен в `.env.local`
2. Перезапустить dev server после изменения `.env.local`
3. Проверить консоль браузера на ошибки
4. Проверить Network tab на запросы к Google Analytics

**Решение:**
- Проверить формат Measurement ID (должен начинаться с `G-`)
- Убедиться, что переменная доступна в браузере (проверить через `console.log(process.env.NEXT_PUBLIC_GA_ID)`)
- Проверить, что компонент загружается (должен быть в layout.tsx)

### Проблема: События не отслеживаются

**Решение:**
- Убедиться, что `window.gtag` существует перед вызовом
- Проверить формат события
- Проверить Real-time reports в Google Analytics

### Проблема: Данные не появляются в отчетах

**Решение:**
- Real-time данные появляются сразу
- Стандартные отчеты обновляются с задержкой (24-48 часов)
- Убедиться, что выбран правильный временной диапазон

## Метрики для мониторинга

### Важные метрики:

1. **Users** - количество уникальных пользователей
2. **Sessions** - количество сессий
3. **Page Views** - просмотры страниц
4. **Bounce Rate** - процент отказов
5. **Average Session Duration** - средняя длительность сессии
6. **Conversion Rate** - процент конверсий (если настроены цели)

### Кастомные события (рекомендуется добавить):

- `listing_view` - просмотр объявления
- `listing_click` - клик на объявление
- `listing_created` - создание объявления
- `search_performed` - выполнение поиска
- `favorite_added` - добавление в избранное
- `contact_clicked` - клик на контакт

## Production Checklist

- [ ] Google Analytics аккаунт создан
- [ ] Measurement ID получен
- [ ] `NEXT_PUBLIC_GA_ID` добавлен в production environment variables
- [ ] Компонент работает (проверено в production)
- [ ] Real-time данные появляются
- [ ] Cookie consent banner добавлен (если требуется)
- [ ] Privacy policy обновлена (упоминание Google Analytics)

---

**Версия:** 1.0  
**Дата:** ${new Date().toLocaleDateString('ru-RU')}  
**Статус:** ✅ Реализовано

