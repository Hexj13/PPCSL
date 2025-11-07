# SEO TODO Checklist

Этот документ содержит полный список задач по SEO, которые нужно выполнить.

## ✅ Выполнено

- [x] Meta tags (title, description, keywords)
- [x] Open Graph tags
- [x] Twitter Cards
- [x] Canonical URLs
- [x] Robots.txt
- [x] Sitemap.xml
- [x] Structured data (Schema.org)
  - [x] Organization schema
  - [x] WebSite schema (NEW)
  - [x] Vehicle schema (ENHANCED - changed from Product)
  - [x] Product schema (kept for compatibility)
  - [x] BreadcrumbList schema
- [x] Dynamic meta tags for listings
- [x] Breadcrumb navigation (structured data)
- [x] Image optimization
- [x] Security headers
- [x] Language attributes (lang="mk")
- [x] Mobile-friendly viewport
- [x] PWA Manifest
- [x] Dynamic OG images
- [x] Basic alt text for images
- [x] Consistent site tagline
- [x] Icon configuration (structure ready)

## ⚠️ Требуется выполнить

### 🔴 Высокий приоритет

#### 1. Google Search Console
- [ ] Перейти на https://search.google.com/search-console
- [ ] Войти в Google аккаунт
- [ ] Добавить ресурс: URL prefix → `https://kupito.mk`
- [ ] Выбрать метод верификации: HTML tag
- [ ] Скопировать код верификации (значение `content` из meta тега)
- [ ] Добавить в `frontend/.env.local`: `NEXT_PUBLIC_GOOGLE_VERIFICATION=код`
- [ ] Перезапустить сервер
- [ ] Вернуться в Search Console и нажать "Проверить"
- [ ] После верификации: Sitemaps → Отправить `sitemap.xml`
- [ ] Мониторить индексацию и производительность

**Инструкции**: См. `docs/SEO_OPTIMIZATION.md` раздел "Google Search Console Setup"

#### 2. Google Analytics
- [ ] Перейти на https://analytics.google.com/
- [ ] Создать аккаунт: "Kupito"
- [ ] Создать ресурс: "Kupito Website"
- [ ] Настроить поток данных: Web → `https://kupito.mk`
- [ ] Скопировать Measurement ID (формат: `G-XXXXXXXXXX`)
- [ ] Добавить в `frontend/.env.local`: `NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX`
- [ ] Создать компонент `frontend/components/GoogleAnalytics.tsx`
- [ ] Добавить компонент в `frontend/app/layout.tsx`
- [ ] Перезапустить сервер
- [ ] Проверить работу: Analytics → Отчеты → В реальном времени

**Инструкции**: См. `docs/SEO_OPTIMIZATION.md` раздел "Google Analytics Setup" (там есть готовый код компонента)

#### 3. Favicon и иконки
- [ ] Создать favicon.ico (размеры: 16x16, 32x32, 48x48)
- [ ] Добавить в `/public/favicon.ico`
- [ ] Создать иконки для PWA (различные размеры: 192x192, 512x512)
- [ ] Обновить `app/manifest.ts` с путями к иконкам

#### 4. Open Graph изображение
- [ ] Создать изображение: `/public/og-image.jpg`
- [ ] Размер: 1200x630px
- [ ] Должно содержать: логотип сайта и слоган
- [ ] Использовать как fallback для динамических OG изображений

#### 5. Логотип организации
- [ ] Создать логотип: `/public/logo.png`
- [ ] Высокое качество, рекомендуется прозрачный фон
- [ ] Используется в Organization schema
- [ ] Обновить путь в `components/OrganizationSchema.tsx` если нужно

### 🟡 Средний приоритет

#### 6. Улучшение внутренних ссылок
- [ ] Создать компонент `components/SimilarListings.tsx`
  - Показывать похожие объявления на странице листинга
  - Фильтровать по марке/модели/городу
  - Добавить ссылку "Погледни сите" на фильтрованный поиск
- [ ] Сделать кликабельными характеристики на странице листинга:
  - Марка → `/listings?brand_id=...`
  - Модел → `/listings?model_id=...`
  - Град → `/listings?city=...`
- [ ] Улучшить Footer:
  - Добавить больше внутренних ссылок
  - Категории, популярные поиски
  - Структурированная навигация

**Примечание**: Структура кода готова, нужно только реализовать компоненты

#### 7. Улучшенные Alt-теги
- [ ] Добавить детали автомобиля в alt-теги изображений
- [ ] Формат: `{title} - {brand} {model} {year} - Слика {index}`
- [ ] Сделать alt-теги более описательными и ключевыми словами

#### 8. Мониторинг производительности
- [ ] Настроить мониторинг Core Web Vitals
- [ ] Интегрировать с Google Search Console
- [ ] Отслеживать метрики скорости страниц
- [ ] Оптимизировать на основе данных Core Web Vitals

### 🟢 Низкий приоритет (долгосрочно)

#### 9. Контент-стратегия
- [ ] Рассмотреть добавление блога
- [ ] Регулярные статьи об автомобилях, советы по покупке
- [ ] Помогает с SEO и вовлеченностью пользователей

#### 10. Обратные ссылки
- [ ] Построить качественные обратные ссылки с релевантных сайтов
- [ ] Партнерство с автомобильными сайтами
- [ ] Локальные бизнес-каталоги

#### 11. Локальный SEO (если применимо)
- [ ] Google Business Profile
- [ ] Локальные цитаты
- [ ] Контент, специфичный для локации

## 📋 Быстрая проверка перед деплоем

Перед деплоем в продакшен убедитесь:

- [ ] Все переменные окружения добавлены в продакшен среду
- [ ] `NEXT_PUBLIC_SITE_URL` указывает на правильный домен
- [ ] Sitemap доступен по адресу `/sitemap.xml`
- [ ] Robots.txt доступен по адресу `/robots.txt`
- [ ] Все мета-теги работают корректно
- [ ] Структурированные данные валидны (проверить через Google Rich Results Test)
- [ ] Изображения оптимизированы
- [ ] Мобильная версия работает корректно

## 🔗 Полезные ссылки

- [Google Search Console](https://search.google.com/search-console)
- [Google Analytics](https://analytics.google.com/)
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Schema.org Validator](https://validator.schema.org/)
- [Meta Tags Checker](https://metatags.io/)
- [PageSpeed Insights](https://pagespeed.web.dev/)

## 📝 Заметки

- Все задачи с высоким приоритетом должны быть выполнены перед запуском в продакшен
- Google Search Console и Google Analytics критически важны для мониторинга SEO
- Внутренние ссылки можно улучшать постепенно
- Регулярно проверяйте производительность и индексацию

